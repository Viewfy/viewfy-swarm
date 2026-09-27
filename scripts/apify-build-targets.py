#!/usr/bin/env python3
"""Build web/public/data/targets.json from the raw Apify outputs in data/raw/.

Inputs (produced by scripts/apify-signals.sh and scripts/apify-community.sh):
  data/raw/signals-news.json, data/raw/signals-google.json   apify/google-search-scraper
  data/raw/community-x.json, data/raw/community-x-2.json     apidojo/tweet-scraper

Signals and community posts are REAL (picked from the scraped results, text kept verbatim,
handles masked). Journalists are FICTIONAL personas at real outlets. Publishers are real.
Usage: python3 scripts/apify-build-targets.py
"""
import json
import os
import re
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "public", "data", "targets.json")


def load(name):
    try:
        with open(os.path.join(RAW, name)) as f:
            d = json.load(f)
        return d if isinstance(d, list) else []
    except Exception:
        return []


# --- signals: pick by URL substring, clean truncated Google titles -------------------------
SIGNAL_PICKS = [
    ("aeo-startup-profound", "TechCrunch",
     "AEO startup Profound hits unicorn valuation, raises $180M Series D 7 months after last round"),
    ("runable-hits-21m", "TechCrunch",
     "Runable hits $21M to bet AI agents can go from building businesses to growing them"),
    ("moengage-bets", "TechCrunch", "India's MoEngage bets marketing's future on millions of AI agents"),
    ("ai-seo-industry-google-search", "The Verge", "Can AI responses be influenced? The SEO industry is trying"),
    ("reddit-ai-search-seo", "The Verge", "Can Reddit fend off a new wave of AI SEO spam?"),
    ("daydream-raises-15-m", "Business Insider", "Daydream raises $15M to blend AI and human SEO expertise"),
    ("n8n-boss-1bn-users", "Sifted", "n8n boss: 'Our goal is to get to 1bn users with fewer than 1,000 employees'"),
    ("outcraft-ai", "Yahoo Finance", "AI SDR startup Outcraft AI rolls out per-lead pricing"),
    ("standout-startups-from-ycs-demo-day", "TechCrunch", "The 11 standout startups from YC's Demo Day, according to VCs"),
    ("four-mistakes-not-to-make", "Sifted", "Four mistakes not to make as a first-time founder"),
    ("cloudflare-matthew-prince", "The Verge", "Can Cloudflare CEO Matthew Prince save the web from AI?"),
]

organic = []
for page in load("signals-news.json") + load("signals-google.json"):
    organic.extend(page.get("organicResults") or [])

signals = []
sig_by_key = {}
for key, outlet, title in SIGNAL_PICKS:
    hit = next((r for r in organic if key in r.get("url", "")), None)
    if not hit:
        continue
    sig_by_key[key] = f"s{len(signals) + 1}"
    signals.append({
        "id": sig_by_key[key],
        "title": title,
        "outlet": outlet,
        "url": hit["url"],
        "date": (hit.get("date") or "")[:10] or None,
    })


def sid(key, fallback="s1"):
    return sig_by_key.get(key, fallback)


# --- community: pick real founder posts by (userName, text prefix) -------------------------
COMMUNITY_PICKS = [
    ("Sherifdeenolat2", "Founders,", "first users"),
    ("shahryarab64292", "Creating a product is hard", "launch day"),
    ("harryam_", "@KaiXCreator", "technical founder marketing"),
    ("coopernicus01", "Marketing has always", "technical founder marketing"),
    ("nour_alskore", "I feel many founders", "early adopters"),
    ("LolitoDev", "Every time I started", "first users"),
    ("DRudhamoy", "I originally started BuildTraction", "first users"),
    ("PaulFindable", "@thunkoid", "distribution"),
    ("theandreboso", "From all the declining", "distribution"),
    ("clemcardonnel", "@eliana_jordan", "technical founder marketing"),
    ("akivisualz", "@shredandship", "GTM at 3am"),
    ("NormanWangTech", "This is hard part", "founder doing everything"),
    ("terzi_federico", "Technical founder learning", "founder-led social"),
    ("lukmanAufbau", "Hot take", "visibility on X"),
    ("thepatwalls", "Had an idea in 2017", "nobody saw my launch"),
]

