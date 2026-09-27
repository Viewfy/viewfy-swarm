# Viewfy Swarm — submission

**One-liner:** An AI sales floor for early-stage founders. A swarm of agents runs your go-to-market every hour, in your own voice, and gets better every loop.

**Repo:** https://github.com/Viewfy/viewfy-swarm · **Company:** https://viewfy.ai

## What it does
Every hour the swarm runs one loop: **Sense → Recall → Draft → Act → Measure → Learn**.

- **Scout** finds news hooks, journalists, publishers, and X threads where founders ask for GTM help.
- **Voice** writes every pitch and reply in the founder's voice, or the company's voice, learned from their own posts and emails.
- **Press Desk** pitches journalists and publishers.
- **Community** replies to founders on X.
- **Operator** is the hands: it drives X and Gmail through computer use.
- **Coach** scores what landed and writes the lessons back into memory.

## How it owns its intelligence (sponsor stack)
- **River AI — voice.** We ran a real LoRA fine-tune (rank 16) of Qwen3.5-9B on River. The training data is 102 real @viewfy_ai posts and replies, plus a few founder emails. It has a real saved adapter, and we sample from it live. We also ran a demo RL step, where each reply earns a reward.
- **GBrain — memory.** A real local gbrain brain (PGLite) holds every person, pitch, reply, and hourly loop. The UI shows live `gbrain search`. The GTM skills are written as gbrain markdown workflows and run on an hourly cron.
- **Memorable — playbooks.** Winning workflows (e.g. "news-jack pitch · data angle v4") get recalled in the next loop. This part is simulated in the demo.
- **QM — the floor.** A multiplayer harness with the room #gtm-floor and an hourly cron `0 * * * *`. Framed in the demo; we run our own local harness.
- **Apify — scouting.** Real data: 125 @viewfy_ai posts (the voice corpus), 11 news articles from 2026, and 15 founder posts on X asking for help.

**Self-improvement happens in 3 layers: Remember (gbrain) · Repeat (Memorable) · Rewire (River).**

## Real vs. simulated (honest)
**Real:**
- The River fine-tune and live sampling
- gbrain memory and search
- The Apify data
- The hourly cron and the API server

**Simulated:**
- Sending and posting. Nothing is ever sent.
- The computer-use screen, which is an animation.
- Memorable
- The QM room
- The outcome metrics
- The journalist names, which are fictional. Their outlets are real.
- Gmail, which is not connected yet. The email samples are synthetic.

## Built with
Bun · Vite · React 19 · TypeScript · Tailwind v4 · Motion · a custom Canvas 2D renderer for the swarm, with Viewfy's own star mascots · a Bun API · River (`river_client`) · gbrain CLI · Apify.
