#!/usr/bin/env bash
# Scout: fetch recent (2026) news hooks for Viewfy's space via Apify apify/google-search-scraper.
# Usage: scripts/apify-signals.sh   (reads APIFY_TOKEN from .env) -> data/raw/signals-google.json
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
OUT="data/raw/signals-google.json"
QUERIES='AI agents startup marketing growth 2026 news
generative engine optimization AI search visibility 2026
founder-led GTM AI 2026
AI SDR outbound startup funding 2026
ChatGPT search brands visibility startups 2026'
BODY=$(python3 -c 'import json,sys;print(json.dumps({"queries":sys.argv[1],"maxPagesPerQuery":1,"resultsPerPage":10,"countryCode":"us","languageCode":"en","quickDateRange":"m6","mobileResults":False,"saveHtml":False}))' "$QUERIES")
curl -sS -X POST \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?timeout=180" \
  -d "$BODY" -o "$OUT"
python3 -c "import json;d=json.load(open('$OUT'));print('pages:',len(d) if isinstance(d,list) else d)"
