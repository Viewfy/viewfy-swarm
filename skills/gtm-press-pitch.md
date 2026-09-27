---
name: gtm-press-pitch
version: 1.0.0
description: |
  Drafts and (mock-)sends press pitches to journalists in FOUNDER voice and to
  publishers in COMPANY voice. Every pitch is grounded in a fresh signal and in
  what the brain says worked with that person before.
triggers:
  - "pitch journalists"
  - "press outreach"
  - "pitch a publisher"
  - "follow up with"
schedule: "0 * * * *"   # step 3-4 of the hourly loop, after gtm-scout
tools:
  - search
  - get_page
  - put_page
  - add_timeline_entry
mutating: true
writes_to:
  - people/
  - publishers/
  - loops/
---

# GTM Press Pitch

> **Convention:** voice comes from the River LoRA / `draft-in-voice` profile, never freehand.

## Contract

- Max 3 journalist pitches + 1 publisher pitch per loop. Never the same person twice in 24h
  unless it is a follow-up the brain scheduled.
- Journalists get founder voice. Publishers get company voice.
- Sending is **mocked** in the demo (Gmail drafts only). Nothing leaves without a human.

## Phases

1. **Pick targets.** From `targets.json`, journalists whose `signalId` is < 48h old.
2. **Recall the person.** `gbrain get people/<slug>`: last contact, status, notes.
   `gbrain search "<outlet>"` for outlet-level lessons (e.g. TechCrunch: lead with a number).
3. **Draft.** Subject = the number. Body <= 90 words: hook (their signal) -> our data point ->
   one-line ask. One asset max.
4. **Self-check.** Voice match >= 0.8 (River scorer), no "AI SDR" wording, no attachments.
5. **Act.** Operator opens Gmail, pastes the draft, stops before Send (mock).
6. **Log.** `gbrain timeline-add people/<slug> <date> "pitched: <angle>"` and a `loops/loop-N` page.

## Follow-ups

- Positive reply -> follow up within 24h with ONE chart (what booked Maya Chen's call).
- No reply after 72h -> one bump in founder voice, then stop.

## Anti-patterns

- Company voice to a journalist (Loop 27: no reply).
- Pitching without a signal. Pitching the product instead of the story (Business Insider).
