#!/usr/bin/env bun
// Seed the project-local gbrain (data/brain/.gbrain, PGLite, keyless) with Viewfy's GTM memory:
// the company page, one page per journalist / publisher / outlet, ~12 past hourly loops,
// a "what worked" playbook, plus a few `gbrain remember` facts.
// Usage: bun scripts/brain-seed.ts            (idempotent: pages are overwritten with --force)
// Every page is also written to data/brain/pages/<slug>.md so the seed is readable in git.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const GBRAIN_HOME = join(ROOT, 'data', 'brain')
const PAGES_DIR = join(GBRAIN_HOME, 'pages')
const env = { ...process.env, GBRAIN_HOME }

async function gbrain(args: string[], stdin?: string): Promise<{ ok: boolean; out: string }> {
  const p = Bun.spawn(['gbrain', ...args], { env, stdin: stdin ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' })
  if (stdin && p.stdin) {
    p.stdin.write(stdin)
    p.stdin.end()
  }
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()])
  const code = await p.exited
  return { ok: code === 0, out: code === 0 ? out : err || out }
}

type Page = { slug: string; title: string; type: string; tags: string[]; body: string }
const pages: Page[] = []
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// ---------- company ----------
pages.push({
  slug: 'companies/viewfy',
  title: 'Viewfy',
  type: 'company',
  tags: ['viewfy', 'self'],
  body: `# Viewfy

**The growth agent that gets you users while you ship.** https://viewfy.ai · X: @viewfy_ai

## What it is
Viewfy Swarm is an AI GTM "sales floor": a swarm of agents that runs go-to-market every hour
in the founder's own voice and gets smarter every loop.

## The hourly loop (cron \`0 * * * *\`, QM room #gtm-floor)
1. **Sense** - Scout finds news hooks, journalists, publishers and X threads (Apify).
2. **Recall** - pull what worked before from gbrain.
3. **Draft** - Voice writes in founder voice (journalists, X) or company voice (publishers). River LoRA.
4. **Act** - Operator drives Gmail / X via computer use (sending is mocked in the demo).
5. **Measure** - replies, likes, meetings.
6. **Learn** - Coach writes the lesson back into gbrain.

## Positioning
- Not an "AI SDR". A growth agent for technical founders who hate marketing.
- Wedge: founders asking "how do I get my first users?" on X.
- Press angle: AI search visibility (AEO/GEO) is the new SEO; early startups get zero citations.

## Key people
- Press targets: [[people/maya-chen|Maya Chen]], [[people/daniel-okafor|Daniel Okafor]], [[people/priya-raman|Priya Raman]], [[people/lena-fischer|Lena Fischer]], [[people/marcus-bell|Marcus Bell]], [[people/sofia-alvarez|Sofia Alvarez]]
- Playbook: [[playbooks/what-worked|What worked]]
`,
})

// ---------- journalists / publishers / signals from targets.json ----------
const targets = JSON.parse(readFileSync(join(ROOT, 'web/public/data/targets.json'), 'utf8'))
const signalById: Record<string, any> = Object.fromEntries(targets.signals.map((s: any) => [s.id, s]))

const journalistNotes: Record<string, { last: string; status: string; notes: string }> = {
  'Maya Chen': {
    last: '2026-09-27 (Loop 33)',
    status: 'warm - call booked Tuesday',
    notes:
      'Loved the data angle ("73% of seed-stage startups get zero citations in ChatGPT answers"). Lead with a number. Follow up within 24h with ONE chart, never a longer email.',
  },
  'Daniel Okafor': {
    last: '2026-09-26 (Loop 30)',
    status: 'interested - asked for traction numbers',
    notes: 'Pitched off the Runable $21M round. Tie pitches to a funding signal less than 48h old. Send user counts, not adjectives.',
  },
  'Priya Raman': {
    last: '2026-09-26 (Loop 27)',
    status: 'no reply',
    notes: 'Company-voice pitch on AI SEO spam got nothing. Retry in founder voice with a first-person story about Reddit/AI search.',
  },
  'Lena Fischer': {
    last: '2026-09-27 (Loop 35)',
    status: 'positive - wants an EU founder quote',
    notes: 'Hooked on n8n "1bn users with <1,000 employees": tiny teams need growth agents. Localize the angle for European founders.',
  },
  'Marcus Bell': {
    last: '2026-09-27 (Loop 36)',
    status: 'pending',
    notes: 'Pitched on the Daydream $15M round (AI + human SEO). BI wants a customer story, not a product story.',
  },
  'Sofia Alvarez': {
    last: '2026-09-26 (Loop 31)',
    status: 'declined',
    notes: '"AI SDR" framing is crowded and got a pass. Position Viewfy as a growth agent, not an SDR.',
  },
}

