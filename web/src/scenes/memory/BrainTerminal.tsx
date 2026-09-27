// Live gbrain search: auto-types a query, hits /api/brain/search, prints hits line by line. Cycles ~7s.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../../engine/store'
import type { BrainHit, BrainSnapshot } from '../../engine/types'
import { BRAIN_QUERIES, fallbackHitsFor } from './fallback'

const PREFIX = 'gbrain search '
const CYCLE_MS = 7000

type Status = 'typing' | 'searching' | 'done'
interface Run {
  key: number
  q: string
  cmd: string
  typed: number
  status: Status
  hits: BrainHit[]
  real: boolean
  ms: number
}

// ---- tolerant response parsing -------------------------------------------------------------
type Obj = Record<string, unknown>
const asObj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null)
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : undefined
const clean = (s: string) =>
  s
    .replace(/---[\s\S]*?---/g, ' ')
    .replace(/[#*_`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function normalizeHit(h: unknown): BrainHit | null {
  if (typeof h === 'string') return h.trim() ? { title: h, snippet: clean(h) } : null
  const o = asObj(h)
  if (!o) return null
  const source = str(o.source) ?? str(o.slug) ?? str(o.path) ?? str(o.page) ?? str(o.id)
  const title = str(o.title) ?? str(o.name) ?? source ?? ''
  const snippet =
    str(o.snippet) ?? str(o.text) ?? str(o.content) ?? str(o.excerpt) ?? str(o.chunk) ?? str(o.body) ?? title
  if (!snippet && !title) return null
  return { title, snippet: clean(snippet), source }
}

async function fetchBrain(q: string): Promise<{ real: boolean; hits: BrainHit[] } | null> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 4500)
  try {
    const res = await fetch('/api/brain/search?q=' + encodeURIComponent(q), {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return null
    const json: unknown = await res.json()
    const o = asObj(json)
    const raw = Array.isArray(json) ? json : o ? (o.hits ?? o.results ?? o.data ?? o.items ?? o.matches) : null
    if (!Array.isArray(raw)) return null
    const hits = raw.map(normalizeHit).filter((h): h is BrainHit => !!h)
    if (!hits.length) return null
    return { real: o?.real === true, hits }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

function fromSamples(q: string, samples: BrainSnapshot['sampleQueries'] | undefined): BrainHit[] | null {
  if (!samples?.length) return null
  const nq = norm(q)
  const words = nq.split(' ').filter((w) => w.length > 2)
  let best: BrainHit[] | null = null
  let bestScore = 0
  for (const s of samples) {
    if (!s?.hits?.length || typeof s.q !== 'string') continue
    const ns = norm(s.q)
    const score = ns === nq ? 100 : ns.includes(nq) || nq.includes(ns) ? 50 : words.filter((w) => ns.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      best = s.hits.map(normalizeHit).filter((h): h is BrainHit => !!h)
    }
  }
  return best?.length ? best : null
}

async function search(q: string, samples: BrainSnapshot['sampleQueries'] | undefined) {
  const live = await fetchBrain(q)
  if (live) return live
  return { real: false, hits: fromSamples(q, samples) ?? fallbackHitsFor(q) }
}

// ---- rendering helpers -------------------------------------------------------------------------
function slugOf(h: BrainHit): string {
  if (h.source) return h.source
  return h.title
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/^-|-$/g, '')
}

function highlight(text: string, q: string): ReactNode {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (q.length < 3 || i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <span className="text-gold">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  )
}

function Caret() {
  return (
    <motion.span
      className="ml-[1px] inline-block h-[17px] w-[8px] translate-y-[3px] bg-star"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
    />
  )
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-star"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------------------------
export default function BrainTerminal() {
  const samples = useSwarm((s) => s.data?.brain.sampleQueries)
  const samplesRef = useRef(samples)
  samplesRef.current = samples

  const [run, setRun] = useState<Run | null>(null)
  const [live, setLive] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
    ;(async () => {
      await sleep(900)
      let n = 0
      while (alive) {
        const q = BRAIN_QUERIES[n % BRAIN_QUERIES.length]
        const cmd = `${PREFIX}"${q}"`
        const start = performance.now()
        setRun({ key: n, q, cmd, typed: 0, status: 'typing', hits: [], real: false, ms: 0 })

        // human-ish typing: the command is quick, the query is deliberate
        for (let i = 1; i <= cmd.length; i++) {
          await sleep(i <= PREFIX.length ? 26 : 58 + Math.random() * 40)
          if (!alive) return
          setRun((r) => (r ? { ...r, typed: i } : r))
        }
        await sleep(180)
        if (!alive) return
        setRun((r) => (r ? { ...r, status: 'searching' } : r))

        const t0 = performance.now()
        const res = await search(q, samplesRef.current)
        const ms = Math.round(performance.now() - t0)
        await sleep(Math.max(0, 380 - ms))
        if (!alive) return
        setLive(res.real)
        setRun((r) => (r ? { ...r, status: 'done', hits: res.hits.slice(0, 3), real: res.real, ms } : r))

        await sleep(Math.max(3600, CYCLE_MS - (performance.now() - start)))
        n++
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const typed = run ? run.cmd.slice(0, run.typed) : ''
  const head = typed.slice(0, PREFIX.length)
  const tail = typed.slice(PREFIX.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: 0.55 }}
      className="glass relative shrink-0 overflow-hidden px-5 pt-3 pb-3.5 font-mono"
      style={{
        height: 150,
        boxShadow: '0 0 0 1px rgb(136 200 248 / 0.04) inset, 0 0 60px -26px #88c8f8, 0 24px 60px -20px rgb(0 0 0 / 0.6)',
      }}
    >
      {/* scanline shimmer */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-star/[0.05] to-transparent"
        animate={{ x: ['-10rem', '70rem'] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
      />

      {/* header */}
      <div className="flex items-center gap-3 font-sans text-[11px] font-bold tracking-[0.2em] uppercase">
        <span className="text-star">✦ gbrain</span>
        <span className="text-cream/40">live memory search</span>
        <div className="ml-auto">
          <AnimatePresence mode="wait">
            {live === true ? (
              <motion.span
                key="live"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-full bg-mint/12 px-2.5 py-1 text-mint"
                style={{ boxShadow: '0 0 20px -6px #6ee7b7' }}
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-mint"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                live · gbrain cli
              </motion.span>
            ) : live === false ? (
              <motion.span
                key="cached"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-full bg-white/[0.06] px-2.5 py-1 text-cream/50"
              >
                <span className="h-1.5 w-1.5 rounded-full border border-cream/50" />
                cached
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* command line */}
      <div className="mt-2 flex items-center text-[15px] leading-6">
        <span className="mr-2 text-star/70">❯</span>
        <span className="whitespace-pre text-cream/90">{head}</span>
        <span className="whitespace-pre text-gold">{tail}</span>
        {run?.status !== 'done' && <Caret />}
        <span className="ml-auto pl-4 font-sans text-[13px] text-cream/45">
          {run?.status === 'searching' && <Dots />}
          {run?.status === 'done' && (
            <motion.span className="tabular" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {run.hits.length} hits · {run.ms}ms
            </motion.span>
          )}
        </span>
      </div>

      {/* hits */}
      <div className="mt-1">
        {run?.status === 'done' && (
            <div key={run.key}>
              {run.hits.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex items-baseline gap-4 text-[14px] leading-[23px]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.16, duration: 0.35, ease: 'easeOut' }}
                >
                  <span className="w-3 shrink-0 text-cream/30">{i === 0 ? '↳' : ''}</span>
                  <span className="w-[32%] shrink-0 truncate text-star">{slugOf(h)}</span>
                  <span className="min-w-0 truncate text-cream/80">{highlight(h.snippet || h.title, run.q)}</span>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  )
}
