#!/usr/bin/env bash
# Scout: fetch public X posts where founders ask for GTM help via Apify apidojo/tweet-scraper.
# Usage: scripts/apify-community.sh   (reads APIFY_TOKEN from .env) -> data/raw/community-x.json
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
OUT="data/raw/community-x.json"
curl -sS -X POST \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?maxItems=50&timeout=240" \
  -d '{"searchTerms":["\"first users\" founder how -filter:replies lang:en","\"marketing is hard\" technical founder lang:en","\"nobody saw my launch\" OR \"launched and nobody\" lang:en","\"how do I get customers\" startup lang:en","\"distribution is the hard part\" founder lang:en"],"maxItems":50,"sort":"Latest","tweetLanguage":"en"}' \
  -o "$OUT"
python3 -c "import json;d=json.load(open('$OUT'));print('items:',len(d) if isinstance(d,list) else d)"
