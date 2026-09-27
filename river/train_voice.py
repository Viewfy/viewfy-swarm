#!/usr/bin/env python3
"""Viewfy Swarm: Voice agent fine-tune on River (LoRA SFT + outcome-reward RL).

Your voice lives in River weights:
  (a) voice corpus (@viewfy_ai tweets + founder emails) -> SFT examples (context -> text)
  (b) create a LoRA training run on a small open model (Qwen/Qwen3.5-9B)
  (c) a handful of cross_entropy train steps, loss logged per step
  (d) sample drafts from the tuned weights (and from the base model, for comparison)
  (e) reward_from_outcome() + rl_step(): hourly outcomes (replies, likes, meetings) become the RL reward

Usage (from repo root):
  uv run --project river river/train_voice.py              # train + sample + write training.json
  uv run --project river river/train_voice.py --sample     # sample from the saved adapter only
  uv run --project river river/train_voice.py --drafts     # write web/public/data/drafts.json from the adapter
  uv run --project river river/train_voice.py --rl-demo    # one RL step with fake hourly outcomes
  river/.venv/bin/python river/train_voice.py --dry-run    # just build + print the SFT examples

Nothing is posted or sent anywhere. Reads RIVER_API_KEY from .env.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import statistics
import sys
import time
from contextlib import closing
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "web", "public", "data")
CORPUS = os.path.join(DATA, "voice-corpus.json")
TARGETS = os.path.join(DATA, "targets.json")
TRAINING_OUT = os.path.join(DATA, "training.json")
DRAFTS_OUT = os.path.join(DATA, "drafts.json")
ADAPTER_FILE = os.path.join(HERE, "adapter.json")
RUNS_DIR = os.path.join(HERE, "runs")

BASE_MODEL = os.environ.get("RIVER_MODEL", "Qwen/Qwen3.5-9B")
STOP = ["<|im_end|>", "<|endoftext|>", "\n###"]


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_env():
    env = os.path.join(ROOT, ".env")
    if os.path.exists(env):
        for line in open(env):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# ---------------------------------------------------------------------------
# (a) corpus -> SFT examples
# ---------------------------------------------------------------------------

TOPICS = [
    (r"\b(reddit|thread|approve|reply|replies|queue|comment)\b", "replying in threads where buyers ask for your product"),
    (r"\b(seo|pull request|pr|git|diff|merge|audit)\b", "SEO fixes that land as a pull request"),
    (r"\b(chatgpt|claude|crawl|crawler|ai engines|robots|anthropic|openai's)\b", "AI visibility: can ChatGPT read your site"),
    (r"\b(hackathon|yard|hackyard|shipped at|submissions|demo)\b", "hackathons and building with the community"),
    (r"\b(distribution)\b", "distribution for founders who ship"),
    (r"\b(customer|customers|interviews|sales|sold|selling|arr|trial)\b", "talking to customers and selling"),
    (r"\b(buffer|hootsuite|later|agency|comparison|compared|alternatives)\b", "how Viewfy compares to other growth tools"),
    (r"\b(shipped|cut|fixed|capped|dropped|moved|added|locked|redesigned)\b", "a build-in-public ship note"),
]


def topic_of(text: str) -> str:
    t = text.lower()
    for pat, label in TOPICS:
        if re.search(pat, t):
            return label
    return "founder life while building Viewfy"


def render_prompt(channel: str, voice: str, context: str) -> str:
    who = "founder of Viewfy (@viewfy_ai)" if voice == "founder" else "Viewfy, the company account"
    return (
        f"### Channel: {channel}\n"
        f"### Voice: {who}\n"
        f"### Context: {context}\n"
        f"### Draft:\n"
    )


def build_examples(corpus: dict) -> list[dict]:
    """Each example: {prompt, completion, kind}. Very short acks (< 4 words) are dropped."""
    raw_path = os.path.join(ROOT, "data", "raw", corpus["handle"].lstrip("@") + "-tweets.json")
    is_reply = {}
    if os.path.exists(raw_path):
        raw = json.load(open(raw_path))
        if isinstance(raw, list):
            is_reply = {str(x["id"]): bool(x.get("isReply")) for x in raw}
    out = []
    for t in corpus["tweets"]:
        text = t["text"].strip()
        if len(text.split()) < 4:
            continue
        if is_reply.get(t["id"]):
            channel, context = "x_reply", f"reply to a founder on X about {topic_of(text)}"
        else:
            channel, context = "x_post", f"post on X about {topic_of(text)}"
        out.append({"prompt": render_prompt(channel, "founder", context), "completion": text, "kind": channel})
    for g in corpus.get("gmailSamples", []):
        subj = g["subject"]
        body = g["text"]
        role = "a journalist" if re.search(r"piece|cover|story", body, re.I) else (
            "investors (monthly update)" if re.search(r"update", subj, re.I) else (
                "a partner" if re.search(r" x |partner|team", subj + body[:40], re.I) else "a customer"))
        out.append({
            "prompt": render_prompt("gmail", "founder", f"short email to {role}. Hook: {subj}"),
            "completion": f"Subject: {subj}\n\n{body}",
            "kind": "gmail",
        })
    return out


def token_nll(fb, batch: list[dict]) -> float | None:
    """Mean negative log-likelihood over completion tokens, from per-token logprobs when River returns them."""
    lps = getattr(fb, "logprobs", None)
    if not lps or len(lps) != len(batch):
        return None
    tot = n = 0.0
    for lp, d in zip(lps, batch):
        try:
            vals = list(lp)
        except TypeError:
            return None
        for v, w in zip(vals, d["weights"]):
            if w > 0:
                tot -= float(v)
                n += 1
    return tot / n if n else None


def make_sft_datum(tok, prompt: str, completion: str, eos_id: int) -> dict:
    # Same layout as River's SFT guide: loss only on the completion (+EOS), target offset by one.
    p = tok(prompt, add_special_tokens=False)["input_ids"]
    c = tok(completion, add_special_tokens=False)["input_ids"] + [eos_id]
    ids = p + c
    return {
        "input_ids": ids,
        "target_tokens": ids[1:] + [eos_id],
        "weights": [0.0] * (len(p) - 1) + [1.0] * (len(c) + 1),
    }


# ---------------------------------------------------------------------------
# voice score (cheap, honest heuristic): char-trigram cosine vs corpus + style checks
# ---------------------------------------------------------------------------

def _grams(text: str, n: int = 3) -> dict:
    t = re.sub(r"\s+", " ", text.lower())
    g: dict = {}
    for i in range(len(t) - n + 1):
        g[t[i:i + n]] = g.get(t[i:i + n], 0) + 1
    return g


def _cos(a: dict, b: dict) -> float:
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


BLAND = re.compile(r"hope this (email|message) finds you|excited to announce|leverag|synerg|game[- ]chang|revolutioni|cutting[- ]edge|delighted|#\w+|in today's fast", re.I)


def voice_score(samples: list[str], corpus_texts: list[str]) -> float:
    ref = _grams("\n".join(corpus_texts))
    scores = []
    for s in samples:
        if not s.strip():
            scores.append(0.0)
            continue
        sim = _cos(_grams(s), ref)                       # ~0.55-0.8 for on-voice text
        words = len(s.split())
        length_ok = 1.0 if words <= 60 else max(0.0, 1 - (words - 60) / 120)
        bland_pen = 0.25 if BLAND.search(s) else 0.0
        scores.append(max(0.0, min(1.0, 0.25 + sim * 0.9 * length_ok - bland_pen)))
    return round(statistics.mean(scores), 3) if scores else 0.0


# ---------------------------------------------------------------------------
# (e) RL: hourly outcomes -> reward -> policy-gradient step
# ---------------------------------------------------------------------------

# ============================== REWARD FROM OUTCOME ==============================
def reward_from_outcome(reply: bool, likes: int, meeting: bool) -> float:
    """The hourly loop's Measure step, turned into a scalar reward for River RL.

    reply   : the journalist / founder / publisher replied to the draft (strongest signal)
    likes   : likes on the X reply or post (log-scaled so one viral post can't dominate)
    meeting : the reply turned into a booked call (the actual business outcome)

    reward = 1.0 * reply + 0.15 * log1p(likes) + 2.0 * meeting, clipped to [0, 3]
    """
    r = (1.0 if reply else 0.0) + 0.15 * math.log1p(max(0, likes)) + (2.0 if meeting else 0.0)
    return max(0.0, min(3.0, r))
# ================================================================================


def fake_outcome(text: str, rng: random.Random) -> tuple[bool, int, bool]:
    """Stand-in for the real hourly Measure step (Gmail replies / X likes / calendar).
    Short, specific, question-ending drafts get replies more often; bland ones don't."""
    words = len(text.split())
    p_reply = 0.15 + (0.25 if words <= 60 else 0) + (0.15 if "?" in text else 0) + (0.1 if re.search(r"\d", text) else 0)
    p_reply -= 0.3 if BLAND.search(text) else 0
    reply = rng.random() < max(0.02, p_reply)
    likes = int(rng.expovariate(1 / (6 if words <= 40 else 2)))
    meeting = reply and rng.random() < 0.3
    return reply, likes, meeting


def rl_step(model, tok, prompts: list[str], outcomes=None, group_size: int = 4, lr: float = 2e-5,
            max_tokens: int = 96, seed: int = 0) -> dict:
    """One RL update from outcomes (GRPO-style group-relative advantages, importance_sampling loss).

    In production `outcomes(text) -> (reply, likes, meeting)` is the Measure step of the hourly loop
    (cron 0 * * * *): each draft that went out an hour ago gets its real outcome and becomes a rollout.
    Here it defaults to fake_outcome() so the demo can run it end-to-end.
    """
    rng = random.Random(seed)
    outcomes = outcomes or (lambda text: fake_outcome(text, rng))
    groups = model.sample(prompts, num_samples=group_size, max_tokens=max_tokens, temperature=1.0, stop=STOP)
    batch, rewards = [], []
    for prompt, group in zip(prompts, groups):
        p_ids = tok(prompt, add_special_tokens=False)["input_ids"]
        rs = [reward_from_outcome(*outcomes(s.text)) for s in group]
        rewards.extend(rs)
        mu = statistics.mean(rs)
        sd = statistics.pstdev(rs) or 1.0
        for s, r in zip(group, rs):
            if not s.tokens or len(s.tokens) != len(s.logprobs):
                continue
            adv = (r - mu) / sd / len(s.tokens)          # equal weight per response
            ids = p_ids + list(s.tokens)
            batch.append({
                "input_ids": ids,
                "old_logprobs": [0.0] * (len(p_ids) - 1) + list(s.logprobs) + [0.0],
                "advantages": [0.0] * (len(p_ids) - 1) + [adv] * len(s.tokens) + [0.0],
            })
    if not batch:
        return {"rewardMean": 0.0, "updated": False}
    fb = model.forward_backward(batch, loss_fn="importance_sampling")
    model.optim_step(lr=lr, grad_clip_norm=1.0)
    return {"rewardMean": round(statistics.mean(rewards), 3), "rewards": rewards, "rollouts": len(batch),
            "loss": fb.metrics.get("loss"), "updated": True}


# ---------------------------------------------------------------------------
# prompts for sampling drafts
# ---------------------------------------------------------------------------

DEMO_PROMPTS = [
    render_prompt("x_post", "founder", "post on X about a build-in-public ship note"),
    render_prompt("x_post", "founder", "post on X about distribution for founders who ship"),
    render_prompt("x_reply", "founder", "reply to a founder on X who asks how to get first users without ads"),
    render_prompt("gmail", "founder", "short email to a journalist who covers AI agents. Hook: solo founders are using agents for GTM"),
]


# Only true facts go in the prompt, so the tuned model has real material instead of inventing numbers.
FACTS = ("Facts you may use: Viewfy finds threads where buyers ask for your product and drafts replies in your voice, "
         "you approve every reply before it posts; SEO fixes land as a pull request on your repo; "
         "we scanned 383 Show HN launches and 27% were unreadable to AI engines; "
         "Viewfy tracks who ChatGPT names for your buying questions.")


def target_prompts(targets: dict) -> list[tuple[dict, str]]:
    sig = {s["id"]: s for s in targets.get("signals", [])}
    out = []
    for j in targets.get("journalists", []):
        hook = sig.get(j.get("signalId") or "", {}).get("title", "")
        ctx = f"short pitch email to {j['name']}, {j['outlet']} journalist covering {j['beat']}." + (f" Hook: their recent story \"{hook}\"." if hook else "") + " Pitch Viewfy, the growth agent that gets you users while you ship. " + FACTS + " No links. Under 90 words."
        out.append(({"targetId": j["id"], "channel": "gmail", "voice": "founder"}, render_prompt("gmail", "founder", ctx)))
    for p in targets.get("publishers", []):
        ctx = f"short email to {p['name']} ({p['kind']}, {p.get('audience', 'founders')}) proposing a feature or guest post about Viewfy. " + FACTS + " No links. Under 90 words."
        out.append(({"targetId": p["id"], "channel": "gmail", "voice": "company"}, render_prompt("gmail", "company", ctx)))
    for c in targets.get("community", []):
        ctx = f"reply to a founder on X who wrote: \"{c['text']}\". Be genuinely helpful, no pitch. Under 240 chars."
        out.append(({"targetId": c["id"], "channel": "x_reply", "voice": "founder"}, render_prompt("x_reply", "founder", ctx)))
    for i, topic in enumerate(["a build-in-public ship note", "distribution for founders who ship", "AI visibility: can ChatGPT read your site"], 1):
        out.append(({"targetId": f"self-{i}", "channel": "x_post", "voice": "company"}, render_prompt("x_post", "company", f"post on X about {topic}")))
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=20)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--rank", type=int, default=16)
    ap.add_argument("--sample", action="store_true", help="sample from the saved adapter, no training")
    ap.add_argument("--drafts", action="store_true", help="write drafts.json from the saved adapter")
    ap.add_argument("--rl-demo", action="store_true", help="after training, run one rl_step with fake outcomes")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    corpus = json.load(open(CORPUS))
    examples = build_examples(corpus)
    corpus_texts = [e["completion"] for e in examples]
    print(f"[voice] {len(examples)} SFT examples "
          f"({sum(e['kind'] == 'x_post' for e in examples)} posts, {sum(e['kind'] == 'x_reply' for e in examples)} replies, "
          f"{sum(e['kind'] == 'gmail' for e in examples)} emails) from {corpus['handle']}")
    if args.dry_run:
        for e in examples[:5]:
            print("-" * 60 + "\n" + e["prompt"] + e["completion"])
        return

    load_env()
    import river_client as river

    tok = river.load_tokenizer(base_model=BASE_MODEL)
    eos = tok.eos_token_id

    with closing(river.Client(api_key=os.environ["RIVER_API_KEY"])) as client:
        if args.sample or args.drafts:
            adapter = json.load(open(ADAPTER_FILE))
            with client.session(project="viewfy-voice") as session:
                if args.sample:
                    outs = session.sample(DEMO_PROMPTS, base_model=adapter["baseModel"], checkpoint=adapter["adapter"],
                                          max_tokens=160, temperature=0.7, stop=STOP)
                    for p, o in zip(DEMO_PROMPTS, outs):
                        print("=" * 70 + "\n" + p.split("### Context: ")[1].split("\n")[0] + "\n---\n" + o[0].text.strip())
                if args.drafts:
                    for d in write_drafts(session, adapter, corpus_texts):
                        print("=" * 70 + f"\n{d['targetId']} {d['channel']} {d.get('subject', '')}\n{d['text']}")
            return

        started = now()
        with client.session(project="viewfy-voice") as session:
            model = session.create_model(base_model=BASE_MODEL, lora=river.LoraConfig(rank=args.rank))
            print(f"[river] model_id={model.model_id} base={BASE_MODEL} lora_rank={args.rank}")

            data = [make_sft_datum(tok, e["prompt"], e["completion"], eos) for e in examples]
            rng = random.Random(42)
            order = list(range(len(data)))
            steps = []
            t0 = time.time()
            for step in range(1, args.steps + 1):
                if step == 1 or (step - 1) * args.batch % len(order) < args.batch:
                    rng.shuffle(order)
                start = ((step - 1) * args.batch) % len(order)
                idx = (order + order)[start:start + args.batch]
                batch = [data[i] for i in idx]
                ntok = sum(sum(d["weights"]) for d in batch)
                fb = model.forward_backward(batch, loss_fn="cross_entropy")
                model.optim_step(lr=args.lr, grad_clip_norm=1.0)
                loss_sum = float(fb.metrics["loss"])
                loss = loss_sum / ntok                     # River CE is summed over tokens -> per-token mean
                nll = token_nll(fb, batch)                 # cross-check from returned per-token logprobs, if any
                if step == 1:
                    print(f"[river] forward_backward metrics keys: {sorted(fb.metrics)}", flush=True)
                steps.append({"step": step, "loss": round(loss, 4), **({"nll": round(nll, 4)} if nll is not None else {})})
                print(f"step {step:2d}  loss/token={loss:.4f}  (sum={loss_sum:.1f}, tokens={int(ntok)})"
                      + (f"  nll/token={nll:.4f}" if nll is not None else "") + f"  {time.time() - t0:.0f}s", flush=True)

            ckpt = model.save_weights("viewfy-voice", mode="inference")
            adapter = {"baseModel": BASE_MODEL, "adapter": ckpt.path, "modelId": model.model_id,
                       "trainingRunId": getattr(model, "training_run_id", ""), "savedAt": now()}
            json.dump(adapter, open(ADAPTER_FILE, "w"), indent=2)
            print(f"[river] saved adapter {ckpt.path}")

            # (d) sample tuned vs base on held-in demo prompts
            tuned = model.sample(DEMO_PROMPTS, max_tokens=160, temperature=0.7, stop=STOP)
            tuned_txt = [g[0].text.strip() for g in tuned]
            try:
                base = client.sample(DEMO_PROMPTS, base_model=BASE_MODEL, max_tokens=160, temperature=0.7, stop=STOP)
                base_txt = [s.text.strip() for s in base]
            except Exception as e:  # base sampling is only for comparison
                print("[river] base sample failed:", e)
                base_txt = []
            for p, t in zip(DEMO_PROMPTS, tuned_txt):
                print("=" * 70 + "\n" + p.split("### Context: ")[1].split("\n")[0] + "\n--- tuned ---\n" + t)
            vm_tuned = voice_score(tuned_txt, corpus_texts)
            vm_base = voice_score(base_txt, corpus_texts) if base_txt else None
            print(f"[voice] voice score tuned={vm_tuned} base={vm_base}")

            rl = None
            if args.rl_demo:
                rl = rl_step(model, tok, DEMO_PROMPTS[:2], group_size=4)
                print(f"[rl] {rl}")

        os.makedirs(RUNS_DIR, exist_ok=True)
        run = {"startedAt": started, "finishedAt": now(), "adapter": adapter, "steps": steps,
               "tunedSamples": dict(zip(DEMO_PROMPTS, tuned_txt)), "baseSamples": dict(zip(DEMO_PROMPTS, base_txt)),
               "voiceScoreTuned": vm_tuned, "voiceScoreBase": vm_base, "rl": rl,
               "config": {"steps": args.steps, "batch": args.batch, "lr": args.lr, "rank": args.rank}}
        json.dump(run, open(os.path.join(RUNS_DIR, f"run-{started.replace(':', '')}.json"), "w"), indent=2, ensure_ascii=False)

        training = {
            "provider": "river", "real": True, "baseModel": BASE_MODEL, "adapter": ckpt.path,
            "examples": len(examples), "steps": steps, "voiceMatch": vm_tuned,
            "notes": (f"LoRA rank {args.rank}, {args.steps} steps x batch {args.batch}, lr {args.lr}, cross_entropy on "
                      f"completion tokens only. Loss is per-token (River returns a token sum). "
                      f"Heuristic voice score tuned {vm_tuned} vs base {vm_base}."
                      + (f" RL demo step: mean reward {rl['rewardMean']} over {rl['rollouts']} rollouts (fake outcomes)." if rl else "")),
            "startedAt": started, "finishedAt": now(),
        }
        json.dump(training, open(TRAINING_OUT, "w"), indent=2, ensure_ascii=False)
        print(f"[voice] wrote {TRAINING_OUT}")


