---
name: gtm-scout
version: 1.0.0
description: |
  Hourly Sense step of the Viewfy GTM loop. Finds fresh news hooks, journalists,
  publishers and X threads where founders ask for GTM help, dedupes them against
  the brain, and files new targets as pages. Read-only on the outside world.
triggers:
  - "scout targets"
  - "find news hooks"
  - "who should we pitch"
  - "find founders asking for help"
schedule: "0 * * * *"   # step 1 of the hourly loop, room #gtm-floor
tools:
  - search
  - get_page
  - put_page
  - add_link
mutating: true
writes_to:
  - outlets/
  - people/
  - publishers/
---

# GTM Scout

> **Convention:** brain-first. Check `gbrain search "<name or outlet>"` before creating any page.

## Contract

- Returns 8-12 **signals** (real articles, last 30 days), 10-16 **community** posts, and
  press/publisher targets matched to a signal. Output shape: `web/src/data/types.ts#Targets`.
- Never contacts anyone. Scout only reads (Apify actors) and writes to the brain.
- Masks X handles to the first 3 chars + `***`. Skips political, personal or offensive posts.
- Idempotent: a target seen before is linked, never duplicated.

## Phases

1. **Recall.** `gbrain search "what worked"` and read `playbooks/what-worked` to bias queries
   toward angles that landed (data angle, fresh funding signals).
2. **Fetch signals.** `scripts/apify-signals.sh` (apify/google-search-scraper, `site:` queries for
   TechCrunch, The Verge, VentureBeat, Sifted, Business Insider). Max ~50 results, keep 2026 only.
3. **Fetch community.** `scripts/apify-community.sh` (apidojo/tweet-scraper): "how do I get my
   first users", "marketing is the hard part", "launched and nobody cared". Max ~50 items.
4. **Build targets.** `python3 scripts/apify-build-targets.py` -> `web/public/data/targets.json`.
5. **Match.** For every signal, find the journalist whose beat fits (`gbrain search "<beat>"`);
   link `people/<slug>` -> `outlets/<outlet>` and note the hook on the person page.
6. **File.** New outlets/publishers become pages; append "Scouted <date>: <hook>" to existing ones.

## Output

- `targets.json` refreshed, plus one line per new target in the loop report:
  `Loop N · HH:00 - scout: 11 signals, 15 founder posts, 2 new journalists`.

## Anti-patterns

- Pitching a journalist on a signal older than 7 days.
- Storing raw handles or DMs in the brain.
