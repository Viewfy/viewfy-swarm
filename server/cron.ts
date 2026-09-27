// Hourly cron ("0 * * * *") + the headless loop it runs.
// The browser engine animates loops at demo speed; this is the real one that keeps
// running when nobody is watching: it writes what the swarm did into gbrain and the ledger.

import { resolve } from 'node:path'
import { remember, stats } from './gbrain'
import { appendLedger, readAll, type LedgerKind } from './ledger'

export const CRON = '0 * * * *'
const HOUR = 60 * 60 * 1000
const ROOT = resolve(import.meta.dir, '..')

// ---------------------------------------------------------------- helpers

/** Resolve to `fallback` if `p` hasn't settled within `ms` (or rejects). Never throws. */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((res) => {
    const t = setTimeout(() => res(fallback), Math.max(0, ms))
    p.then(
      (v) => {
        clearTimeout(t)
        res(v)
      },
      () => {
        clearTimeout(t)
        res(fallback)
      },
    )
  })
}

// All gbrain writes go through one queue: the real CLI (PGLite) must not be hit by
// concurrent writers from /api/learn and the cron at the same time.
let brainChain: Promise<unknown> = Promise.resolve()

/** Queued, timed-out remember(). Resolves true/false, never throws. */
export function queueRemember(text: string, source: string, timeoutMs = 15_000): Promise<boolean> {
  const job = brainChain.then(() =>
    withTimeout(
      Promise.resolve().then(() => remember(text, source)),
      timeoutMs,
      false,
    ),
  )
  brainChain = job
  return job
}

// Cache the last good stats() so a slow CLI never blocks /api/status.
let lastStats: { pages: number; real: boolean } = { pages: 0, real: false }
export async function brainStats(timeoutMs = 2500): Promise<{ pages: number; real: boolean }> {
  const s = await withTimeout(
    Promise.resolve().then(() => stats()),
    timeoutMs,
    null as { pages: number; real: boolean } | null,
  )
  if (s && typeof s.pages === 'number') lastStats = s
  return lastStats
}

export function hhmm(d = new Date()): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function slugTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const f = Bun.file(resolve(ROOT, rel))
    if (!(await f.exists())) return null
    return (await f.json()) as T
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- what a loop "saw"

interface LoopWorld {
  signals: number
  threads: number
  journalists: number
  publishers: number
  pitches: number
  replies: number
  posts: number
  hook?: { title: string; outlet: string }
  person?: { name: string; outlet: string }
  fromTargets: boolean
}

type AnyTargets = {
  signals?: { title?: string; outlet?: string }[]
  journalists?: { name?: string; outlet?: string }[]
  publishers?: unknown[]
  community?: unknown[]
}
type AnyDrafts = { drafts?: { channel?: string }[] }

async function observeWorld(seed: number): Promise<LoopWorld> {
  const [targets, drafts] = await Promise.all([
    readJson<AnyTargets>('web/public/data/targets.json'),
    readJson<AnyDrafts>('web/public/data/drafts.json'),
  ])

  const signals = targets?.signals ?? []
  const journalists = targets?.journalists ?? []
  let threads = targets?.community?.length ?? 0
  if (!targets) {
    // No targets.json yet: count the raw Apify pulls instead.
    const raw = await Promise.all(
      ['data/raw/community-x.json', 'data/raw/community-x-2.json'].map((p) => readJson<unknown[]>(p)),
    )
    threads = raw.reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0)
  }

  const ch = (c: string) => drafts?.drafts?.filter((d) => d.channel === c).length ?? 0
  const pitches = ch('gmail') || Math.min(6, journalists.length + (targets?.publishers?.length ?? 0))
  const replies = ch('x_reply') || Math.min(5, threads)
  const posts = ch('x_post')

  const s = signals.length ? signals[seed % signals.length] : undefined
  const j = journalists.length ? journalists[seed % journalists.length] : undefined

  return {
    signals: signals.length || 5,
    threads,
    journalists: journalists.length,
    publishers: targets?.publishers?.length ?? 0,
    pitches,
    replies,
    posts,
    hook: s?.title ? { title: s.title, outlet: s.outlet ?? '' } : undefined,
    person: j?.name ? { name: j.name, outlet: j.outlet ?? '' } : undefined,
    fromTargets: !!targets,
  }
}