FALLBACK_TARGETS = {  # used only when web/public/data/targets.json is missing (never written to disk)
    "signals": [{"id": "s1", "title": "Solo founders are using AI agents for go-to-market", "outlet": "TechCrunch", "url": ""}],
    "journalists": [
        {"id": "j1", "name": "Sarah Kim", "outlet": "TechCrunch", "beat": "AI agents and startups", "signalId": "s1"},
        {"id": "j2", "name": "Dan Ortiz", "outlet": "The Verge", "beat": "AI search"},
        {"id": "j3", "name": "Lena Park", "outlet": "Business Insider", "beat": "solo founders"},
        {"id": "j4", "name": "Omar Reyes", "outlet": "Wired", "beat": "AI crawlers and the open web"},
        {"id": "j5", "name": "Julia Hart", "outlet": "Forbes", "beat": "bootstrapped startups"},
        {"id": "j6", "name": "Ravi Shah", "outlet": "The Information", "beat": "AI startup revenue"},
    ],
    "publishers": [
        {"id": "p1", "name": "Lenny's Newsletter", "domain": "lennysnewsletter.com", "kind": "newsletter", "audience": "product and growth people"},
        {"id": "p2", "name": "Indie Hackers", "domain": "indiehackers.com", "kind": "community", "audience": "bootstrapped founders"},
        {"id": "p3", "name": "My First Million", "domain": "mfmpod.com", "kind": "podcast", "audience": "founders"},
        {"id": "p4", "name": "Product Hunt blog", "domain": "producthunt.com", "kind": "blog", "audience": "makers"},
    ],
    "community": [
        {"id": f"c{i}", "handle": "@fou***", "text": t, "topic": "gtm"} for i, t in enumerate([
            "launched 2 weeks ago, 0 users. how do you get the first 10 without ads?",
            "is SEO even worth it for a new SaaS in 2026?",
            "every time I post my product on reddit it gets removed. what am I doing wrong?",
            "I can build anything but distribution scares me",
            "how many customer interviews before you write the pricing page?",
            "do replies on X actually convert or is it a waste of time?",
            "cold email vs community, what worked for your first 100 users?",
            "shipped my 5th app this year, still no traction",
        ], 1)
    ],
}

