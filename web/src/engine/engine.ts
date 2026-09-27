// The loop engine: drives the hourly GTM loop (Sense → Recall → Draft → Act → Measure → Learn).
// Public API (keep stable): initEngine(), runLoopNow(), setRunning(), setSpeed()
//
// Time runs on a 50ms setInterval using real elapsed time × speed (no rAF, so it also runs in Bun).
// Each tick batches every state change into ONE useSwarm.setState, then emits bus events.
import { bus, useSwarm } from './store'
import type { ComputerUseState, DataBundle, EngineState, FeedItem, Kpis, MarketNodeState, SquadId, SwarmEvent } from './types'
import { buildMarket } from './market'
import {
  LOOP_LEN,
  PHASE_DUR,
  PHASE_ORDER,
  PHASE_START,
  SEED_WORKFLOWS,
  SLEEP_LEN,
  buildLoop,
  seedLearned,
  seedMarketHistory,
  seedMemories,
  type LoopScript,
  type Stage,
} from './scenario'
import { fallbackData, loadData } from '../data/load'

const TICK_MS = 50
const FEED_CAP = 60
const MEMORY_CAP = 50
const FIRST_LOOP_DELAY = 1.5 // real seconds after init

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

function nextTopOfHour(): number {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.getTime()
}

// ---------------------------------------------------------------- engine-private runtime

let initPromise: Promise<void> | null = null
let timer: ReturnType<typeof setInterval> | null = null
let lastT = 0
let mode: 'sleep' | 'loop' = 'sleep'
let clock = 0 // seconds into the current loop (speed-scaled)
let sleepLeft = 0 // seconds (speed-scaled) until the next loop may start
let firstKickAt = 0 // real ms: the very first loop starts ~1.5s after init regardless of speed
let script: LoopScript | null = null
let beatIdx = 0
let pendingRun = false
let feedSeq = 0
let memSeq = 0
let reloading = false
/** loop in which each node last changed state — used to fade old outreach back to dormant */
const nodeLoop = new Map<string, number>()

// ---------------------------------------------------------------- transaction: batch a tick into one setState

type NumKpi = Exclude<keyof Kpis, 'replyRateHistory'>

class Tx implements Stage {
  private p: Partial<EngineState> = {}
  private cloned = new Set<keyof EngineState>()
  private events: SwarmEvent[] = []
  private base: EngineState
  constructor(base: EngineState) {
    this.base = base
  }

  get<K extends keyof EngineState>(k: K): EngineState[K] {
    return (k in this.p ? this.p[k] : this.base[k]) as EngineState[K]
  }
  set<K extends keyof EngineState>(k: K, v: EngineState[K]) {
    if (this.get(k) !== v) (this.p as Record<string, unknown>)[k] = v
  }
  private mut<K extends 'feed' | 'market' | 'memories' | 'workflows'>(k: K): EngineState[K] {
    if (!this.cloned.has(k)) {
      this.cloned.add(k)
      ;(this.p as Record<string, unknown>)[k] = this.get(k).slice()
    }
    return this.p[k] as EngineState[K]
  }
  private mutObj<K extends 'squads' | 'kpis'>(k: K): EngineState[K] {
    if (!this.cloned.has(k)) {
      this.cloned.add(k)
      ;(this.p as Record<string, unknown>)[k] = { ...this.get(k) }
    }
    return this.p[k] as EngineState[K]
  }

