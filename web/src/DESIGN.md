# Viewfy Swarm — design rules (all agents follow these)

**Concept: the swarm is a night sky.** The Viewfy mascot is a soft, clay-like sky-blue star, so the swarm is a
constellation. The center star (brain / gbrain) is surrounded by 6 squad constellations; hundreds of tiny
micro-agents (fireflies) stream between them and out to an outer "market" ring (journalists, publishers, X
community, news signals). Pitches go out as shooting stars; replies come back as gold sparks.

The demo is recorded as a video (1920×1080 or 1440×900, 16:9) — design for that, readable from the back of a room.

## Tokens (Tailwind v4 classes available — see web/src/index.css)
- Background: `night-950 #050814`, `night-900 #0a1024`, `night-800 #111a36`, `night-700 #1b2650`
- Brand: `star #88c8f8` (primary accent, the mascot blue), `star-bright #bfe3ff`, `star-deep #4a9fe8`,
  `cream #f8f5f1` (primary text color on dark), `ink #181717`
- Accents: `gold #f6c667` (success, replies, meetings, learning), `coral #ff8a70` (press/journalists),
  `mint #6ee7b7` (scout/signals), `violet #a78bfa` (voice/River), `pink #f472b6` (operator/computer use),
  `sky #7cc4fa` (community/X)
- Squad colors come from `SQUADS` in `web/src/engine/layout.ts` — always use those, never invent new ones.

## Typography
- `font-sans` = Lato (300/400/700/900). Headlines: Lato 900, tight tracking (`tracking-tight`), cream, with key
  words in `text-star` (like the viewfy.ai og-image: "gets you **users** while you **ship**").
- `font-hand` = Caveat (500/700) for hand-written annotations/arrows in `text-star` or `text-gold` — use sparingly,
  1–2 per scene, like a founder scribbling on the screen.
- Micro labels: 11–12px, uppercase, `tracking-[0.2em]`, `text-cream/50`.
- Numbers: always `tabular` class (tabular-nums). Animate number changes.
- Min body size in overlays: 14px. Scene headlines: 56–96px.

## Surfaces
- Panels use the `.glass` class (dark translucent, blur, 1px white/9% border, radius 20px). Padding 20–28px.
- Colored glows: `box-shadow: 0 0 40px -10px <color>` for emphasis. No harsh borders, no pure white fills.
- Mascots: use `MASCOTS` / `SPRITES` from `web/src/engine/layout.ts` — one Viewfy star variant per job (scout, writer, inbox,
  social, chrome, auditor, happy, sad, wizard team, learn 1→90). Avoid viewfy-avatar-*, viewfy-angry, viewfy-searching (white bg) — clip
  it in a circle or avoid). Mascots are friendly accents, not decoration spam.

## Motion
- Use `motion/react` (`import { motion, AnimatePresence } from 'motion/react'`).
- Enter: fade + 12–24px rise, spring or easeOut 0.5–0.8s, stagger children 60–90ms.
- Everything feels alive: typing effects, counters ticking, soft pulses. Never jittery; 60fps.
- Overlays must be `pointer-events-none` except for elements that need clicks.

## Layout
- Scenes are absolute full-screen overlays on top of the persistent canvas. Leave the canvas visible — overlays
  sit on the sides/bottom; the camera places the focus point where the overlay isn't.
- Bottom 48px is reserved for the scene navigation dots.