URL = re.compile(r"https?://|www\.|\.ai/|\.com/")
PLACEHOLDER = re.compile(r"\[(name|your name|company|link)[^\]]*\]", re.I)


def pick_draft(meta: dict, cands: list[str], corpus_texts: list[str], first_name: str = "") -> tuple[str, str | None]:
    """Choose the best sampled candidate: on-length, no invented links/placeholders, highest voice score."""
    scored = []
    for raw in cands:
        text, subject = raw.strip(), None
        if meta["channel"] == "gmail":
            if not text.lower().startswith("subject:"):
                continue
            first, _, rest = text.partition("\n")
            subject, text = first.split(":", 1)[1].strip(), rest.strip()
            text = re.sub(r"\[name\]", first_name or "there", text, flags=re.I)
        bad = 0
        bad += 3 if URL.search(text) else 0
        bad += 3 if PLACEHOLDER.search(text) else 0
        if meta["channel"] == "x_reply" and len(text) > 240:
            bad += 5
        if meta["channel"] == "x_post" and len(text) > 280:
            bad += 5
        if meta["channel"] == "gmail" and len(text.split()) > 90:
            bad += 2
        if len(text.split()) < 6:
            bad += 4
        scored.append((bad, -voice_score([text], corpus_texts), text, subject))
    if not scored:
        return "", None
    scored.sort(key=lambda x: (x[0], x[1]))
    return scored[0][2], scored[0][3]


