// gbrain adapter: shells out to the real gbrain CLI (github.com/garrytan/gbrain, PGLite, keyless).
// The brain lives in the repo: GBRAIN_HOME=<repo>/data/brain  ->  data/brain/.gbrain/brain.pglite
// If the CLI is missing, slow or failing, everything falls back to an in-memory store that is
// pre-loaded from data/brain/pages/**/*.md (the seed) + data/brain/mock.jsonl. Never throws.
// Keep these exports stable: server/index.ts and server/cron.ts depend on them.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export interface BrainHit {
  title: string
  snippet: string
  source?: string
}

const ROOT = resolve(import.meta.dir, '..')
const GBRAIN_HOME = process.env.GBRAIN_HOME ?? join(ROOT, 'data', 'brain')
const PAGES_DIR = join(GBRAIN_HOME, 'pages')
const MOCK_FILE = join(GBRAIN_HOME, 'mock.jsonl')
const BIN = process.env.GBRAIN_BIN ?? Bun.which('gbrain') ?? join(process.env.HOME ?? '', '.bun', 'bin', 'gbrain')
const TIMEOUT_MS = 5000
const env = { ...process.env, GBRAIN_HOME, NO_COLOR: '1' }

// ---------------------------------------------------------------- CLI plumbing
let cliOk = existsSync(BIN) && existsSync(join(GBRAIN_HOME, '.gbrain', 'config.json'))
let failures = 0
let breakerUntil = 0 // after repeated failures, skip the CLI for a while so calls stay fast

function cliUsable() {
  return cliOk && Date.now() >= breakerUntil
}

async function run(args: string[], stdin?: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  if (!cliUsable()) return null
  try {
    const proc = Bun.spawn([BIN, ...args], {
      env,
      cwd: ROOT,
      stdin: stdin !== undefined ? 'pipe' : 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (stdin !== undefined && proc.stdin) {
      proc.stdin.write(stdin)
      proc.stdin.end()
    }
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      proc.kill()
    }, timeoutMs)
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    clearTimeout(timer)
    if (timedOut || code !== 0) throw new Error(timedOut ? 'timeout' : `exit ${code}`)
    failures = 0
    return out
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') cliOk = false
    if (++failures >= 3) {
      breakerUntil = Date.now() + 30_000
      failures = 0
    }
    return null
  }
}

async function callJson<T>(tool: string, params: Record<string, unknown>): Promise<T | null> {
  const out = await run(['call', tool, JSON.stringify(params)])
  if (!out) return null
  try {
    return JSON.parse(out.slice(out.search(/[[{]/))) as T
  } catch {
    return null
  }
}

// Writes are serialized (PGLite has one writer); reads may overlap but at most 2 at a time.
let writeChain: Promise<unknown> = Promise.resolve()
function serialWrite<T>(fn: () => Promise<T>): Promise<T> {
  const job = writeChain.then(fn, fn)
  writeChain = job.catch(() => undefined)
  return job
}
let readers = 0
const readWaiters: (() => void)[] = []
async function limitedRead<T>(fn: () => Promise<T>): Promise<T> {
  if (readers >= 2) await new Promise<void>((r) => readWaiters.push(r))
  readers++
  try {
    return await fn()
  } finally {
    readers--
    readWaiters.shift()?.()
  }
}

// ---------------------------------------------------------------- fallback store
type Mem = { slug: string; title: string; text: string; at: string }
const mem: Mem[] = []
let fallbackLoaded = false

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
  })
}

function loadFallback() {
  if (fallbackLoaded) return
  fallbackLoaded = true
  try {
    for (const file of walk(PAGES_DIR)) {
      const raw = readFileSync(file, 'utf8')
      const title = raw.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] ?? file
      mem.push({ slug: relative(PAGES_DIR, file).replace(/\.md$/, ''), title, text: stripFrontmatter(raw), at: '' })
    }
    if (existsSync(MOCK_FILE)) {
      for (const line of readFileSync(MOCK_FILE, 'utf8').split('\n')) {
        if (!line.trim()) continue
        try {
          const m = JSON.parse(line)
          mem.push({ slug: m.source, title: m.source, text: m.text, at: m.at })
        } catch {}
      }
    }
  } catch {}
}

function stripFrontmatter(md: string) {
  return md.replace(/^---[\s\S]*?\n---\n/, '')
}

