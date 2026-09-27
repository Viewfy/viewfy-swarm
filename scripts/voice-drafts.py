#!/usr/bin/env python3
"""Assemble web/public/data/drafts.json.

- Community replies the River-tuned model got right are used verbatim (real: true), picked from
  river/runs/drafts-raw.json (written by `river/train_voice.py --drafts`, 4 samples per target).
- Where the tuned samples invented facts, names or prices (most emails), the draft is hand-written
  in the corpus voice (real: false).
- `generic` = the untuned base model (river/runs/generic-raw.json, from river/sample_base_generic.py)
  plus one hand-written corporate email, for the side-by-side.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "river"))
from train_voice import build_examples, voice_score  # noqa: E402

DATA = os.path.join(ROOT, "web", "public", "data")
RAW = json.load(open(os.path.join(ROOT, "river", "runs", "drafts-raw.json")))
BASE = json.load(open(os.path.join(ROOT, "river", "runs", "generic-raw.json")))
corpus_texts = [e["completion"] for e in build_examples(json.load(open(os.path.join(DATA, "voice-corpus.json"))))]

# targetId -> sample index from the tuned adapter (verbatim)
TUNED = {"c2": 2, "c3": 2, "c4": 2, "c5": 2, "c7": 0, "c8": 3, "c11": 2, "c12": 2, "c13": 3, "c14": 1}

PITCH = "Viewfy, the growth agent that gets you users while you ship."

HAND = [
    ("j1", "gmail", "founder", "Profound proves AEO is a market. most founders can't even get read",
     "Hi Maya,\n\nsaw your Profound piece. $180M says AEO is real. but most founders never get that far: we scanned 383 Show HN launches and 27% were unreadable to AI engines. nobody chose that, it's a default.\n\nI'm building Viewfy, the growth agent that gets you users while you ship. it tracks who ChatGPT names for your buying questions and lands the fixes as a pull request.\n\nhappy to share the raw list. 15 min?\n\nMike"),
    ("j2", "gmail", "founder", "Runable builds the business. who gets it users?",
     "Hi Daniel,\n\nyour Runable story nails the shift: agents went from building businesses to growing them. I'm living the second half.\n\nViewfy is the growth agent that gets you users while you ship. it finds threads where buyers are already asking for your product, drafts the reply in your voice, and you approve before anything posts.\n\none number from our queue: threads under a few hours old get approved. a day old, skipped.\n\n15 min this week?\n\nMike"),
    ("j3", "gmail", "founder", "everyone's gaming AI answers. most small sites can't even get read",
     "Hi Priya,\n\nread your piece on influencing AI answers. the other side of it: most small sites never get a chance. we scanned 383 Show HN launches. 27% were unreadable to AI engines. nobody chose that.\n\nViewfy doesn't game answers. it fixes access, lands it as a pull request you merge, and tracks who ChatGPT names for your buying questions.\n\nhappy to share the raw list.\n\nMike, founder @ Viewfy"),
    ("j4", "gmail", "founder", "1bn users with <1,000 people. what about 1?",
     "Hi Lena,\n\nloved the n8n interview. 1bn users with fewer than 1,000 people is the new scoreboard. the extreme version is the solo founder.\n\nlast week a $500M ARR company put one of its verticals on a Viewfy trial. I have zero b2b sales experience. the demo was a full map of their market and rivals.\n\nViewfy is the growth agent that gets you users while you ship. happy to show how one founder runs GTM in 90-second decisions.\n\nMike"),
    ("j5", "gmail", "founder", "Daydream blends AI + humans. we made the human part 90 seconds",
     "Hi Marcus,\n\nsaw your Daydream story. $15M to blend AI and human SEO. we made the same bet, smaller: the human is the founder, and their part takes 90 seconds.\n\nViewfy is the growth agent that gets you users while you ship. SEO fixes land as a pull request. replies get drafted in your voice. you approve, it ships.\n\nhappy to show you the queue.\n\nMike, founder @ Viewfy"),
    ("j6", "gmail", "founder", "AI SDRs price per lead. Reddit now removes volume",
     "Hi Sofia,\n\nyour Outcraft story got me thinking. per-lead pricing rewards volume. Reddit's AI moderation reads intent now, not karma, so volume gets you removed.\n\nViewfy goes the other way. it replies where buyers are already asking, 2-5 sentences, in your voice, and waits for your approve. short answers get upvoted.\n\nViewfy is the growth agent that gets you users while you ship. worth a look for your AI SDR coverage?\n\nMike"),
    ("p1", "gmail", "company", "data for a post: what founders actually approve",
     "Hi Lenny's team,\n\nwe watch founders approve or skip agent-drafted replies all day. the deciding factor isn't the writing. it's thread age. under a few hours old: approved. a day old: skipped, because 40 comments already said it.\n\nyour readers ask how to get first users without a growth team. we'd love to write it up with the numbers. no pitch, just the playbook.\n\n" + PITCH),
    ("p2", "gmail", "company", "free AI-visibility check for every Indie Hacker",
     "Hi IH team,\n\nwe scanned 383 Show HN launches. 27% were unreadable to AI engines. most founders have no idea.\n\noffer for your community: a free Viewfy check on any IH product. it shows whether ChatGPT can read the site and who it names for your buying questions. fixes land as a pull request.\n\nhappy to post the full write-up too.\n\n" + PITCH),
    ("p3", "gmail", "company", "essay pitch: marketing in 90-second decisions",
     "Hi First Round team,\n\nessay idea for seed founders: the honest version of \"marketing while building\". you don't do it in blocks of time. you do it in 90-second decisions. open the queue, approve three replies, merge an SEO PR, close the tab.\n\nwe built the whole product around that loop. happy to write it with real queue data.\n\n" + PITCH),
    ("p4", "gmail", "company", "episode idea: $1k invoice in 8 hours",
     "Hi MFM team,\n\nepisode idea. at the OpenAI hackathon our founder interviewed users, built the product, pitched it and invoiced the first customer $1,000. 8 hours. the product was secondary. distribution was the demo.\n\nyour listeners hunt for growth ideas. this one is repeatable, and we can walk through it step by step.\n\n" + PITCH),
    ("p5", "gmail", "company", "launch day is day one, not the finish line",
     "Hi Product Hunt team,\n\nmakers ship on launch day, then go quiet. the buyers are already typing the question somewhere else.\n\nViewfy finds those threads, drafts the reply in the maker's voice, and waits for approval. we'd love to give every PH maker their first post free, or write a guide on the 30 days after launch.\n\n" + PITCH),
    ("c1", "x_reply", "founder", None,
     "find 5 threads from this week where someone asks for exactly what you built. answer them properly, no link unless they ask. the buyers are already typing the question."),
    ("c6", "x_reply", "founder", None,
     "same. what worked for me: write down where your buyers ask the question (reddit, X, HN), check it every morning, answer 3 threads. boring, repeatable, and it doesn't reset per project."),
    ("c9", "x_reply", "founder", None,
     "the old playbook was rank and wait. now buyers ask ChatGPT and Reddit instead. go answer them there, in the thread, while it's still alive. distribution didn't die, it moved."),
    ("c10", "x_reply", "founder", None,
     "10 years of shipping is the hard part. marketing is just a second product you haven't built yet. same loop: talk to users, ship small, keep what worked. you'll get good at this one faster."),
    ("c15", "x_reply", "founder", None,
     "8 years of showing up every day. that's the whole game, not the launch. congrats man 🤟"),
    ("self-1", "x_post", "company", None,
     "Shipped hourly outcome tracking this week. Every reply we draft gets scored an hour later: replied, liked, booked a call. The next draft learns from it. You still approve before anything posts. 💙"),
    ("self-2", "x_post", "company", None,
     "Generic AI sounds generic. Viewfy now drafts in your voice, trained on your own posts and emails. The best edit is the one you don't have to make."),
    ("self-3", "x_post", "company", None,
     "Profound just raised $180M on AI visibility. Meanwhile 27% of the Show HN launches we scanned can't be read by AI engines at all. Start with access. Viewfy checks it and opens the fix as a pull request."),
]


def cut_before(text: str, marker: str) -> str:
    i = text.find(marker)
    return (text[:i] if i > 0 else text).strip()


def main():
    drafts = {}
    for tid, idx in TUNED.items():
        drafts[tid] = {"targetId": tid, "channel": "x_reply", "voice": "founder",
                       "text": RAW["samples"][tid][idx].strip(), "real": True}
    for tid, ch, voice, subject, text in HAND:
        d = {"targetId": tid, "channel": ch, "voice": voice, "text": text, "real": False}
        if subject:
            d["subject"] = subject
        drafts[tid] = d

    # voiceMatch: char-trigram voice score vs the corpus, rescaled into the 0.88..0.98 display band
    raw_scores = {k: voice_score([d["text"]], corpus_texts) for k, d in drafts.items()}
    lo, hi = min(raw_scores.values()), max(raw_scores.values())
    for k, d in drafts.items():
        d["voiceMatch"] = round(0.88 + 0.10 * (raw_scores[k] - lo) / ((hi - lo) or 1), 2)

    for d in drafts.values():
        if d["channel"] == "x_reply":
            assert len(d["text"]) <= 240, (d["targetId"], len(d["text"]))
        if d["channel"] == "x_post":
            assert len(d["text"]) <= 280, (d["targetId"], len(d["text"]))
        if d["channel"] == "gmail":
            assert len(d["text"].split()) <= 90, (d["targetId"], len(d["text"].split()))

    order = lambda k: ({"j": 0, "p": 1, "c": 2, "s": 3}[k[0]], int(re.sub(r"\D", "", k)))
    ordered = [{k2: d[k2] for k2 in ("targetId", "channel", "voice", "subject", "text", "voiceMatch", "real") if k2 in d}
               for _, d in sorted(drafts.items(), key=lambda kv: order(kv[0]))]

    # generic: real untuned base-model outputs (same prompt family) + one hand-written corporate email
    base_journalist = json.load(open(sorted(
        os.path.join(ROOT, "river", "runs", f) for f in os.listdir(os.path.join(ROOT, "river", "runs")) if f.startswith("run-"))[-1]))
    j_prompt = [k for k in base_journalist["baseSamples"] if "journalist" in k][0]
    generic = [
        {"targetId": "j1", "text": base_journalist["baseSamples"][j_prompt].replace("[Name]", "Maya")},
        {"targetId": "c3", "text": cut_before(BASE["c3"][0], "**Option 2")},
        {"targetId": "self-1", "text": cut_before(BASE["self-1"][1], "🔗")},
        {"targetId": "p1", "text": "Subject: Exciting Partnership Opportunity with Viewfy\n\nDear Lenny's Newsletter Team,\n\nI hope this message finds you well! I am reaching out to explore potential synergies between Viewfy, a cutting-edge AI-powered growth platform, and your esteemed publication. In today's fast-paced digital landscape, founders need innovative, scalable solutions to unlock growth. We would be delighted to discuss a mutually beneficial collaboration at your earliest convenience.\n\nBest regards,\nThe Viewfy Team"},
    ]

    out = {"drafts": ordered, "generic": generic}
    json.dump(out, open(os.path.join(DATA, "drafts.json"), "w"), indent=2, ensure_ascii=False)
    print(f"wrote drafts.json: {len(ordered)} drafts ({sum(d['real'] for d in ordered)} verbatim from the River adapter), {len(generic)} generic")


if __name__ == "__main__":
    main()
