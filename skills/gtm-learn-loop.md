---
name: gtm-learn-loop
version: 1.0.0
description: |
  The Learn step that closes every hourly GTM loop. Scores outcomes (replies,
  likes, meetings), writes one lesson per action back into gbrain, and updates
  the "what worked" playbook so the next loop starts smarter.
triggers:
  - "what did we learn"
  - "close the loop"
  - "update the playbook"
  - "score this loop"
schedule: "55 * * * *"   # last step of each hourly loop, before the next :00 scout
tools:
  - search
  - get_page
  - put_page
  - remember
  - add_link
mutating: true
writes_to:
  - loops/
  - learned/
  - playbooks/
---

# GTM Learn Loop

## Contract

- Every action from this loop gets exactly one memory:
  `Loop N · HH:00 - <action>; reply: <outcome>; learned: <one lesson>`.
- Lessons are one claim each, phrased as an instruction ("Lead with a number").
- The playbook only changes when a lesson repeats twice or contradicts an old one.

## Phases

1. **Collect.** Outcomes from Gmail (replies), X (likes/replies/visits), calendar (meetings).
2. **Score.** reply = 1, meeting = 3, signup = 5, no reply = 0. The same score is the River RL reward.
3. **Remember.** Server `/api/learn` -> `remember(text, source)` -> `gbrain capture` per memory
   (serialized, 5s timeout, falls back to `data/brain/mock.jsonl`). Durable facts also via
   `gbrain remember "<lesson>" --provenance "loop N" --entity "<person/outlet>"`.
4. **Link.** Link the loop page to each person/outlet/publisher it touched.
5. **Rewire.** If a lesson has 2+ confirmations, edit `playbooks/what-worked` (Memorable mirrors it).
6. **Report.** One line to #gtm-floor: `Loop N: 4 pitches, 2 replies, 1 meeting; learned: ...`.

## Verify

`gbrain search "loop N"` returns the new memories. `gbrain stats` page count went up.

## Anti-patterns

- Vague lessons ("be better"). Lessons with no source loop. Rewriting the playbook every hour.
