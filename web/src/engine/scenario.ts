// Choreography for one hourly loop: a seeded, timed script of beats per phase.
// The engine (engine.ts) owns time and state; this file decides WHAT happens WHEN.
import type {
  DataBundle,
  EngineState,
  FeedTone,
  Kpis,
  LearnSummary,
  MarketNode,
  MarketNodeState,
  MemoryItem,
  PhaseId,
  SquadId,
  SquadState,
  SwarmEvent,
  Workflow,
} from './types'
import type { Draft } from '../data/types'
import { PHASES, SQUAD_ORDER } from './layout'
import { between, chance, fmt, int, mulberry32, pick, sample, shuffle, slug, type Rng } from './rng'
import { isAmbient } from './market'

// ---------------------------------------------------------------- timing (seconds at speed 1)

export const PHASE_ORDER: PhaseId[] = PHASES.map((p) => p.id)
export const PHASE_DUR: Record<PhaseId, number> = { sense: 5, recall: 3.5, draft: 5, act: 8, measure: 4.5, learn: 4.5 }
export const PHASE_START = {} as Record<PhaseId, number>
{
  let t = 0
  for (const p of PHASE_ORDER) {
    PHASE_START[p] = t
    t += PHASE_DUR[p]
  }
}
export const LOOP_LEN = PHASE_ORDER.reduce((a, p) => a + PHASE_DUR[p], 0)
export const SLEEP_LEN = 3

// ---------------------------------------------------------------- stage API (implemented by the engine)

type NumKpi = Exclude<keyof Kpis, 'replyRateHistory'>

export interface Stage {
  state(): EngineState
  feed(squad: SquadId | 'brain', text: string, tone: FeedTone, detail?: string): void
  squad(id: SquadId, patch: Partial<SquadState>): void
  node(id: string, state: MarketNodeState): void
  kpi(delta: Partial<Record<NumKpi, number>>): void
  kpiSet(patch: Partial<Kpis>): void
  emit(e: SwarmEvent): void
  addMemories(items: { text: string; source: string }[]): void
  setWorkflows(list: Workflow[]): void
  setLearned(s: LearnSummary): void
  postLearn(body: unknown): void
}

export interface Beat {
  t: number // absolute seconds from loop start
  seq: number
  run: (st: Stage) => void
}

/** A typing job for the Operator's computer-use screen. Times are seconds from ACT start. */
export interface ComputerJob {
  start: number
  end: number // typing finished → 'sent'
  app: 'x' | 'gmail'
  to: string
  subject?: string
  context?: string
  text: string
  nodeId: string
}

export interface LoopScript {
  loop: number
  beats: Beat[]
  jobs: ComputerJob[]
  summary: LearnSummary
}

// ---------------------------------------------------------------- text pools

const REPLIES = {
  journalist: [
    'send me the numbers',
    'interesting. is this on the record?',
    'can you do a call thursday?',
    'love the angle. what is the sample size?',
    'this might fit a piece I am filing next week',
    'send the dataset and I will take a look',
  ],
  publisher: [
    "we'd run this as a guest post",
    'send a draft by friday',
    'fits our tuesday issue. 150 words?',
    "let's book you for an episode",
    'can you share a chart we can embed?',
  ],
  community: [
    'wait this is exactly what i needed',
    'how does it pick threads?',
    'trying it now 🙏',
    'ok this is actually helpful, thanks',
    'going to try this today',
    'dm’d you',
    'saving this',
    'how do I get on the beta?',
  ],
  signal: ['noted'],
} as const

const RECALL_NOTES = [
  'liked the data angle',
  'asked for numbers next time',
  'prefers 3-line pitches',
  'opened twice, no reply yet',
  'shared our Show HN dataset',
  "said 'not now, maybe Q4'",
  'replied fast to a news hook',
]

const LESSONS = [
  (r: Rng) => `Lead with a number — ${int(r, 3, 4)}/${int(r, 4, 5)} replies did`,
  () => 'Mornings beat evenings for X replies',
  (r: Rng) => `Short X replies (<40 words) got ${between(r, 1.6, 2.4).toFixed(1)}× the likes`,
  (r: Rng) => `Stat in the subject line opened ${int(r, 28, 46)}% more`,
  () => "No link in the first reply — ask first",
  (r: Rng) => `Threads under ${int(r, 2, 4)}h old convert best`,
  () => 'Podcasts want a story, not a product',
  (r: Rng) => `Day-5 follow-up revived ${int(r, 2, 3)} cold threads`,
  () => 'Tie pitches to a story from the last 48h',
  () => 'Helpful-first replies earn profile clicks',
]

const MEET_SLOTS = ['Mon 11:00', 'Tue 14:30', 'Wed 10:00', 'Thu 10:30', 'Fri 16:00']
const ANGLES = ['data angle', 'news-jack', 'founder story', 'contrarian take']

const DOMAINS: Record<string, string> = {
  TechCrunch: 'techcrunch.com',
  'The Verge': 'theverge.com',
  'Business Insider': 'businessinsider.com',
  Wired: 'wired.com',
  'Fast Company': 'fastcompany.com',
  Axios: 'axios.com',
  Forbes: 'forbes.com',
  'The Information': 'theinformation.com',
  'Bloomberg Tech': 'bloomberg.net',
  'MIT Tech Review': 'technologyreview.com',
}

