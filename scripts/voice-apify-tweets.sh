#!/usr/bin/env bash
# Scrape recent tweets (incl. replies) from $X_HANDLE via Apify apidojo/tweet-scraper.
# Usage: scripts/voice-apify-tweets.sh   (reads APIFY_TOKEN + X_HANDLE from .env)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
HANDLE="${X_HANDLE:-viewfy_ai}"
OUT="data/raw/${HANDLE}-tweets.json"
curl -sS -X POST \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?maxItems=150&timeout=240" \
  -d "{\"searchTerms\":[\"from:${HANDLE}\"],\"twitterHandles\":[\"${HANDLE}\"],\"maxItems\":150,\"sort\":\"Latest\"}" \
  -o "$OUT"
python3 -c "import json;d=json.load(open('$OUT'));print('items:',len(d) if isinstance(d,list) else d)"