for (const j of targets.journalists) {
  const n = journalistNotes[j.name] ?? { last: 'never', status: 'cold', notes: '' }
  const sig = j.signalId ? signalById[j.signalId] : null
  pages.push({
    slug: `people/${slugify(j.name)}`,
    title: j.name,
    type: 'person',
    tags: ['journalist', slugify(j.outlet)],
    body: `# ${j.name}

Journalist at [[outlets/${slugify(j.outlet)}|${j.outlet}]].

- **Beat:** ${j.beat}
- **Last contact:** ${n.last}
- **Status:** ${n.status}
${sig ? `- **Hook:** "${sig.title}" (${sig.outlet}, ${sig.date ?? 'recent'}) ${sig.url}\n` : ''}
## Notes
${n.notes}

_Fictional persona for the demo; the outlet is real._
`,
  })
}

const outlets = [...new Set<string>(targets.journalists.map((j: any) => j.outlet))]
for (const o of outlets) {
  const js = targets.journalists.filter((j: any) => j.outlet === o)
  const sigs = targets.signals.filter((s: any) => s.outlet === o)
  pages.push({
    slug: `outlets/${slugify(o)}`,
    title: o,
    type: 'company',
    tags: ['outlet', 'press'],
    body: `# ${o}

Press outlet on Viewfy's target list.

## Journalists we pitch
${js.map((j: any) => `- [[people/${slugify(j.name)}|${j.name}]] - ${j.beat}`).join('\n')}

## Recent signals from ${o}
${sigs.length ? sigs.map((s: any) => `- ${s.date ?? ''} "${s.title}" ${s.url}`).join('\n') : '- none scouted yet'}
`,
  })
}

const publisherNotes: Record<string, string> = {
  "Lenny's Newsletter": 'Loop 28: pitched a guest post "How we got our first 100 users with an agent swarm". Reply: "send a draft". Publishers want a story plus a reusable framework.',
  'Indie Hackers': 'Loop 32: posted "Launched and nobody cared - what we changed". 48 upvotes, 9 comments, 3 signups. Vulnerability + numbers in the title works.',
  'First Round Review': 'Not pitched yet. Angle: "founder-led GTM when the founder is an engineer".',
  'My First Million': 'Not pitched yet. Angle: the $0-ad-budget growth playbook, told as a story.',
  'Product Hunt': 'Launch planned. Queue X replies from the community list on launch morning.',
}
for (const p of targets.publishers) {
  pages.push({
    slug: `publishers/${slugify(p.name)}`,
    title: p.name,
    type: 'company',
    tags: ['publisher', p.kind],
    body: `# ${p.name}

${p.kind} · https://${p.domain} · company voice

- **Audience:** ${p.audience ?? ''}
- **Last contact:** ${publisherNotes[p.name]?.startsWith('Loop') ? '2026-09-26' : 'never'}

## Notes
${publisherNotes[p.name] ?? ''}
`,
  })
}

// ---------- history: past hourly loops ----------
const loops: [number, string, string, string, string, string][] = [
  // [loop, time, action, reply, learned, links]
  [25, '2026-09-26 14:00', 'Pitched Maya Chen (TechCrunch) with the data angle: "73% of seed-stage startups get zero citations in ChatGPT answers".', 'positive', 'Lead with a number.', '[[people/maya-chen|Maya Chen]] [[outlets/techcrunch|TechCrunch]]'],
  [26, '2026-09-26 15:00', 'X community: replied in founder voice to a founder asking "how do I get my first users?" with a 3-step answer, no link.', '12 likes, 2 replies, 1 signup', 'On X, answer first and pitch never. Only mention Viewfy if asked.', '[[playbooks/what-worked|What worked]]'],
  [27, '2026-09-26 16:00', 'Pitched Priya Raman (The Verge) on AI SEO spam, written in company voice.', 'none', 'Company voice underperforms with journalists. Use founder voice for press.', '[[people/priya-raman|Priya Raman]] [[outlets/the-verge|The Verge]]'],
  [28, '2026-09-26 17:00', 'Pitched Lenny\'s Newsletter a guest post: "How we got our first 100 users with an agent swarm".', 'positive ("send a draft")', 'Publishers want a story plus a reusable framework.', "[[publishers/lenny-s-newsletter|Lenny's Newsletter]]"],
  [29, '2026-09-26 18:00', 'X community: replied to 5 technical founders saying "marketing is the hard part". Best reply was a concrete 3-line teardown of their landing page.', '31 likes on best reply, 4 profile visits', 'A specific teardown beats encouragement on X.', '[[playbooks/what-worked|What worked]]'],
  [30, '2026-09-26 19:00', 'Pitched Daniel Okafor (TechCrunch) tied to the Runable $21M round (AI agents that grow businesses).', 'interested, asked for traction', 'Tie pitches to a funding signal less than 48h old, and have numbers ready.', '[[people/daniel-okafor|Daniel Okafor]] [[outlets/techcrunch|TechCrunch]]'],
  [31, '2026-09-26 20:00', 'Pitched Sofia Alvarez (VentureBeat) with an "AI SDR" framing.', 'declined', 'Avoid the "AI SDR" label - crowded. Say "growth agent".', '[[people/sofia-alvarez|Sofia Alvarez]] [[outlets/venturebeat|VentureBeat]]'],
  [32, '2026-09-26 21:00', 'Posted on Indie Hackers: "Launched and nobody cared - what we changed".', '48 upvotes, 9 comments, 3 signups', 'Vulnerability plus numbers in the title works with founder communities.', '[[publishers/indie-hackers|Indie Hackers]]'],
  [33, '2026-09-27 08:00', 'Followed up with Maya Chen (TechCrunch) with one chart on AI-search citations.', 'positive - call booked Tuesday', 'Follow up within 24h with ONE asset, not a longer email.', '[[people/maya-chen|Maya Chen]] [[outlets/techcrunch|TechCrunch]]'],
  [34, '2026-09-27 09:00', 'X post at 23:00 PT the night before got 3x fewer impressions than morning posts.', 'low reach', 'Post on X between 8-10am PT. Queue night drafts for the morning.', '[[playbooks/what-worked|What worked]]'],
  [35, '2026-09-27 10:00', 'Pitched Lena Fischer (Sifted) using the n8n "1bn users with fewer than 1,000 employees" hook: tiny teams need growth agents.', 'positive - wants an EU founder quote', 'Localize the angle for the outlet\'s audience (European founders for Sifted).', '[[people/lena-fischer|Lena Fischer]] [[outlets/sifted|Sifted]]'],
  [36, '2026-09-27 11:00', 'Pitched Marcus Bell (Business Insider) on the Daydream $15M AI + human SEO round.', 'pending', 'Business Insider wants a customer story, not a product story.', '[[people/marcus-bell|Marcus Bell]] [[outlets/business-insider|Business Insider]]'],
]
for (const [n, at, action, reply, learned, links] of loops) {
  pages.push({
    slug: `loops/loop-${n}`,
    title: `Loop ${n} · ${at.slice(11)}`,
    type: 'note',
    tags: ['loop', 'history'],
    body: `# Loop ${n} · ${at}

${action} Reply: ${reply}. Learned: ${learned}

- **Action:** ${action}
- **Reply:** ${reply}
- **Learned:** ${learned}
- **Links:** ${links} [[companies/viewfy|Viewfy]]
`,
  })
}

