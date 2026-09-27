---
name: gtm-x-community
version: 1.0.0
description: |
  Replies to founders on X who ask for GTM help ("how do I get my first users?",
  "marketing is the hard part") in the FOUNDER's voice. Helpful first, never
  a pitch. Also queues one original X post per morning.
triggers:
  - "reply on X"
  - "help founders on X"
  - "x community"
  - "draft a tweet"
schedule: "0 * * * *"   # posts only 08:00-10:00 PT, replies any hour (queued at night)
tools:
  - search
  - get_page
  - put_page
mutating: true
writes_to:
  - loops/
  - playbooks/
---

# GTM X Community

## Contract

- Max 5 replies per loop, 1 original post per day. Posting is **mocked** in the demo:
  the Operator types the reply and stops before Post.
- Answer the question in the first sentence. Mention Viewfy only if the founder asks.
- Handles stay masked in the brain (`@abc***`).

## Phases

1. **Recall.** `gbrain search "what worked on X"` -> read `playbooks/what-worked#what-worked-on-x`.
2. **Pick posts.** From `targets.json` `community`, newest first, skip anything already replied to
   (`gbrain search "<post id>"`).
3. **Draft.** Founder voice, <= 280 chars. Pattern that won (Loop 29): a concrete 3-line teardown
   of their situation, not encouragement.
4. **Time it.** Between 23:00 and 08:00 PT, queue instead of posting (Loop 34: 3x less reach).
5. **Act.** Operator types the reply in X (mock, never posts).
6. **Measure next loop.** Likes, replies, profile visits, signups -> `loops/loop-N`.

## Output

`Loop N · HH:00 - x: 5 replies (founder voice), best: teardown for @she*** (12 likes)`

## Anti-patterns

- Links in the first reply. Generic "great question!" openers. Replying to the same thread twice.
