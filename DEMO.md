# Viewfy Swarm: demo run-of-show

A 2:40 screen recording. The app is the deck. There are no slides.

| # | Scene | Hash | Time | Running total |
|---|---|---|---|---|
| 1 | Hero | `#hero` | ~15s | 0:15 |
| 2 | The floor | `#floor` | ~45s | 1:00 |
| 3 | Voice | `#voice` | ~30s | 1:30 |
| 4 | Hands | `#hands` | ~25s | 1:55 |
| 5 | Memory | `#memory` | ~30s | 2:25 |
| 6 | Close | `#close` | ~15s | 2:40 |

**Keys:** `→` or `space` next · `←` back · `R` run a loop now · `F` jump to the floor · `1`–`6` jump to a scene.
The scene dots at the bottom are clickable too.

---

## Pre-flight checklist (T-10 min)

- [ ] `bun install`
- [ ] `bun run dev`. Wait until you see both `✦ viewfy swarm api on http://localhost:8787` and the Vite URL.
- [ ] Check the API: `curl -s localhost:5173/api/status`. You want `"ok":true`, and ideally `"brain":{"real":true,...}`.
- [ ] Warm the brain with one headless loop: `curl -s -X POST localhost:5173/api/run`. This also gives you a fresh `loops/…` memory to search for later.
- [ ] Open **http://localhost:5173/#hero** in Chrome.
- [ ] Set the browser to 1920×1080 and full screen: Chrome presentation mode (`cmd+shift+F`) or `cmd+ctrl+F`. You should see no tabs, no URL bar and no bookmarks bar.
- [ ] Hide the Dock (`cmd+opt+D`) and turn on **Do Not Disturb**. Quit Slack, Mail and Messages.
- [ ] Hide the cursor: park it at a screen edge, or move it off the recording area.
- [ ] Recorder: macOS `cmd+shift+5` → *Record Entire Screen* (Options → turn on the microphone), or QuickTime → *New Screen Recording*.
- [ ] **Test run:** press `1`–`6` once each. Press `R` on the floor and confirm that particles fly and the feed moves. Then press `1` to return to the hero.
- [ ] Reload the page (`cmd+R`) right before you record, so the swarm starts fresh. Wait about 3s for the canvas to settle.
- [ ] Take a sip of water. Smile. Hit record.

---

## Scene by scene

> Narration is first person, in the founder's voice. It's punchy, so don't read it like a script: the bold words are the ones to land.

### 1 · Hero (0:00–0:15), `#hero`

**On screen:** the Viewfy star on a night sky and the line *"Your AI sales floor."*

> "I'm a founder. I do go-to-market at 2am, like every founder. Generic AI sounds **generic**, and agents forget what they did yesterday.
> So I built **Viewfy Swarm**: my AI sales floor."

**Key:** `→` on "sales floor."

### 2 · The floor (0:15–1:00), `#floor`

**On screen:** the camera zooms out to the full swarm. You see agent teams around the center star, hundreds of micro-agents, the market ring (journalists, publishers, X founders), a stats bar and a live feed.

> (0:15) "This is the floor. Every cluster is a team.
> **Scout** finds news hooks, journalists, publishers, and X threads where founders are asking for GTM help.
> **Voice** writes everything. **Press desk** pitches journalists and publishers. **Community** works X. **Operator** is the hands. **Coach** scores what landed."
>
> (0:30) "It runs **every hour** on a real cron. Let me kick off a loop right now."

**Key:** press `R` at about **0:32**, right after "right now."

> (0:35) "Sense, recall, draft, act, measure, learn.
> Those shooting stars are pitches going out to **journalists** and **publishers**, and replies to **founders on X**.
> The gold ones coming back are **replies**. Every reply is a reward signal.
> And the center star is the brain. Everything the swarm does, it **remembers**."

**Tip:** let the loop breathe. Watch the feed, and don't talk over the gold replies landing.