  // ---- Stage API
  state(): EngineState {
    return { ...this.base, ...this.p }
  }
  feed(squad: SquadId | 'brain', text: string, tone: FeedItem['tone'], detail?: string) {
    const f = this.mut('feed')
    f.unshift({ id: `f${++feedSeq}`, at: Date.now(), loop: this.get('loop'), squad, text, detail, tone })
    if (f.length > FEED_CAP) f.length = FEED_CAP
  }
  squad(id: SquadId, patch: Partial<EngineState['squads'][SquadId]>) {
    const s = this.mutObj('squads')
    s[id] = { ...s[id], ...patch }
  }
  node(id: string, state: MarketNodeState) {
    const m = this.get('market')
    const i = m.findIndex((n) => n.id === id)
    if (i < 0 || m[i].state === state) return
    const mm = this.mut('market')
    mm[i] = { ...mm[i], state }
    nodeLoop.set(id, this.get('loop'))
  }
  kpi(delta: Partial<Record<NumKpi, number>>) {
    const k = this.mutObj('kpis')
    for (const key in delta) {
      const kk = key as NumKpi
      let v = k[kk] + (delta[kk] ?? 0)
      if (kk === 'voiceMatch') v = Math.min(0.975, v)
      if (kk === 'reward') v = Math.min(0.95, v)
      k[kk] = v
    }
  }
  kpiSet(patch: Partial<Kpis>) {
    Object.assign(this.mutObj('kpis'), patch)
  }
  emit(e: SwarmEvent) {
    this.events.push(e)
  }
  addMemories(items: { text: string; source: string }[]) {
    const m = this.mut('memories')
    const loop = this.get('loop')
    const t = Date.now()
    m.unshift(...items.map((x, i) => ({ id: `m${++memSeq}`, text: x.text, source: x.source, at: t - i, loop })))
    if (m.length > MEMORY_CAP) m.length = MEMORY_CAP
  }
  setWorkflows(list: EngineState['workflows']) {
    this.cloned.add('workflows')
    this.p.workflows = list
  }
  setLearned(s: EngineState['lastLearned']) {
    this.p.lastLearned = s
  }
  postLearn(body: unknown) {
    try {
      if (typeof fetch !== 'function') return
      void fetch('/api/learn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
    } catch {
      /* server may be down: fire and forget */
    }
  }

  commit() {
    if (Object.keys(this.p).length) useSwarm.setState(this.p)
    for (const e of this.events) {
      try {
        bus.emit(e)
      } catch (err) {
        console.error('[engine] bus listener failed', err)
      }
    }
  }
}

// ---------------------------------------------------------------- data

function applyData(data: DataBundle) {
  const s = useSwarm.getState()
  useSwarm.setState({ data, market: buildMarket(data, s.market) })
}

function reloadData() {
  if (reloading) return
  reloading = true
  loadData()
    .then(applyData)
    .catch(() => {})
    .finally(() => {
      reloading = false
    })
}

// ---------------------------------------------------------------- loop control

function fadeMarket(tx: Tx, loop: number) {
  for (const n of tx.get('market')) {
    const since = loop - (nodeLoop.get(n.id) ?? loop - 3)
    if (n.state === 'found' && since >= 1) tx.node(n.id, 'dormant')
    else if (n.state === 'contacted' && since >= 3) tx.node(n.id, 'dormant')
    else if (n.state === 'replied' && since >= 7) tx.node(n.id, 'dormant')
  }
}

function startLoop(tx: Tx) {
  const s = tx.state()
  const first = !s.inLoop && s.kpis.loopsRun < s.loop // loop N not run yet → run it; else next
  const loop = first ? s.loop : s.loop + 1
  tx.set('loop', loop)
  fadeMarket(tx, loop)
  const data = s.data ?? fallbackData()
  script = buildLoop(loop, tx.state(), data)
  beatIdx = 0
  clock = 0
  mode = 'loop'
  pendingRun = false
  tx.set('inLoop', true)
  tx.set('phase', 'sense')
  tx.set('phaseProgress', 0)
  tx.set('loopProgress', 0)
  reloadData() // late-arriving /data files show up next loop without a refresh
}

function finishLoop(tx: Tx) {
  // fire anything left (e.g. after a huge time jump)
  runBeats(tx, Infinity)
  mode = 'sleep'
  sleepLeft = pendingRun ? 0 : SLEEP_LEN
  script = null
  tx.set('inLoop', false)
  tx.set('phase', 'learn')
  tx.set('phaseProgress', 1)
  tx.set('loopProgress', 1)
  const c = tx.get('computer')
  if (c.active) tx.set('computer', { ...c, active: false })
}

function runBeats(tx: Tx, upTo: number) {
  if (!script) return
  const beats = script.beats
  while (beatIdx < beats.length && beats[beatIdx].t <= upTo) {
    const b = beats[beatIdx++]
    try {
      b.run(tx)
    } catch (err) {
      console.error('[engine] beat failed', err)
    }
  }
}

function updateComputer(tx: Tx) {
  const prev = tx.get('computer')
  const actStart = PHASE_START.act
  const actEnd = actStart + PHASE_DUR.act
  if (!script || clock < actStart || clock >= actEnd || !script.jobs.length) {
    if (prev.active) tx.set('computer', { ...prev, active: false })
    return
  }
  const t = clock - actStart
  const jobs = script.jobs
  let j = jobs[0]
  for (const x of jobs) if (t >= x.start) j = x
  const dur = Math.max(0.01, j.end - j.start)
  const frac = Math.max(0, Math.min(1, (t - j.start) / dur))
  const typed = Math.round(frac * j.text.length)
  const status: ComputerUseState['status'] = t >= j.end ? 'sent' : 'typing'
  if (prev.active && prev.text === j.text && prev.typed === typed && prev.status === status) return
  tx.set('computer', {
    active: true,
    app: j.app,
    to: j.to,
    subject: j.subject,
    context: j.context,
    text: j.text,
    typed,
    status,
  })
}

function tick() {
  const t = nowMs()
  const dtReal = Math.min(1, Math.max(0, (t - lastT) / 1000))
  lastT = t
  const s = useSwarm.getState()
  const dt = dtReal * Math.max(0, s.speed)
  const tx = new Tx(s)

  if (Date.now() >= s.nextHourlyRunAt) tx.set('nextHourlyRunAt', nextTopOfHour())

  if (mode === 'sleep') {
    if (firstKickAt) {
      if (Date.now() >= firstKickAt || pendingRun) {
        firstKickAt = 0
        if (s.running || pendingRun) startLoop(tx)
      }
    } else {
      sleepLeft -= dt
      if (pendingRun || (s.running && sleepLeft <= 0)) startLoop(tx)
    }
  } else {
    clock += dt
  }

  if (mode === 'loop' && script) {
    runBeats(tx, clock)
    const c = Math.min(clock, LOOP_LEN)
    let pi = 0
    for (let i = 0; i < PHASE_ORDER.length; i++) if (c >= PHASE_START[PHASE_ORDER[i]]) pi = i
    const phase = PHASE_ORDER[pi]
    tx.set('phase', phase)
    tx.set('phaseProgress', Math.min(1, (c - PHASE_START[phase]) / PHASE_DUR[phase]))
    tx.set('loopProgress', Math.min(1, c / LOOP_LEN))
    updateComputer(tx)
    if (clock >= LOOP_LEN) finishLoop(tx)
  }

  tx.commit()
}

// ---------------------------------------------------------------- public API

export function initEngine(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    let data: DataBundle
    try {
      data = await loadData()
    } catch {
      data = fallbackData()
    }
    const s = useSwarm.getState()
    const now = Date.now()
    let market = buildMarket(data, s.market)
    const hist = seedMarketHistory(market)
    const hm = new Map(hist.map((h) => [h.id, h]))
    market = market.map((n) => (hm.has(n.id) ? { ...n, state: hm.get(n.id)!.state } : n))
    for (const h of hist) nodeLoop.set(h.id, h.loop)

    const prevLoop = s.loop - 1
    const seedFeed: FeedItem[] = [
      { id: `f${++feedSeq}`, at: now - 4_000, loop: prevLoop, squad: 'brain', text: `Run ${prevLoop} done · reply rate 9.4% · 1 meeting booked`, tone: 'info' },
      { id: `f${++feedSeq}`, at: now - 9_000, loop: prevLoop, squad: 'coach', text: 'Performance score +2.8% → River', detail: 'replies are the reward', tone: 'learn' },
      { id: `f${++feedSeq}`, at: now - 14_000, loop: prevLoop, squad: 'coach', text: '+14 CRM notes → gbrain', tone: 'learn' },
    ]

    useSwarm.setState({
      ready: true,
      data,
      market,
      memories: seedMemories(data, now),
      workflows: SEED_WORKFLOWS.slice(),
      lastLearned: seedLearned(),
      feed: seedFeed,
      inLoop: false,
      phase: 'sense',
      phaseProgress: 0,
      loopProgress: 0,
      nextHourlyRunAt: nextTopOfHour(),
      kpis: { ...s.kpis, voiceMatch: Math.max(s.kpis.voiceMatch, Math.min(0.95, data.training.voiceMatch || 0)) },
      squads: Object.fromEntries(
        Object.entries(s.squads).map(([id, sq]) => [id, { ...sq, status: 'idle', task: 'Idle · next run on the hour', done: 40 + ((id.length * 37) % 60) * 3 }]),
      ) as EngineState['squads'],
    })

    mode = 'sleep'
    firstKickAt = Date.now() + FIRST_LOOP_DELAY * 1000
    lastT = nowMs()
    if (!timer) timer = setInterval(tick, TICK_MS)
  })()
  return initPromise
}

/** Start a loop now (skips the "sleeping until next hour" gap). */
export function runLoopNow(): void {
  if (!initPromise) void initEngine()
  pendingRun = true
  if (mode === 'sleep') sleepLeft = 0
}

export function setRunning(running: boolean): void {
  useSwarm.setState({ running })
}

export function setSpeed(speed: number): void {
  const v = Number.isFinite(speed) ? Math.max(0.1, Math.min(20, speed)) : 1
  useSwarm.setState({ speed: v })
}

/** Stop the timer (tests / HMR). */
export function stopEngine(): void {
  if (timer) clearInterval(timer)
  timer = null
}

// Vite HMR: don't leave a stale interval running when this module is replaced.
const hot = (import.meta as unknown as { hot?: { dispose(cb: () => void): void } }).hot
if (hot) hot.dispose(stopEngine)