def write_drafts(session, adapter: dict, corpus_texts: list[str]):
    targets = json.load(open(TARGETS)) if os.path.exists(TARGETS) else FALLBACK_TARGETS
    names = {j["id"]: j["name"].split()[0] for j in targets.get("journalists", [])}
    items = target_prompts(targets)
    outs = session.sample([p for _, p in items], base_model=adapter["baseModel"], checkpoint=adapter["adapter"],
                          num_samples=4, max_tokens=200, temperature=0.8, stop=STOP)
    drafts = []
    for (meta, _), group in zip(items, outs):
        text, subject = pick_draft(meta, [s.text for s in group], corpus_texts, names.get(meta["targetId"], ""))
        d = dict(meta)
        if subject:
            d["subject"] = subject
        d.update({"text": text, "voiceMatch": voice_score([text], corpus_texts), "real": True})
        drafts.append(d)
    os.makedirs(RUNS_DIR, exist_ok=True)
    json.dump({"adapter": adapter, "drafts": drafts, "samples": {m["targetId"]: [s.text for s in g] for (m, _), g in zip(items, outs)}},
              open(os.path.join(RUNS_DIR, "drafts-raw.json"), "w"), indent=2, ensure_ascii=False)
    print(f"[voice] sampled {len(drafts)} drafts from {adapter['adapter']} -> river/runs/drafts-raw.json")
    return drafts


if __name__ == "__main__":
    main()
