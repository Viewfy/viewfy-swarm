# Viewfy GTM skills

Fat-markdown workflow skills in the [gbrain](https://github.com/garrytan/gbrain) skill style
(YAML frontmatter + contract + phases + anti-patterns). Each one is a thin job prompt:
"Read skills/<name>.md and run it."

They run **every hour** (cron `0 * * * *`) in the QM room **#gtm-floor**, in this order:

| Step | Skill | Agent | Writes to gbrain |
|---|---|---|---|
| Sense | [gtm-scout](gtm-scout.md) | Scout | `outlets/`, `people/`, `publishers/` |
| Draft + Act (press) | [gtm-press-pitch](gtm-press-pitch.md) | Voice + Press desk + Operator | `people/` timeline, `loops/` |
| Draft + Act (X) | [gtm-x-community](gtm-x-community.md) | Voice + Community + Operator | `loops/` |
| Learn | [gtm-learn-loop](gtm-learn-loop.md) (at :55) | Coach | `learned/`, `playbooks/what-worked` |

Every skill starts with **Recall** (`gbrain search` / `gbrain get`) and the loop ends with
**Learn** (`gbrain capture` / `gbrain remember`), so each hour starts smarter than the last.

Sending and posting are mocked in the demo. The skills never send email or post to X.

Brain: `GBRAIN_HOME=$PWD/data/brain` (PGLite, keyless). Seed: `bun scripts/brain-seed.ts`.