**Key:** `→` at about 1:00.

### 3 · Voice (1:00–1:30), `#voice`

**On screen:** the voice model trained on Gmail + @viewfy_ai, the tone fingerprint, and **generic AI vs your voice** side by side.

> "Here's the part I care about most. It doesn't sound like AI, it sounds like **me**.
> We fine-tuned a voice model on **River** using my **Gmail** and our **@viewfy_ai** posts on X. It learns two voices: **mine**, for journalists and the X community, and the **company's**, for publishers.
> On the left is generic AI: 'I hope this email finds you well.' On the right is the swarm: short, direct, leads with a number. That's how I actually write."

**Key:** `→` at about 1:30.

### 4 · Hands (1:30–1:55), `#hands`

**On screen:** computer use types an X reply and a Gmail pitch, character by character.

> "Then it **acts**, with hands. Computer use drives X and Gmail the way a human would.
> Here it's replying to a founder on X, and here it's pitching a TechCrunch reporter on a news hook Scout found this morning.
> For the demo, nothing actually sends. Every message waits in a queue for me to approve."

**Key:** `→` at about 1:55.

### 5 · Memory (1:55–2:25), `#memory`

**On screen:** the gbrain star cluster grows, a live `gbrain search`, the Memorable workflows, the River reward curve, and the mascot from Day 1 to Day 90.

> "And every hour it gets **smarter**, in three layers.
> **Remember:** gbrain stores every person, pitch and reply. Here's a live search.
> **Repeat:** Memorable saves the workflows that win and recalls them in the next loop.
> **Rewire:** River RL uses the replies as its reward, so the voice itself improves.
> **Remember, repeat, rewire.** Day 1 it's an intern. Day 90 it knows my market better than I do."

**Optional: 10s terminal cutaway (right after "Here's a live search").**
Cut to a terminal (dark theme, font 20pt+, pre-typed) and hit enter:

```bash
gbrain search "TechCrunch"          # ⚠ VERIFY WITH BRAIN AGENT: exact command, brain dir/env, expected hits
```

Fallback, which hits the same brain through our API:

```bash
curl -s 'localhost:8787/api/brain/search?q=TechCrunch&limit=3' | python3 -m json.tool
```

> "That's the real brain on my laptop, not a mock. It holds every journalist we've touched and every loop the swarm has run."

**Key:** `→` at about 2:25.

### 6 · Close (2:25–2:40), `#close`

**On screen:** *"Own your GTM intelligence."* and viewfy.ai.

> "Your voice lives in River weights. Your memory lives in gbrain. Your playbooks live in Memorable.
> It runs every hour, in your voice, and it gets better every loop.
> **Own your GTM intelligence.** viewfy.ai."

Hold on the close for 2s of silence, then stop the recording (`cmd+ctrl+esc` or the menu bar stop button).

---

## Q&A cheat sheet

**Real vs mocked** (from the README; be honest, since judges respect that):

| Sponsor | Role in the swarm | Demo status |
|---|---|---|
| **River AI** | Voice fine-tune (LoRA) + RL with replies as the reward | **Real API attempt** (train + sample). Falls back to precomputed drafts. |
| **GBrain** | Memory, plus skills (markdown workflows run on cron) | **Real CLI** (PGLite, keyless). Falls back to in-memory storage. |
| **Memorable** | Procedural memory of winning workflows | Mocked |
| **QM** | Multiplayer harness: room `#gtm-floor`, hourly cron | Mocked. Skills are written in QM/gbrain format. |
| **Apify** | Scout data: @viewfy_ai tweets (voice corpus), news hooks, founder threads on X | **Real**, cached to fixtures |
| **Computer use** | The Operator's hands | Mocked animation. It never posts. |
| **UFO / Superset** | Business agent OS / parallel coding agents | Credits only |

**Fast facts** (as of build time; re-check `web/public/data/*.json` before recording):