/** Markdown chunk -> one readable line for the UI. */
function clean(md: string, max = 220) {
  const s = stripFrontmatter(md)
    .replace(/… \[truncated[^\]]*\]/g, '…')
    .replace(/^#+ .*$/m, '') // drop the page heading (it is the title)
    .replace(/\[\[([^\]|]+\/)?([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, _p, name, alias) => alias ?? name.replace(/-/g, ' '))
    .replace(/[*`>]|(?<!\w)_|_(?!\w)|(^|\s)#+(?=\s)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function fallbackSearch(q: string, limit: number): BrainHit[] {
  loadFallback()
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return mem
    .map((m) => {
      const hay = `${m.title} ${m.text}`.toLowerCase()
      const score = terms.reduce((n, t) => n + (hay.split(t).length - 1), 0) + (hay.includes(q.toLowerCase()) ? 5 : 0)
      return { m, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ m }) => ({ title: m.title, snippet: snippetAround(m.text, keyTerm(q)), source: m.slug }))
}

/** The most specific word of a query (longest), used to centre snippets on the match. */
function keyTerm(q: string) {
  return q.toLowerCase().split(/\s+/).sort((a, b) => b.length - a.length)[0] ?? ''
}

function snippetAround(text: string, term: string) {
  const flat = clean(text, 10_000)
  const i = term ? flat.toLowerCase().indexOf(term) : -1
  const start = i < 80 ? 0 : flat.lastIndexOf(' ', i - 60) + 1
  const s = flat.slice(start, start + 220)
  return (start > 0 ? '…' : '') + s + (start + 220 < flat.length ? '…' : '')
}

// Recently remembered (this process), newest last. Used by recent() for snippets.
const recentWrites: Mem[] = []

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9/]+/g, '-').replace(/\/+/g, '/').replace(/(^[-/]+|[-/]+$)/g, '').slice(0, 60) || 'memory'

// ---------------------------------------------------------------- public API
export async function remember(text: string, source: string): Promise<boolean> {
  const at = new Date().toISOString()
  const slug = `learned/${slugify(source).replace(/\//g, '-')}-${Date.now().toString(36)}`
  const entry: Mem = { slug, title: source, text, at }
  loadFallback()
  mem.push(entry)
  recentWrites.push(entry)
  if (recentWrites.length > 200) recentWrites.shift()
  try {
    mkdirSync(GBRAIN_HOME, { recursive: true })
    appendFileSync(MOCK_FILE, JSON.stringify({ text, source, slug, at }) + '\n')
  } catch {}
  if (!cliUsable()) return true // stored in the fallback store
  const content = `# ${source}\n\n${text}\n\n_Remembered ${at} by the Coach agent (viewfy swarm)._\n`
  const out = await serialWrite(() => run(['capture', '--stdin', '--slug', slug, '--type', 'note', '--json'], content))
  if (out) statsCache = null
  return true
}

export async function search(q: string, limit = 5): Promise<BrainHit[]> {
  const query = q.trim()
  if (!query) return []
  if (cliUsable()) {
    type Row = { slug: string; title?: string; chunk_text?: string }
    const rows = await limitedRead(() => callJson<Row[]>('search', { query, limit: limit * 2, snippet_chars: 400 }))
    if (Array.isArray(rows)) {
      const seen = new Set<string>()
      const hits: BrainHit[] = []
      for (const r of rows) {
        if (seen.has(r.slug)) continue // one hit per page
        seen.add(r.slug)
        hits.push({ title: r.title || r.slug, snippet: snippetAround(r.chunk_text ?? '', keyTerm(query)), source: r.slug })
        if (hits.length >= limit) break
      }
      return hits
    }
  }
  return fallbackSearch(query, limit)
}

let statsCache: { at: number; value: { pages: number; real: boolean } } | null = null
export async function stats(): Promise<{ pages: number; real: boolean }> {
  if (statsCache && Date.now() - statsCache.at < 3000) return statsCache.value
  if (cliUsable()) {
    const s = await limitedRead(() => callJson<{ page_count?: number }>('get_stats', {}))
    if (s && typeof s.page_count === 'number') {
      statsCache = { at: Date.now(), value: { pages: s.page_count, real: true } }
      return statsCache.value
    }
  }
  loadFallback()
  return { pages: mem.length, real: false }
}

export async function recent(limit = 10): Promise<BrainHit[]> {
  if (cliUsable()) {
    type Row = { slug: string; title?: string; type?: string; updated_at?: string }
    const rows = await limitedRead(() => callJson<Row[]>('list_pages', { limit }))
    if (Array.isArray(rows)) {
      loadFallback()
      return rows.slice(0, limit).map((r) => {
        const local = [...recentWrites].reverse().find((m) => m.slug === r.slug) ?? mem.find((m) => m.slug === r.slug)
        return {
          title: r.title || r.slug,
          snippet: local ? clean(local.text) : `${r.type ?? 'page'} · updated ${r.updated_at ?? ''}`,
          source: r.slug,
        }
      })
    }
  }
  loadFallback()
  return mem
    .slice(-limit)
    .reverse()
    .map((m) => ({ title: m.title, snippet: clean(m.text), source: m.slug }))
}
