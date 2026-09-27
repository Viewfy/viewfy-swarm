"""Sample the UNTUNED base model on the same draft prompts -> river/runs/generic-raw.json (the 'generic AI' side)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train_voice as tv
import river_client as river

tv.load_env()
targets = json.load(open(tv.TARGETS))
want = set(sys.argv[1:] or ["j1", "p1", "c1", "self-1"])
items = [(m, p) for m, p in tv.target_prompts(targets) if m["targetId"] in want]
c = river.Client(api_key=os.environ["RIVER_API_KEY"])
outs = c.sample([p for _, p in items], base_model=tv.BASE_MODEL, num_samples=2, max_tokens=220, temperature=0.7, stop=tv.STOP)
res = {}
for i, (m, _) in enumerate(items):
    res[m["targetId"]] = [s.text.strip() for s in outs[i * 2:(i + 1) * 2]]
json.dump(res, open(os.path.join(tv.RUNS_DIR, "generic-raw.json"), "w"), indent=2, ensure_ascii=False)
for k, v in res.items():
    for s in v:
        print("=====", k, "\n" + s)
c.close()
