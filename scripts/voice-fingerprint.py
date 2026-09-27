#!/usr/bin/env python3
"""Analyze web/public/data/voice-corpus.json -> web/public/data/fingerprint.json.

Stats (avgWords, emojiRate, phrase counts) are computed from the corpus.
Trait scores are heuristic features of the corpus, hand-calibrated after reading it.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "web", "public", "data", "voice-corpus.json")
OUT = os.path.join(ROOT, "web", "public", "data", "fingerprint.json")

EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿❤\U0001F000-\U0001F2FF]")

c = json.load(open(CORPUS))
tweets = [t["text"] for t in c["tweets"]]
words = [len(t.split()) for t in tweets]
n = len(tweets)
avg_words = round(sum(words) / n, 1)
emoji_rate = round(sum(1 for t in tweets if EMOJI.search(t)) / n, 2)
lower_start = sum(1 for t in tweets if t[:1].islower()) / n
numbers = sum(1 for t in tweets if re.search(r"\d", t)) / n
shipped = sum(1 for t in tweets if re.search(r"\b(shipped|cut|fixed|capped|dropped|moved|added|locked)\b", t, re.I)) / n
thanks = sum(1 for t in tweets if re.search(r"thank|congrats|well deserved|good job|respect|good luck|💙|❤️|💕", t, re.I)) / n
questions = sum(1 for t in tweets if "?" in t) / n
short = sum(1 for w in words if w <= 25) / n

traits = [
    {"name": "Direct", "value": 0.92},       # declarative, no hedging, "Now it's X", "made no sense"
    {"name": "Concise", "value": round(min(0.95, 0.5 + short * 0.45), 2)},
    {"name": "Technical", "value": round(min(0.9, 0.45 + shipped * 1.2 + numbers * 0.4), 2)},
    {"name": "Confident", "value": 0.81},
    {"name": "Warm", "value": round(min(0.9, 0.4 + thanks * 1.1), 2)},
    {"name": "Playful", "value": 0.46},      # dry humor: "Theater", "a pitch wearing a helpful hat"
]

phrases = [
    "Shipped … this week",
    "💙",
    "Now it's …",
    "You still approve before anything posts",
    "distribution's not scary",
    "build distribution, not 100 apps",
    "a pull request, not a locked report",
    "keep building",
]
counts = {p: sum(1 for t in tweets if p.strip("… ").split("…")[0].strip().lower() in t.lower()) for p in phrases}

examples = [
    "build distribution, not 100 apps",
    "viewfy's seo fixes land as a pull request, not a locked report. you merge it, app logic stays untouched. 💙",
    "the buyers are already typing the question. go find it.",
    "distribution's not scary, it's just a second product you haven't built yet",
]

fp = {"traits": traits, "signaturePhrases": phrases, "avgWords": avg_words, "emojiRate": emoji_rate, "examples": examples}
json.dump(fp, open(OUT, "w"), ensure_ascii=False, indent=2)
print(json.dumps({"n": n, "avgWords": avg_words, "emojiRate": emoji_rate, "lowerStart": round(lower_start, 2),
                  "numbers": round(numbers, 2), "shipVerbs": round(shipped, 2), "warmth": round(thanks, 2),
                  "questions": round(questions, 2), "short<=25w": round(short, 2), "phraseCounts": counts,
                  "traits": traits}, ensure_ascii=False, indent=1))
