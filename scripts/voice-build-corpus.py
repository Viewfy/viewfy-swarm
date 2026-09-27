#!/usr/bin/env python3
"""Build web/public/data/voice-corpus.json from the raw Apify dump (data/raw/<handle>-tweets.json).

- keeps only the account's own tweets (incl. replies it wrote), drops retweets
- dedupes, cleans text (html entities, t.co links, leading @mention chains, whitespace)
- sorts newest first
- adds synthetic gmailSamples in the same voice (Gmail is not connected for the demo)
"""
import html, json, os, re, sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANDLE = os.environ.get("X_HANDLE", "viewfy_ai")
RAW = os.path.join(ROOT, "data", "raw", f"{HANDLE}-tweets.json")
OUT = os.path.join(ROOT, "web", "public", "data", "voice-corpus.json")

TCO = re.compile(r"https?://t\.co/\S+")
LEAD_MENTIONS = re.compile(r"^(?:@\w+[\s,]*)+")


def clean(t: str) -> str:
    t = html.unescape(t or "")
    t = TCO.sub("", t)
    t = LEAD_MENTIONS.sub("", t.strip())
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = "\n".join(line.strip() for line in t.split("\n"))
    return t.strip()


def iso(s: str) -> str:
    return datetime.strptime(s, "%a %b %d %H:%M:%S %z %Y").astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


GMAIL_SAMPLES = [
    {
        "subject": "we scanned 383 Show HN launches. 27% are invisible to ChatGPT",
        "text": "Hi Sarah,\n\nsaw your piece on AI search eating Google clicks. one number you might want: we scanned 383 Show HN launches. 27% can't be read by AI engines at all. 23 block Anthropic's crawler, zero block OpenAI. nobody chose that, it's a Cloudflare default.\n\nhappy to share the raw list. I'm the founder of Viewfy, the growth agent that gets you users while you ship.\n\nMike",
    },
    {
        "subject": "$1k invoice in 8 hours at the OpenAI hackathon",
        "text": "Hi Dan,\n\nyou cover how solo founders actually get customers, so this might fit. at the OpenAI Astra hackathon I was the only demo that ended on Stripe. interviewed users, built it, pitched it, invoiced the first customer $1,000. 8 hours.\n\nthe product was secondary. the distribution was the demo.\n\n15 min this week?\n\nMike, founder @ Viewfy",
    },
    {
        "subject": "Viewfy, September update",
        "text": "Hi all,\n\nshort one.\n\n- sold into a $500M ARR company. one vertical converted to a paid trial, now I need to perform\n- 30+ customer interviews this month\n- cut X scout cost ~90%. we were re-searching the same posts every hour\n- 2nd place at Hackyard, shipped at OpenAI Astra\n\nask: intros to founders doing GTM at 2am. they are the buyer.\n\nthanks for being in this 💙\nMike",
    },
    {
        "subject": "your first SEO fix is a pull request",
        "text": "Hey Priya,\n\nthe first audit finished. 14 fixes, all in one PR on your repo. titles, meta, one robots rule that was hiding you from ChatGPT. app logic untouched.\n\nreview it like any other diff. merge or close, both are fine. a rejected fix won't come back next week.\n\nreply here if anything looks off.\n\nMike",
    },
    {
        "subject": "thanks for the 2 hours today",
        "text": "Hey Tom,\n\nthanks for having me at the office. two hours was more useful than a month of dashboards.\n\nwhat I heard: you don't need more posts, you need replies in threads your buyers already found. so that's what we'll turn on first. you approve every reply before it posts.\n\nfirst drafts in your queue tomorrow morning.\n\nMike",
    },
    {
        "subject": "Viewfy x Hackyard: distribution for every build",
        "text": "Hi team,\n\nevery Yard ends the same way. great builds, then silence. shipping is half the game, distribution is the other half.\n\nidea: every Hackyard builder gets a free Viewfy brief for their launch. rivals, what buyers search, threads to reply in. we eat the cost, you get builds that get users.\n\nworth a 15 min call?\n\nMike",
    },
]


def main():
    raw = json.load(open(RAW))
    if isinstance(raw, dict):
        sys.exit(f"raw file is not a list: {str(raw)[:200]}")
    seen, tweets = set(), []
    for x in raw:
        author = (x.get("author") or {}).get("userName", "").lower()
        if author != HANDLE.lower() or x.get("isRetweet") or x["id"] in seen:
            continue
        seen.add(x["id"])
        text = clean(x.get("fullText") or x.get("text") or "")
        if not text:
            continue
        tweets.append({
            "id": str(x["id"]),
            "text": text,
            "createdAt": iso(x["createdAt"]),
            "likes": int(x.get("likeCount") or 0),
            "replies": int(x.get("replyCount") or 0),
            "retweets": int(x.get("retweetCount") or 0),
            "views": int(x.get("viewCount") or 0),
            "url": x.get("url") or f"https://x.com/{HANDLE}/status/{x['id']}",
        })
    tweets.sort(key=lambda t: t["createdAt"], reverse=True)
    corpus = {
        "handle": "@" + HANDLE,
        "fetchedAt": datetime.fromtimestamp(os.path.getmtime(RAW), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "real": True,
        "tweets": tweets,
        "gmailSamples": GMAIL_SAMPLES,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(corpus, open(OUT, "w"), ensure_ascii=False, indent=2)
    print(f"wrote {OUT}: {len(tweets)} tweets, {len(GMAIL_SAMPLES)} gmail samples")


if __name__ == "__main__":
    main()