- **River run:** a real LoRA, rank 16, on `Qwen/Qwen3.5-9B`. 108 examples: 69 @viewfy_ai posts, 33 replies and 6 founder emails. 20 steps, with loss going from 0.251 to 0.153. On a char-trigram voice score, the tuned model gets 0.72 and the untuned base gets 0.46. One RL demo step ran on top with **fake** hourly outcomes as the reward.
- **Gmail:** Gmail isn't connected for the demo. The "Gmail" training samples are **synthetic founder emails** written in the same voice. The X corpus is **real**: @viewfy_ai posts scraped with Apify.
- **Journalists:** **fictional persona names at real outlets** (TechCrunch, The Verge, Sifted, Business Insider, VentureBeat). Handles of X founders are masked (`@jes***`).
- **Nothing is sent.** Gmail sending, X posting and computer use are all mocked. That's a feature for a demo: every message waits for founder approval.
- **Hourly cron:** real. The server runs `0 * * * *` (see `server/cron.ts`). Each run writes a loop summary into gbrain and appends to `data/ledger.jsonl`. The browser animates loops at demo speed (1h ≈ 30s).

**Likely questions:**

- *"Is the loop real or animated?"* Both. The browser engine is a seeded simulation, so the visuals are deterministic. The hourly cron on the server is real: it writes to gbrain and to a ledger (`curl localhost:8787/api/ledger`).
- *"How does it self-improve?"* It works in three layers. **Remember** stores facts in gbrain. **Repeat** saves winning workflows in Memorable. **Rewire** updates the weights with River RL, using the reply rate as the reward.
- *"Why not just use ChatGPT?"* It sounds like everyone else, it forgets, and you don't own it. Here the voice is in your weights, the memory is in your brain, and the playbooks are in your repo.
- *"What's the business?"* Viewfy (viewfy.ai) helps startups get seen: press, publishers, communities, and AI search. The swarm is the engine that does it every hour.
- *"Where does the data live?"* On this laptop: PGLite for gbrain, JSON fixtures, and a JSONL ledger. Nothing is deployed.

---

## Backup plan (if something breaks live)

| Symptom | Fix (fast → slow) |
|---|---|
| API is down or `/api/*` errors | The frontend engine runs entirely in the browser, so **keep going**. Only the live gbrain search is affected. If you need it back: `bun run dev:api` in a second terminal. |
| gbrain search is empty or slow | Skip the terminal cutaway. The Memory scene falls back to its built-in sample queries. Say: "It holds every journalist we've touched." |
| The swarm freezes or the canvas goes blank | `cmd+R`, then press the scene's number key (`2` for the floor). The engine is seeded, so it comes back the same. |
| `R` does nothing | Wait out the current loop (about 30s at demo speed), or run `curl -X POST localhost:8787/api/run` for a server-side loop. Keep narrating over the auto-running floor. |
| Wrong scene or a fumbled key | `1`–`6` jump directly. Don't apologize, just keep talking. |
| Port 5173 or 8787 already in use | `lsof -ti:5173,8787 \| xargs kill`, then `bun run dev`. |
| Fonts or brand assets missing | It's a cosmetic issue. Keep going. |
| Everything is on fire | Play the **backup screen recording** (record one full clean take during the 1:40–2:00 slot, and keep it on the desktop as `viewfy-swarm-backup.mov`). |

**API quick reference** (for the terminal, or when judges ask to see it):

```bash
curl -s localhost:8787/api/status                       # cron, next run, headless runs, brain stats
curl -s -X POST localhost:8787/api/run                  # run a headless loop now (writes gbrain + ledger)
curl -s 'localhost:8787/api/brain/search?q=TechCrunch'  # { real, hits }
curl -s 'localhost:8787/api/brain/recent?limit=5'       # latest memories
curl -s 'localhost:8787/api/ledger?limit=5'             # latest loop / learn entries
```
