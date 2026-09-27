// Viewfy Swarm API (Bun.serve). Vite proxies /api here in dev.
// Rule #1: this process never crashes. Every handler is wrapped, every brain call is timed out.

import { recent, search } from './gbrain'
import { appendLedger, readLedger } from './ledger'
import { brainStats, cronState, hhmm, queueRemember, runHeadlessLoop, startCron, withTimeout } from './cron'

const port = Number(process.env.PORT ?? 8787)
const startedAt = Date.now()

const LEARN_RESPOND_MS = 3000 // answer /api/learn within ~3s, keep writing in the background
const LEARN_TOTAL_MS = 90_000 // overall budget for one learn batch
const MAX_MEMORIES = 50

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

function intParam(url: URL, name: string, def: number, min: number, max: number): number {
  const n = Number.parseInt(url.searchParams.get(name) ?? '', 10)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def
}

// ---------------------------------------------------------------- handlers

async function status(): Promise<Response> {
  const c = cronState()
  return json({
    ok: true,
    startedAt,
    nextRunAt: c.nextRunAt,
    cron: c.cron,
    headlessRuns: c.headlessRuns,
    running: c.running,
    lastRun: c.lastRun,
    brain: await brainStats(),
  })
}

interface LearnBody {
  loop?: number
  memories?: { text?: unknown; source?: unknown }[]
  summary?: string
}

async function learn(req: Request): Promise<Response> {
  let body: LearnBody
  try {
    body = (await req.json()) as LearnBody
  } catch {
    return json({ ok: false, error: 'body must be JSON: { loop, memories: [{ text, source }], summary? }' }, 400)
  }
  const loop = typeof body.loop === 'number' ? body.loop : undefined
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 2000) : undefined
  const memories = (Array.isArray(body.memories) ? body.memories : [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(0, MAX_MEMORIES)
    .map((m, i) => ({
      text: String(m.text).slice(0, 4000),
      source: typeof m.source === 'string' && m.source.trim() ? m.source.trim() : `loops/loop-${loop ?? 'x'}-${i + 1}`,
    }))

  const t0 = Date.now()
  let done = 0
  let remembered = 0

  // Serial writes with an overall deadline. Runs to completion in the background.
  const job = (async () => {
    const deadline = t0 + LEARN_TOTAL_MS
    const sources: string[] = []
    for (const m of memories) {
      const left = deadline - Date.now()
      if (left <= 0) break
      const ok = await queueRemember(m.text, m.source, Math.min(left, 20_000))
      done++
      if (ok) {
        remembered++
        sources.push(m.source)
      }
    }
    const brain = await brainStats()
    await appendLedger({
      at: new Date(t0).toISOString(),
      kind: 'learn',
      loop,
      summary,
      memories: memories.length,
      remembered,
      real: brain.real,
      ms: Date.now() - t0,
      sources,
    })
    console.log(
      `\x1b[35m[${hhmm()}] ✦ learn loop #${loop ?? '?'}\x1b[0m · ${remembered}/${memories.length} remembered · ` +
        `gbrain ${brain.real ? 'real' : 'fallback'} (${brain.pages} pages) · ${Date.now() - t0}ms`,
    )
    return true
  })().catch((err) => {
    console.error(`[learn] background job failed: ${(err as Error).message}`)
    return false
  })

  const finished = await withTimeout(job, LEARN_RESPOND_MS, false)
  return json({
    ok: true,
    remembered,
    total: memories.length,
    pending: finished ? 0 : memories.length - done,
    background: !finished,
  })
}

async function brainSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = intParam(url, 'limit', 5, 1, 25)
  const brain = await brainStats()
  if (!q) return json({ real: brain.real, hits: [] })
  const hits = await withTimeout(
    Promise.resolve().then(() => search(q, limit)),
    5000,
    [],
  )
  return json({ real: brain.real, q, hits: Array.isArray(hits) ? hits.slice(0, limit) : [] })
}

async function brainRecent(url: URL): Promise<Response> {
  const limit = intParam(url, 'limit', 10, 1, 50)
  const [brain, hits] = await Promise.all([
    brainStats(),
    withTimeout(
      Promise.resolve().then(() => recent(limit)),
      5000,
      [],
    ),
  ])
  return json({ real: brain.real, hits: Array.isArray(hits) ? hits.slice(0, limit) : [] })
}

async function ledger(url: URL): Promise<Response> {
  const limit = intParam(url, 'limit', 20, 1, 500)
  const { total, entries } = await readLedger(limit)
  return json({ ok: true, total, entries })
}

async function runNow(): Promise<Response> {
  const job = runHeadlessLoop('manual')
  const res = await withTimeout(job, LEARN_RESPOND_MS, null)
  if (!res) return json({ ok: true, started: true, background: true })
  return json({ ...res, started: !res.skipped, background: false })
}

// ---------------------------------------------------------------- router

async function route(req: Request, url: URL): Promise<Response> {
  const { pathname: p } = url
  const m = req.method
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (m === 'GET' && (p === '/api/status' || p === '/api' || p === '/api/')) return status()
  if (m === 'POST' && p === '/api/learn') return learn(req)
  if (m === 'GET' && p === '/api/brain/search') return brainSearch(url)
  if (m === 'GET' && p === '/api/brain/recent') return brainRecent(url)
  if (m === 'GET' && p === '/api/ledger') return ledger(url)
  if ((m === 'POST' || m === 'GET') && p === '/api/run') return runNow()
  return json({ ok: false, error: `no route: ${m} ${p}` }, 404)
}

const server = Bun.serve({
  port,
  idleTimeout: 30,
  async fetch(req) {
    const t0 = performance.now()
    let url: URL
    let res: Response
    try {
      url = new URL(req.url)
    } catch {
      return json({ ok: false, error: 'bad url' }, 400)
    }
    try {
      res = await route(req, url)
    } catch (err) {
      console.error(`[api] ${req.method} ${url.pathname} failed: ${(err as Error)?.stack ?? err}`)
      res = json({ ok: false, error: (err as Error)?.message ?? 'internal error' }, 500)
    }
    if (req.method !== 'OPTIONS') {
      const ms = (performance.now() - t0).toFixed(0)
      const color = res.status >= 500 ? 31 : res.status >= 400 ? 33 : 32
      console.log(`\x1b[2m[${hhmm()}]\x1b[0m ${req.method.padEnd(4)} ${url.pathname}${url.search} \x1b[${color}m${res.status}\x1b[0m ${ms}ms`)
    }
    return res
  },
  error(err) {
    console.error(`[api] unhandled: ${err?.stack ?? err}`)
    return json({ ok: false, error: 'internal error' }, 500)
  },
})

process.on('uncaughtException', (err) => console.error(`[api] uncaughtException: ${err?.stack ?? err}`))
process.on('unhandledRejection', (err) => console.error(`[api] unhandledRejection: ${(err as Error)?.stack ?? err}`))

startCron()
console.log(`\x1b[1m✦ viewfy swarm api\x1b[0m on http://localhost:${server.port} · cron ${cronState().cron}`)