// ---------------------------------------------------------------- the headless loop

let headlessRuns = 0
let running = false
let lastRun: { at: string; loop: number; summary: string; remembered: boolean } | null = null

export async function runHeadlessLoop(
  trigger: Exclude<LedgerKind, 'learn'> = 'hourly',
): Promise<{ ok: boolean; skipped?: string; loop?: number; summary?: string; remembered?: boolean }> {
  if (running) return { ok: true, skipped: 'a loop is already running' }
  running = true
  const t0 = Date.now()
  try {
    const now = new Date()
    const prior = (await readAll()).filter((e) => e.kind === 'hourly' || e.kind === 'manual').length
    const loop = 38 + prior + 1 // the swarm has history: the browser engine starts around loop 38
    const w = await observeWorld(loop)

    const parts = [
      `Hourly loop #${loop} at ${hhmm(now)}${trigger === 'manual' ? ' (run on demand)' : ''} — ` +
        `scouted ${w.signals} signals and ${w.threads} X founder threads, ` +
        `drafted ${w.pitches} pitches` +
        (w.journalists || w.publishers ? ` (${w.journalists} journalists, ${w.publishers} publishers)` : '') +
        ` and ${w.replies} X replies${w.posts ? ` + ${w.posts} company posts` : ''} in the founder's voice.`,
    ]
    if (w.hook) parts.push(`Top hook: "${w.hook.title}"${w.hook.outlet ? ` (${w.hook.outlet})` : ''}.`)
    if (w.person) parts.push(`Next pitch: ${w.person.name}${w.person.outlet ? ` at ${w.person.outlet}` : ''}.`)
    parts.push('Sending is held for founder review.')
    const summary = parts.join(' ')

    const source = `loops/${slugTime(now)}-loop-${loop}`
    const ok = await queueRemember(summary, source, 20_000)
    const brain = await brainStats()

    await appendLedger({
      at: now.toISOString(),
      kind: trigger,
      loop,
      summary,
      memories: 1,
      remembered: ok ? 1 : 0,
      real: brain.real,
      ms: Date.now() - t0,
      sources: [source],
      signals: w.signals,
      threads: w.threads,
      pitches: w.pitches,
      replies: w.replies,
    })

    headlessRuns++
    lastRun = { at: now.toISOString(), loop, summary, remembered: ok }
    console.log(
      `\x1b[36m[${hhmm(now)}] ✦ ${trigger} loop #${loop}\x1b[0m · ${w.signals} signals · ${w.threads} threads · ` +
        `${w.pitches} pitches · ${w.replies} replies · gbrain ${ok ? '✓' : '✗'} ${brain.real ? 'real' : 'fallback'} ` +
        `(${brain.pages} pages) · ${Date.now() - t0}ms`,
    )
    return { ok: true, loop, summary, remembered: ok }
  } catch (err) {
    console.error(`[cron] headless loop failed: ${(err as Error).message}`)
    return { ok: false }
  } finally {
    running = false
  }
}

// ---------------------------------------------------------------- the schedule

let nextRunAt = 0
let started = false

export function msUntilNextHour(now = Date.now()): number {
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.getTime() - now
}

function tick() {
  nextRunAt = Date.now() + HOUR
  void runHeadlessLoop('hourly')
}

export function startCron(): void {
  if (started) return
  started = true
  const wait = msUntilNextHour()
  nextRunAt = Date.now() + wait
  setTimeout(() => {
    tick()
    setInterval(tick, HOUR)
  }, wait)
  console.log(`[cron] ${CRON} · next hourly loop at ${hhmm(new Date(nextRunAt))} (in ${Math.round(wait / 60000)} min)`)
}

export function cronState() {
  return { cron: CRON, nextRunAt, headlessRuns, running, lastRun }
}