// ---------------------------------------------------------------- helpers

const clip = (s: string, n: number) => {
  const one = s.replace(/\s+/g, ' ').trim()
  return one.length > n ? one.slice(0, n - 1).trimEnd() + '…' : one
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

interface Who {
  node: MarketNode
  name: string // "Maya Chen" / "@jes***" / "Indie Hackers"
  org?: string // outlet / domain
  full: string // "Maya Chen (TechCrunch)"
  email: string
  topic: string
  post?: string // community post text
  signalTitle?: string
}

function whoOf(node: MarketNode, data: DataBundle): Who {
  const t = data.targets
  if (node.kind === 'journalist') {
    const j = t.journalists.find((x) => x.id === node.id)
    if (j) {
      const dom = DOMAINS[j.outlet] ?? `${slug(j.outlet).replace(/-/g, '')}.com`
      const sig = t.signals.find((s) => s.id === j.signalId)
      return {
        node,
        name: j.name,
        org: j.outlet,
        full: `${j.name} (${j.outlet})`,
        email: `${slug(j.name).replace(/-/g, '.')}@${dom}`,
        topic: j.beat,
        signalTitle: sig?.title,
      }
    }
    const dom = DOMAINS[node.label] ?? `${slug(node.label).replace(/-/g, '')}.com`
    return { node, name: node.label, org: node.label, full: `${node.label} (${node.sub ?? 'news desk'})`, email: `tips@${dom}`, topic: node.sub ?? 'startups' }
  }
  if (node.kind === 'publisher') {
    const p = t.publishers.find((x) => x.id === node.id)
    const domain = p?.domain ?? `${slug(node.label).replace(/-/g, '')}.com`
    return { node, name: node.label, org: p?.kind ?? node.sub, full: `${node.label} (${p?.kind ?? node.sub ?? 'newsletter'})`, email: `editors@${domain}`, topic: p?.audience ?? 'founders' }
  }
  if (node.kind === 'community') {
    const c = t.community.find((x) => x.id === node.id)
    return { node, name: node.label, full: node.label, email: '', topic: c?.topic ?? node.sub ?? 'growth', post: c?.text }
  }
  const s = t.signals.find((x) => x.id === node.id)
  return { node, name: s?.outlet ?? node.label, org: s?.outlet ?? node.label, full: s?.outlet ?? node.label, email: '', topic: s?.title ?? node.sub ?? '', signalTitle: s?.title ?? node.sub }
}

function draftFor(w: Who, data: DataBundle, r: Rng): Draft {
  const d = data.drafts.drafts.find((x) => x.targetId === w.node.id)
  if (d) return d
  if (w.node.kind === 'community') {
    const pool = data.drafts.drafts.filter((x) => x.channel === 'x_reply')
    const base = pool.length ? pick(r, pool) : null
    return {
      targetId: w.node.id,
      channel: 'x_reply',
      voice: 'founder',
      text: base?.text ?? "answer the question first, link never. find 5 threads this week asking for what you built and reply properly. keep building 💙",
      voiceMatch: base?.voiceMatch ?? 0.95,
      real: false,
    }
  }
  const company = w.node.kind === 'publisher'
  return {
    targetId: w.node.id,
    channel: 'gmail',
    voice: company ? 'company' : 'founder',
    subject: company ? `guest piece for ${w.name}: first 100 users come from threads` : `data point for your ${w.topic} coverage`,
    text: company
      ? `hi ${w.name} team,\n\nwe have data from thousands of founder-approved replies: short answers win, links lose, speed beats polish.\n\nhappy to write it up for your readers.\n\nthe Viewfy team`
      : `hi,\n\none data point for your ${w.topic} coverage: founders approve agent replies on threads under 3h old and skip anything older.\n\nI'm building Viewfy, the growth agent that gets you users while you ship. numbers are yours if useful.\n\nMike`,
    voiceMatch: 0.94,
    real: false,
  }
}

/** Take n nodes of a kind, preferring real targets over ambient ones. */
function chooseNodes(r: Rng, pool: MarketNode[], kind: MarketNode['kind'], n: number, realBias = 0.78): MarketNode[] {
  const real = shuffle(r, pool.filter((x) => x.kind === kind && !isAmbient(x.id)))
  const amb = shuffle(r, pool.filter((x) => x.kind === kind && isAmbient(x.id)))
  const out: MarketNode[] = []
  while (out.length < n && (real.length || amb.length)) {
    const fromReal = real.length && (!amb.length || r() < realBias)
    out.push((fromReal ? real : amb).shift()!)
  }
  return out
}

function crew(st: Stage, r: Rng, working: Partial<Record<SquadId, string>>, idle: Partial<Record<SquadId, string>> = {}) {
  for (const id of SQUAD_ORDER) {
    const task = working[id]
    if (task) st.squad(id, { status: 'working', task, workers: 44 + int(r, 0, 20) })
    else st.squad(id, { status: 'idle', task: idle[id] ?? 'Standing by', workers: 26 + int(r, 0, 8) })
  }
}

const bumpVersion = (name: string) =>
  /v(\d+)$/.test(name) ? name.replace(/v(\d+)$/, (_, v) => `v${Number(v) + 1}`) : `${name} v2`

// ---------------------------------------------------------------- the loop script

export function buildLoop(loop: number, s: EngineState, data: DataBundle): LoopScript {
  const r = mulberry32(loop * 7919 + 1013)
  const beats: Beat[] = []
  let seq = 0
  const at = (phase: PhaseId, rel: number, run: (st: Stage) => void) =>
    beats.push({ t: PHASE_START[phase] + Math.max(0, Math.min(PHASE_DUR[phase] - 0.02, rel)), seq: seq++, run })

  const k = s.kpis
  const lvl = Math.max(0, loop - 38) // how far the demo has progressed
  const avail = s.market.filter((n) => n.state === 'dormant' || n.state === 'found')

  // ---- who we find
  const sigs = chooseNodes(r, avail, 'signal', int(r, 2, 3), 0.85)
  const jour = chooseNodes(r, avail, 'journalist', 2, 0.9)
  const pubs = chooseNodes(r, avail, 'publisher', int(r, 1, 2))
  const comm = chooseNodes(r, avail, 'community', int(r, 3, 4), 0.72)
  const people = [...jour, ...pubs, ...comm]
  const found = shuffle(r, [...sigs, ...people])
  const W = new Map<string, Who>()
  for (const n of [...found, ...s.market]) if (!W.has(n.id)) W.set(n.id, whoOf(n, data))
  const who = (n: MarketNode) => W.get(n.id)!

  const pitches = [...jour, ...pubs].map((n) => ({ w: who(n), d: draftFor(who(n), data, r) }))
  const xreplies = comm.map((n) => ({ w: who(n), d: draftFor(who(n), data, r) }))
  const posts = data.drafts.drafts.filter((d) => d.channel === 'x_post')
  const postDraft = posts.length && (loop % 2 === 0 || chance(r, 0.5)) ? posts[loop % posts.length] : null
  const postAudience = sample(r, s.market.filter((n) => n.kind === 'community' && isAmbient(n.id) && n.state === 'dormant'), 3)

  const scanned = int(r, 900, 2400)
  const stories = int(r, 3, 7)
  const mainOutlet = sigs.length ? who(sigs[0]).org ?? 'TechCrunch' : 'TechCrunch'
  const topWf = [...s.workflows].sort((a, b) => b.winRate - a.winRate)[0]

  // ---- outcomes (reply rate rises every loop)
  const rate = Math.min(0.3, 0.16 + 0.014 * lvl) + (r() - 0.5) * 0.05
  const contacted = [...pitches.map((p) => p.w), ...xreplies.map((x) => x.w)]
  const nReplies = Math.max(1, Math.min(contacted.length, Math.round(contacted.length * rate + r() * 0.7)))
  const repliers = shuffle(r, contacted)
    .sort((a, b) => Number(isAmbient(a.node.id)) - Number(isAmbient(b.node.id)) + (r() - 0.5) * 0.9)
    .slice(0, nReplies)
  const olderContacted = s.market.filter((n) => n.state === 'contacted' && n.kind !== 'signal')
  const followUp = olderContacted.length && chance(r, 0.4 + 0.03 * lvl) ? who(pick(r, olderContacted)) : null
  const wantMeeting = loop % 2 === 0 || chance(r, 0.35)
  const pressReplier = repliers.find((w) => w.node.kind !== 'community')
  const olderRepliedAll = s.market.filter((n) => n.state === 'replied')
  const olderReplied = olderRepliedAll.some((n) => !isAmbient(n.id)) ? olderRepliedAll.filter((n) => !isAmbient(n.id)) : olderRepliedAll
  const meetingWho = wantMeeting
    ? pressReplier && chance(r, 0.6)
      ? pressReplier
      : olderReplied.length
        ? who(pick(r, olderReplied))
        : repliers[0]
    : null
  const likeTargets = sample(r, xreplies.map((x) => x.w), Math.min(xreplies.length, int(r, 2, 3)))

  const last = k.replyRateHistory[k.replyRateHistory.length - 1] ?? 0.09
  const dip = lvl > 1 && chance(r, 0.12)
  const newRate = Math.min(0.24, last + (dip ? -between(r, 0.0005, 0.0015) : between(r, 0.003, 0.008)))
  const memAdd = int(r, 10, 18) + Math.min(6, lvl)
  const rewardGain = between(r, 0.008, 0.018) * (k.reward < 0.9 ? 1 : 0.2)
  const rewardDelta = rewardGain / Math.max(0.1, k.reward)
  const voiceGain = Math.max(0, Math.min(0.975 - k.voiceMatch, between(r, 0.0015, 0.0045)))
  const lessonIdx = sample(r, LESSONS.map((_, i) => i), int(r, 2, 3))
  const notes = lessonIdx.map((i) => LESSONS[i](r))

  // workflows
  const wfUsed = topWf ?? null
  const newVersion = !!wfUsed && (loop % 3 === 0 || chance(r, 0.25))
  const workflowSaved = wfUsed ? (newVersion ? bumpVersion(wfUsed.name) : wfUsed.name) : undefined

  const summary: LearnSummary = {
    loop,
    memoriesAdded: memAdd,
    workflowSaved,
    rewardDelta: Math.round(rewardDelta * 1000) / 1000,
    replyRate: newRate,
    notes,
  }

  // ======================================================== SENSE
  at('sense', 0, (st) => {
    st.emit({ type: 'phase', phase: 'sense', loop })
    st.emit({ type: 'pulse', squad: 'scout' })
    crew(
      st,
      r,
      { scout: `Scanning ${fmt(scanned)} posts on X`, community: 'Listening for "how do I get users"' },
      { voice: 'Warming up founder voice', press: 'Inbox zero', operator: 'Browser parked', coach: `Reviewing loop ${loop - 1}` },
    )
    st.feed('scout', `Loop ${loop} started · scanning X, news & inboxes`, 'info')
  })
  const scoutGap = 3.4 / Math.max(1, found.length)
  found.forEach((n, i) => {
    const t = 0.3 + i * scoutGap
    at('sense', t, (st) => st.emit({ type: 'scout', squad: n.kind === 'community' ? (i % 2 ? 'community' : 'scout') : 'scout', to: n.id }))
    at('sense', t + 0.85, (st) => {
      st.emit({ type: 'found', node: n.id })
      st.node(n.id, 'found')
    })
  })
  at('sense', 1.3, (st) => st.squad('scout', { task: `Reading ${stories} new ${mainOutlet} stories` }))
  if (sigs.length) {
    at('sense', 1.9, (st) => {
      const first = who(sigs[0])
      st.feed(
        'scout',
        `Scout found ${sigs.length} stories: '${clip(first.signalTitle ?? first.topic, 70)}' — ${first.org}`,
        'info',
        sigs.slice(1).map((x) => clip(who(x).signalTitle ?? who(x).topic, 60)).join(' · ') || undefined,
      )
    })
  }
  const jMain = jour.find((n) => !isAmbient(n.id)) ?? jour[0]
  if (jMain) {
    at('sense', 2.7, (st) => {
      const w = who(jMain)
      st.feed('scout', isAmbient(jMain.id) ? `Matched ${w.full}` : `Matched ${w.full} — covers ${w.topic}`, 'info', w.signalTitle ? `hook: ${clip(w.signalTitle, 70)}` : undefined)
    })
  }
  if (comm[0]) {
    at('sense', 3.4, (st) => {
      const w = who(comm[0])
      st.feed('community', `Found ${w.name} asking for help on X · ${w.topic}`, 'info', w.post ? `“${clip(w.post, 90)}”` : undefined)
    })
  }
  at('sense', 3.5, (st) => st.squad('scout', { task: `Matched ${people.length} targets · ${sigs.length} news hooks` }))
  at('sense', 4.5, (st) => {
    st.feed('scout', `Scout: ${fmt(scanned)} posts scanned → ${people.length} targets, ${sigs.length} hooks sent to gbrain`, 'info')
    st.emit({ type: 'handoff', from: 'scout', to: 'brain' })
    st.squad('scout', { done: st.state().squads.scout.done + people.length })
  })

  // ======================================================== RECALL
  at('recall', 0, (st) => {
    st.emit({ type: 'phase', phase: 'recall', loop })
    st.emit({ type: 'pulse', squad: 'brain' })
    st.emit({ type: 'handoff', from: 'scout', to: 'brain' })
    crew(
      st,
      r,
      {
        coach: 'Recalling what worked · Memorable',
        press: `Pulling contact history for ${pitches.length} people`,
        voice: 'Loading founder voice · River LoRA',
      },
      { scout: `Handed ${people.length} targets to gbrain`, community: 'Pulling thread context', operator: 'Browser parked' },
    )
  })
  const pMain = pitches.find((p) => !isAmbient(p.w.node.id)) ?? pitches[0]
  if (pMain) {
    at('recall', 0.4, (st) => {
      const w = pMain.w
      const days = int(r, 4, 21)
      st.feed('brain', `gbrain: last contact with ${w.name} ${days} days ago — ${pick(r, RECALL_NOTES)}`, 'info', `people/${slug(w.name)}`)
    })
  }
  const bq = data.brain.sampleQueries.length ? data.brain.sampleQueries[loop % data.brain.sampleQueries.length] : null
  if (bq) {
    at('recall', 1.1, (st) => {
      const top = bq.hits[0]
      st.feed('brain', `gbrain search “${clip(bq.q, 48)}” → ${bq.hits.length} hits`, 'info', top ? `${top.title}: ${clip(top.snippet, 80)}` : undefined)
    })
  }
  if (topWf) {
    at('recall', 1.9, (st) => {
      st.feed('coach', `Memorable: recalled workflow '${topWf.name}' (${Math.round(topWf.winRate * 100)}% reply rate)`, 'learn')
      st.emit({ type: 'pulse', squad: 'coach' })
    })
  }
  if (xreplies[0]) {
    at('recall', 2.6, (st) => {
      const w = xreplies[0].w
      st.feed('brain', `gbrain: ${w.name} never contacted — lead helpful, no link`, 'info', `threads/x-${slug(w.name)}`)
    })
  }
  at('recall', 3.1, (st) => {
    st.emit({ type: 'handoff', from: 'brain', to: 'voice' })
    st.emit({ type: 'pulse', squad: 'brain' })
  })

  // ======================================================== DRAFT
  const nDrafts = pitches.length + xreplies.length + (postDraft ? 1 : 0)
  at('draft', 0, (st) => {
    st.emit({ type: 'phase', phase: 'draft', loop })
    st.emit({ type: 'pulse', squad: 'voice' })
    st.emit({ type: 'handoff', from: 'brain', to: 'voice' })
    crew(
      st,
      r,
      {
        voice: `Drafting ${pitches.length} pitches in founder voice`,
        coach: 'Scoring drafts vs voice fingerprint',
        press: `Queueing ${pitches.length} pitches`,
        community: `Queueing ${xreplies.length} X replies`,
      },
      { scout: 'Watching for new threads', operator: 'Warming up browser' },
    )
  })
  pitches.forEach((p, i) => {
    at('draft', 0.5 + i * 0.85, (st) => {
      const kind = p.d.voice === 'company' ? 'company voice' : 'voice match'
      st.feed('voice', `Voice drafted pitch to ${p.w.name} · ${Math.round(p.d.voiceMatch * 100)}% ${kind}`, 'info', p.d.subject ? `“${clip(p.d.subject, 80)}”` : undefined)
      st.emit({ type: 'handoff', from: 'voice', to: 'press' })
    })
  })
  at('draft', 2.5, (st) => st.squad('voice', { task: `Drafting ${xreplies.length} X replies · helpful-first` }))
  if (xreplies.length) {
    at('draft', 3.2, (st) => {
      const avg = xreplies.reduce((a, x) => a + x.d.voiceMatch, 0) / xreplies.length
      st.feed('voice', `Voice drafted ${xreplies.length} X replies · ${Math.round(avg * 100)}% avg voice match`, 'info', `to ${xreplies[0].w.name}: “${clip(xreplies[0].d.text, 80)}”`)
      st.emit({ type: 'handoff', from: 'voice', to: 'community' })
    })
  }
  if (postDraft) {
    at('draft', 4.0, (st) => {
      st.feed('voice', `Company voice drafted a post for @viewfy_ai`, 'info', `“${clip(postDraft.text, 90)}”`)
      st.emit({ type: 'handoff', from: 'voice', to: 'community' })
    })
  }
  at('draft', 4.6, (st) => {
    st.squad('voice', { task: `${nDrafts} drafts ready · you approve before send`, done: st.state().squads.voice.done + nDrafts })
    st.emit({ type: 'handoff', from: 'voice', to: 'operator' })
  })

  // ======================================================== ACT
  const impTotal = int(r, 2000, 9000) + lvl * 150
  const nTransmits = pitches.length + xreplies.length + (postDraft ? 1 : 0)
  const impShare = Math.round(impTotal / Math.max(1, nTransmits))

  // computer-use jobs: an X reply (with the post as context) then a Gmail pitch
  const opReply = xreplies.find((x) => !isAmbient(x.w.node.id)) ?? xreplies[0]
  const opPitch =
    pitches.find((p) => p.w.node.kind === 'journalist' && !isAmbient(p.w.node.id)) ??
    pitches.find((p) => !isAmbient(p.w.node.id)) ??
    pitches[0]
  const jobsSrc: { app: 'x' | 'gmail'; w: Who; d: Draft }[] = []
  if (opReply) jobsSrc.push({ app: 'x', w: opReply.w, d: opReply.d })
  if (opPitch) jobsSrc.push({ app: 'gmail', w: opPitch.w, d: opPitch.d })
  const HOLD = 0.45
  const LEAD = 0.35
  const budget = PHASE_DUR.act - LEAD - HOLD * jobsSrc.length - 0.25
  const totalChars = jobsSrc.reduce((a, j) => a + j.d.text.length, 0)
  const cps = Math.max(45, totalChars / Math.max(1, budget))
  const jobs: ComputerJob[] = []
  {
    let t = LEAD
    for (const j of jobsSrc) {
      const dur = j.d.text.length / cps
      jobs.push({
        start: t,
        end: t + dur,
        app: j.app,
        to: j.app === 'x' ? j.w.name : j.w.email,
        subject: j.app === 'gmail' ? j.d.subject : undefined,
        context: j.app === 'x' ? (j.w.post ?? `${j.w.name} asked about ${j.w.topic}`) : j.w.signalTitle ? `re: ${j.w.signalTitle}` : undefined,
        text: j.d.text,
        nodeId: j.w.node.id,
      })
      t += dur + HOLD
    }
  }
  const byOperator = new Set(jobs.map((j) => j.nodeId))

  at('act', 0, (st) => {
    st.emit({ type: 'phase', phase: 'act', loop })
    st.emit({ type: 'pulse', squad: 'operator' })
    st.emit({ type: 'handoff', from: 'voice', to: 'operator' })
    crew(
      st,
      r,
      {
        operator: 'Opening X in the browser',
        press: `Sending ${pitches.length} pitches`,
        community: `Replying on X · ${xreplies.length} threads`,
      },
      { voice: 'Drafts shipped', scout: 'Watching for new threads', coach: 'Waiting for outcomes' },
    )
  })
  jobs.forEach((j) => {
    at('act', j.start, (st) => {
      st.squad('operator', { task: j.app === 'x' ? `Typing X reply to ${j.to}` : `Typing Gmail pitch to ${W.get(j.nodeId)?.name ?? j.to}` })
      st.emit({ type: 'pulse', squad: 'operator' })
    })
    at('act', j.end + 0.05, (st) => {
      const w = W.get(j.nodeId)!
      st.emit({ type: 'transmit', from: 'operator', to: j.nodeId, kind: j.app === 'x' ? 'reply' : 'pitch' })
      st.node(j.nodeId, 'contacted')
      st.kpi(j.app === 'x' ? { xReplies: 1, impressions: impShare } : { pitches: 1, impressions: impShare })
      st.squad('operator', { done: st.state().squads.operator.done + 1 })
      if (j.app === 'x') st.feed('operator', `Replied to ${w.name} on X`, 'act', `“${clip(j.text, 90)}”`)
      else st.feed('operator', `Operator sent pitch → ${w.full}`, 'act', j.subject ? `“${clip(j.subject, 80)}”` : undefined)
    })
  })
  const others = [
    ...pitches.filter((p) => !byOperator.has(p.w.node.id)).map((p) => ({ ...p, kind: 'pitch' as const })),
    ...xreplies.filter((x) => !byOperator.has(x.w.node.id)).map((x) => ({ ...x, kind: 'reply' as const })),
  ]
  const order = shuffle(r, others)
  order.forEach((o, i) => {
    const t = 0.9 + (i + 0.5) * (6.2 / Math.max(1, order.length)) + (r() - 0.5) * 0.3
    at('act', t, (st) => {
      const from: SquadId = o.kind === 'pitch' ? 'press' : 'community'
      st.emit({ type: 'transmit', from, to: o.w.node.id, kind: o.kind })
      st.node(o.w.node.id, 'contacted')
      st.kpi(o.kind === 'pitch' ? { pitches: 1, impressions: impShare } : { xReplies: 1, impressions: impShare })
      st.squad(from, { done: st.state().squads[from].done + 1 })
      if (o.kind === 'pitch') st.feed('press', `Pitched ${o.w.full}`, 'act', o.d.subject ? `“${clip(o.d.subject, 80)}”` : undefined)
      else st.feed('community', `Replied to ${o.w.name} on X · ${o.w.topic}`, 'act', `“${clip(o.d.text, 90)}”`)
    })
  })
  if (postDraft) {
    at('act', 5.6, (st) => {
      st.squad('community', { task: 'Posting on @viewfy_ai' })
      const aud = postAudience.length ? postAudience : sample(r, s.market.filter((n) => n.kind === 'community'), 3)
      aud.forEach((n) => st.emit({ type: 'transmit', from: 'community', to: n.id, kind: 'post' }))
      st.kpi({ posts: 1, impressions: impShare })
      st.feed('community', 'Posted on X as @viewfy_ai', 'act', `“${clip(postDraft.text, 90)}”`)
    })
  }
  at('act', 7.6, (st) => st.emit({ type: 'pulse', squad: 'operator' }))

  // ======================================================== MEASURE
  at('measure', 0, (st) => {
    st.emit({ type: 'phase', phase: 'measure', loop })
    st.emit({ type: 'pulse', squad: 'community' })
    crew(
      st,
      r,
      {
        community: `Counting likes on ${xreplies.length} replies`,
        press: 'Watching inbox for replies',
        coach: 'Scoring outcomes · reward model',
      },
      { operator: 'Browser parked', voice: 'Standing by', scout: 'Watching for new threads' },
    )
  })
  type Resp = { w: Who; kind: 'reply' | 'like' | 'meeting'; follow?: boolean }
  const resp: Resp[] = [
    ...repliers.map((w) => ({ w, kind: 'reply' as const })),
    ...likeTargets.map((w) => ({ w, kind: 'like' as const })),
  ]
  if (followUp) resp.push({ w: followUp, kind: 'reply', follow: true })
  const respOrder = shuffle(r, resp)
  if (meetingWho) respOrder.push({ w: meetingWho, kind: 'meeting' })
  respOrder.forEach((x, i) => {
    const t = 0.35 + (i + 0.3) * (3.7 / Math.max(1, respOrder.length))
    at('measure', t, (st) => {
      const w = x.w
      st.emit({ type: 'response', from: w.node.id, kind: x.kind })
      if (x.kind === 'reply') {
        st.node(w.node.id, 'replied')
        st.kpi({ repliesIn: 1, memories: 1 })
        st.emit({ type: 'memory', count: 1 })
        const pool = REPLIES[w.node.kind]
        st.feed(
          w.node.kind === 'community' ? 'community' : 'press',
          `↩ ${w.name} replied: '${pick(r, pool)}'`,
          'success',
          x.follow ? 'follow-up from an earlier loop' : undefined,
        )
      } else if (x.kind === 'like') {
        const likes = int(r, 6, 22) + lvl
        st.kpi({ impressions: likes * int(r, 40, 90) })
        st.feed('community', `❤ ${likes} likes on reply to ${w.name}`, 'success')
      } else {
        st.node(w.node.id, 'meeting')
        st.kpi({ meetings: 1, memories: 1 })
        st.emit({ type: 'memory', count: 1 })
        if (w.node.kind === 'community') st.feed('community', `📅 Demo call booked with ${w.name} · ${pick(r, MEET_SLOTS)}`, 'success', 'came from an X reply · gbrain updated')
        else st.feed('press', `📅 Meeting booked: ${w.full} · ${pick(r, MEET_SLOTS)}`, 'success', 'added to your calendar · gbrain updated')
        st.emit({ type: 'pulse', squad: 'press' })
      }
    })
  })
  at('measure', 4.15, (st) => {
    const m = meetingWho ? 1 : 0
    st.squad('coach', { task: `Reply rate ${pct(newRate)} · ${nReplies + (followUp ? 1 : 0)} replies · ${m} meeting${m === 1 ? '' : 's'}` })
    st.emit({ type: 'handoff', from: 'community', to: 'coach' })
    st.emit({ type: 'handoff', from: 'press', to: 'coach' })
  })

  // ======================================================== LEARN
  const memItems: { text: string; source: string }[] = []
  for (const w of repliers.slice(0, 2)) {
    if (w.node.kind === 'community') memItems.push({ source: `threads/x-${slug(w.name)}`, text: `threads/x-${slug(w.name)} — replied to our ${w.topic} answer (loop ${loop})` })
    else memItems.push({ source: `people/${slug(w.name)}`, text: `people/${slug(w.name)} — replied positive to ${pick(r, ANGLES)} pitch (loop ${loop})` })
  }
  if (meetingWho) memItems.push({ source: `people/${slug(meetingWho.name)}`, text: `people/${slug(meetingWho.name)} — meeting booked after ${pick(r, ANGLES)} pitch (loop ${loop})` })
  if (sigs[0]) {
    const t = who(sigs[0]).signalTitle ?? who(sigs[0]).topic
    memItems.push({ source: `signals/${slug(t)}`, text: `signals/${slug(t)} — used as news hook in ${Math.max(1, pitches.length - 1)} pitches` })
  }
  memItems.push({ source: `lessons/${slug(notes[0])}`, text: `lessons/${slug(notes[0])} — ${notes[0]}` })
  memItems.push({ source: `loops/loop-${loop}`, text: `loops/loop-${loop} — reply rate ${pct(newRate)}, ${meetingWho ? 1 : 0} meeting, ${nTransmits} sends` })

  at('learn', 0, (st) => {
    st.emit({ type: 'phase', phase: 'learn', loop })
    st.emit({ type: 'pulse', squad: 'coach' })
    crew(
      st,
      r,
      { coach: `Writing ${memAdd} memories to gbrain`, voice: 'Queueing RL update · River' },
      { operator: 'Browser parked', press: 'Inbox zero', community: 'Standing by', scout: 'Watching for new threads' },
    )
  })
  at('learn', 0.5, (st) => {
    st.emit({ type: 'handoff', from: 'coach', to: 'brain' })
    st.emit({ type: 'memory', count: memAdd })
    st.kpi({ memories: memAdd })
    st.addMemories(memItems)
    st.feed('coach', `+${memAdd} memories → gbrain`, 'learn', memItems[0]?.text)
  })
  at('learn', 1.6, (st) => {
    st.squad('coach', { task: 'Saving workflow to Memorable' })
    const list = st.state().workflows.slice()
    if (wfUsed) {
      const i = list.findIndex((w) => w.id === wfUsed.id)
      const used = pitches.length + xreplies.length
      if (i >= 0) {
        if (newVersion) {
          const nv: Workflow = { id: `wf-${loop}`, name: bumpVersion(list[i].name), winRate: Math.min(0.62, list[i].winRate + between(r, 0.015, 0.035)), uses: used, loop }
          list.splice(i, 1, nv)
          st.kpi({ workflows: 1 })
          st.feed('coach', 'Workflow saved → Memorable', 'learn', `${nv.name} · ${Math.round(nv.winRate * 100)}% win rate`)
        } else {
          list[i] = { ...list[i], uses: list[i].uses + used, winRate: Math.min(0.6, list[i].winRate + between(r, 0.003, 0.012)), loop }
          st.feed('coach', 'Workflow reinforced → Memorable', 'learn', `${list[i].name} · ${Math.round(list[i].winRate * 100)}% win rate · ${list[i].uses} uses`)
        }
      }
      // the X reply workflow gets used every loop too
      const xi = list.findIndex((w) => w.name.startsWith('X reply'))
      if (xi >= 0 && xi !== i) list[xi] = { ...list[xi], uses: list[xi].uses + xreplies.length, loop }
      list.sort((a, b) => b.winRate - a.winRate)
      st.setWorkflows(list)
    }
    st.emit({ type: 'pulse', squad: 'coach' })
  })
  at('learn', 2.7, (st) => {
    st.squad('coach', { task: 'RL update → River' })
    st.squad('voice', { status: 'working', task: `Absorbing reward · voice ${pct(k.voiceMatch + voiceGain)}` })
    st.emit({ type: 'handoff', from: 'coach', to: 'voice' })
    st.kpi({ reward: rewardGain, voiceMatch: voiceGain })
    st.feed('coach', `RL reward +${(rewardDelta * 100).toFixed(1)}% → River`, 'learn', `voice match ${pct(k.voiceMatch + voiceGain)} · replies are the reward`)
  })
  at('learn', 3.4, (st) => {
    const hist = [...st.state().kpis.replyRateHistory, newRate].slice(-40)
    st.kpiSet({ replyRateHistory: hist })
    st.setLearned(summary)
    st.feed('coach', `Learned: ${notes[0]}`, 'learn', notes.slice(1).join(' · ') || undefined)
    st.postLearn({ loop, memories: memItems.map((m) => ({ text: m.text, source: m.source })), summary })
    st.emit({ type: 'pulse', squad: 'brain' })
  })
  at('learn', 4.45, (st) => {
    st.kpi({ loopsRun: 1 })
    st.squad('coach', { done: st.state().squads.coach.done + 1 })
    crew(st, r, {}, Object.fromEntries(SQUAD_ORDER.map((id) => [id, 'Sleeping until next hour'])))
    const next = new Date(st.state().nextHourlyRunAt)
    const hh = `${String(next.getHours()).padStart(2, '0')}:00`
    st.feed('brain', `Loop ${loop} done · reply rate ${pct(newRate)} · next hourly run ${hh}`, 'info')
    st.emit({ type: 'loopDone', summary })
  })

  beats.sort((a, b) => a.t - b.t || a.seq - b.seq)
  return { loop, beats, jobs, summary }
}

// ---------------------------------------------------------------- seeds (state before loop 38)

export const SEED_WORKFLOWS: Workflow[] = [
  { id: 'wf-news-jack', name: 'news-jack pitch · data angle v4', winRate: 0.38, uses: 41, loop: 36 },
  { id: 'wf-x-reply', name: 'X reply · helpful-first v3', winRate: 0.31, uses: 212, loop: 37 },
  { id: 'wf-publisher', name: 'publisher pitch · founder story v2', winRate: 0.24, uses: 18, loop: 33 },
  { id: 'wf-follow-up', name: 'follow-up after 5 days v2', winRate: 0.19, uses: 57, loop: 35 },
  { id: 'wf-launch', name: 'launch thread · build in public v1', winRate: 0.14, uses: 11, loop: 29 },
  { id: 'wf-podcast', name: 'podcast pitch · contrarian take v1', winRate: 0.12, uses: 6, loop: 31 },
]

export function seedMemories(data: DataBundle, now: number): MemoryItem[] {
  const t = data.targets
  const j = t.journalists
  const c = t.community
  const p = t.publishers
  const s = t.signals
  const nm = (x: { name: string } | undefined, fb: string) => slug(x?.name ?? fb)
  const raw: [string, string, number][] = [
    [`people/${nm(j[0], 'maya-chen')}`, `people/${nm(j[0], 'maya-chen')} — replied positive to data-angle pitch (loop 37)`, 37],
    ['lessons/lead-with-a-number', 'lessons/lead-with-a-number — 3/4 journalist replies had a stat in the subject', 37],
    [`threads/x-${slug(c[0]?.handle ?? 'jes')}`, `threads/x-${slug(c[0]?.handle ?? 'jes')} — liked our reply on ${c[0]?.topic ?? 'first users'} thread (loop 37)`, 37],
    ['loops/loop-37', 'loops/loop-37 — reply rate 9.4%, 1 meeting, 11 sends', 37],
    [`people/${nm(j[1], 'daniel-okafor')}`, `people/${nm(j[1], 'daniel-okafor')} — asked for the raw dataset (loop 36)`, 36],
    ['workflows/news-jack-pitch', 'workflows/news-jack-pitch — v4 won 3/4 replies', 36],
    [`companies/${slug(p[0]?.name ?? 'indie-hackers')}`, `companies/${slug(p[0]?.name ?? 'indie-hackers')} — open to guest posts with data (loop 35)`, 35],
    ['lessons/mornings-beat-evenings', 'lessons/mornings-beat-evenings — X replies before 11am got 1.8× likes', 34],
    [`signals/${slug(s[0]?.title ?? 'solo founders')}`, `signals/${slug(s[0]?.title ?? 'solo founders')} — hook used in 2 pitches (loop 33)`, 33],
    [`people/${nm(j[2], 'priya-raman')}`, `people/${nm(j[2], 'priya-raman')} — prefers founder stories over product news (loop 31)`, 31],
  ]
  return raw.map(([source, text, loop], i) => ({ id: `seed-${i}`, source, text, loop, at: now - (38 - loop) * 3_600_000 - i * 60_000 }))
}

/** Give the ring some history: contacted / replied / meeting nodes from earlier loops. */
export function seedMarketHistory(market: MarketNode[]): { id: string; state: MarketNodeState; loop: number }[] {
  const r = mulberry32(3737)
  const people = market.filter((n) => n.kind !== 'signal')
  const picks = shuffle(r, people).slice(0, 16)
  return picks.map((n, i) => ({
    id: n.id,
    state: (i < 2 ? 'meeting' : i < 7 ? 'replied' : 'contacted') as MarketNodeState,
    loop: 37 - (i % 3),
  }))
}

export function seedLearned(): LearnSummary {
  return {
    loop: 37,
    memoriesAdded: 14,
    workflowSaved: 'X reply · helpful-first v3',
    rewardDelta: 0.028,
    replyRate: 0.094,
    notes: ['Lead with a number — 3/4 replies did', 'Mornings beat evenings for X replies'],
  }
}