tweets = load("community-x.json") + load("community-x-2.json")


def mask(handle):
    return "@" + handle[:3] + "***"


def clean_text(text):
    # drop leading reply @mentions, mask any remaining @handles (privacy), unescape &amp;
    text = re.sub(r"^(@\w+\s+)+", "", text.replace("&amp;", "&"))
    return re.sub(r"@(\w+)", lambda m: mask(m.group(1)), text).strip()


community = []
seen = set()
for user, prefix, topic in COMMUNITY_PICKS:
    for t in tweets:
        author = (t.get("author") or {}).get("userName", "")
        text = t.get("fullText") or t.get("text") or ""
        if author == user and text.startswith(prefix) and t.get("id") not in seen:
            seen.add(t.get("id"))
            community.append({
                "id": f"c{len(community) + 1}",
                "handle": mask(author),
                "text": clean_text(text),
                # handle-free permalink so the masked handle is not leaked by the URL
                "url": f"https://x.com/i/status/{t.get('id')}",
                "likes": t.get("likeCount", 0),
                "topic": topic,
            })
            break

# --- journalists: FICTIONAL personas at REAL outlets ----------------------------------------
journalists = [
    {"id": "j1", "name": "Maya Chen", "outlet": "TechCrunch", "beat": "AI search, AEO/GEO and startup funding",
     "signalId": sid("aeo-startup-profound")},
    {"id": "j2", "name": "Daniel Okafor", "outlet": "TechCrunch", "beat": "AI agents for small businesses and growth",
     "signalId": sid("runable-hits-21m")},
    {"id": "j3", "name": "Priya Raman", "outlet": "The Verge", "beat": "AI search, SEO and the future of the open web",
     "signalId": sid("ai-seo-industry-google-search")},
    {"id": "j4", "name": "Lena Fischer", "outlet": "Sifted", "beat": "European AI startups and lean founder playbooks",
     "signalId": sid("n8n-boss-1bn-users")},
    {"id": "j5", "name": "Marcus Bell", "outlet": "Business Insider", "beat": "AI marketing startups and adtech funding",
     "signalId": sid("daydream-raises-15-m")},
    {"id": "j6", "name": "Sofia Alvarez", "outlet": "VentureBeat", "beat": "AI sales agents, AI SDRs and outbound automation",
     "signalId": sid("outcraft-ai")},
]

# --- publishers: REAL publications / communities with a founder audience --------------------
publishers = [
    {"id": "p1", "name": "Lenny's Newsletter", "domain": "lennysnewsletter.com", "kind": "newsletter",
     "audience": "Product and growth leaders, early-stage founders"},
    {"id": "p2", "name": "Indie Hackers", "domain": "indiehackers.com", "kind": "community",
     "audience": "Bootstrapped and solo founders sharing revenue and growth tactics"},
    {"id": "p3", "name": "First Round Review", "domain": "review.firstround.com", "kind": "blog",
     "audience": "Seed and Series A founders and operators"},
    {"id": "p4", "name": "My First Million", "domain": "mfmpod.com", "kind": "podcast",
     "audience": "Founders and builders hunting for growth ideas"},
    {"id": "p5", "name": "Product Hunt", "domain": "producthunt.com", "kind": "community",
     "audience": "Makers, early adopters and launch-day founders"},
]

real = len(signals) >= 6 and len(community) >= 8
targets = {
    "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "real": real,
    "signals": signals,
    "journalists": journalists,
    "publishers": publishers,
    "community": community,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump(targets, f, indent=2, ensure_ascii=False)
print(f"targets.json: real={real} signals={len(signals)} community={len(community)} "
      f"journalists={len(journalists)} publishers={len(publishers)}")