pages.push({
  slug: 'playbooks/what-worked',
  title: 'What worked (GTM playbook)',
  type: 'concept',
  tags: ['playbook', 'learned'],
  body: `# What worked - Viewfy GTM playbook

Distilled by the Coach agent from loops 25-36. Recalled at the start of every hourly loop.

## Press (founder voice)
- Lead with a number (the data angle). Maya Chen / TechCrunch replied positive. (Loop 25)
- Tie the pitch to a funding signal less than 48h old. (Loop 30)
- Follow up within 24h with ONE asset. (Loop 33)
- Never use company voice with journalists. (Loop 27)
- Don't say "AI SDR". Say "growth agent". (Loop 31)

## What worked on X (founder voice)
- Answer the founder's question first; pitch never, mention Viewfy only if asked. (Loop 26)
- A concrete teardown beats encouragement. (Loop 29)
- Post between 8-10am PT. (Loop 34)

## Publishers (company voice)
- Story plus a reusable framework (Lenny's). (Loop 28)
- Vulnerability plus numbers in the title (Indie Hackers). (Loop 32)
`,
})

// ---------- write + put ----------
function toMarkdown(p: Page) {
  return `---\ntitle: "${p.title.replace(/"/g, "'")}"\ntype: ${p.type}\ntags: [${p.tags.join(', ')}]\n---\n\n${p.body}`
}

let ok = 0
for (const p of pages) {
  const md = toMarkdown(p)
  const file = join(PAGES_DIR, `${p.slug}.md`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, md)
  const r = await gbrain(['put', p.slug, '--force'], md)
  if (r.ok) ok++
  else console.error(`put ${p.slug} failed: ${r.out.slice(0, 200)}`)
}
console.log(`put ${ok}/${pages.length} pages`)

// ---------- durable facts (memory verb) ----------
const facts: [string, string][] = [
  ['Lead TechCrunch pitches with a number (the data angle)', 'TechCrunch'],
  ['Maya Chen booked a call after a one-chart follow-up', 'Maya Chen'],
  ['On X, answer the founder first and never pitch', 'X'],
  ['"AI SDR" framing gets declined; say "growth agent"', 'Viewfy'],
  ['Post on X between 8 and 10am PT', 'X'],
]
let f = 0
for (const [fact, entity] of facts) {
  const r = await gbrain(['remember', fact, '--provenance', 'viewfy loop history seed', '--entity', entity, '--kind', 'belief'])
  if (r.ok) f++
}
console.log(`remembered ${f}/${facts.length} facts`)
const s = await gbrain(['stats'])
console.log(s.out.split('\n').slice(0, 3).join(' | '))
if (!existsSync(join(GBRAIN_HOME, '.gbrain'))) console.warn('warning: data/brain/.gbrain missing - run: GBRAIN_HOME=$PWD/data/brain gbrain init --pglite --no-embedding')
