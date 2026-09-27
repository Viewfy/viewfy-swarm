// The three self-improvement layers: Remember (gbrain) · Repeat (Memorable) · Rewire (River RL).
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../../engine/store'
import { MASCOTS } from '../../engine/layout'
import type { MemoryItem, Workflow } from '../../engine/types'
import { AnimatedNumber, pct } from './shared'
import { FALLBACK_MEMORIES, FALLBACK_WORKFLOWS } from './fallback'

const STAR = '#88c8f8'
const GOLD = '#f6c667'
const VIOLET = '#a78bfa'

// ---------------------------------------------------------------------------------------------
// Card shell
// ---------------------------------------------------------------------------------------------
function LayerCard({
  index,
  verb,
  powered,
  color,
  mascot,
  mascotW,
  pulseKey,
  children,
}: {
  index: number
  verb: string
  powered: string
  color: string
  mascot: string
  mascotW: number
  pulseKey: number | null
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 17, delay: 0.3 + index * 0.09 }}
      className="glass relative flex min-h-0 min-w-0 flex-col px-5 pt-3.5 pb-3"
      style={{
        boxShadow: `0 0 0 1px rgb(136 200 248 / 0.04) inset, 0 0 56px -22px ${color}, 0 24px 60px -20px rgb(0 0 0 / 0.6)`,
      }}
    >
      {/* accent hairline */}
      <div
        className="absolute inset-x-8 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {/* learn pulse: the whole card breathes gold when a loop finishes */}
      <AnimatePresence>
        {pulseKey != null && (
          <motion.div
            key={pulseKey}
            className="pointer-events-none absolute inset-0 rounded-[20px]"
            style={{ boxShadow: `0 0 0 1.5px ${GOLD}aa inset, 0 0 60px -8px ${GOLD}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, delay: index * 0.18, times: [0, 0.25, 1] }}
          />
        )}
      </AnimatePresence>

      {/* mascot, bobbing, poking out of the top-right corner */}
      <motion.div
        className="absolute -top-9 right-2"
        style={{ width: mascotW }}
        initial={{ opacity: 0, scale: 0.6, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 170, damping: 13, delay: 0.55 + index * 0.12 }}
      >
        <div
          className="absolute inset-[-18%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${color}55, transparent 65%)` }}
        />
        <motion.img
          src={mascot}
          alt=""
          draggable={false}
          className="relative w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
          animate={{ y: [0, -5, 0], rotate: [0, index % 2 ? 2.5 : -2.5, 0] }}
          transition={{ duration: 3.2 + index * 0.45, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase">
        <span style={{ color }}>0{index + 1}</span>
        <span className="text-cream/50">{powered}</span>
      </div>
      <div className="mt-0.5 text-[26px] leading-tight font-black tracking-tight text-cream">{verb}</div>
      {children}
    </motion.div>
  )
}

function BigStat({ children }: { children: ReactNode }) {
  return <div className="relative mt-2 flex items-baseline gap-2 whitespace-nowrap">{children}</div>
}

function Sub({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-[14px] leading-snug text-cream/55">{children}</div>
}

// ---------------------------------------------------------------------------------------------
// 1 · REMEMBER — gbrain
// ---------------------------------------------------------------------------------------------
const ROW = 38

function stripSource(text: string, source: string): string {
  if (!source || !text.toLowerCase().startsWith(source.toLowerCase())) return text
  return text.slice(source.length).replace(/^[\s—–:·-]+/, '') || text
}

function useMemoryStream() {
  const storeMem = useSwarm((s) => s.memories)
  const kpiMem = useSwarm((s) => s.kpis.memories)
  const useLocal = storeMem.length === 0
  const seq = useRef(3)
  const [local, setLocal] = useState<MemoryItem[]>(() =>
    FALLBACK_MEMORIES.slice(0, 3).map((m, i) => ({ ...m, id: `fm-${i}`, at: Date.now() - i * 60_000, loop: 38 })),
  )
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    if (!useLocal) return
    const id = window.setInterval(() => {
      const i = seq.current++
      const m = FALLBACK_MEMORIES[i % FALLBACK_MEMORIES.length]
      setLocal((prev) => [{ ...m, id: `fm-${i}`, at: Date.now(), loop: 38 }, ...prev].slice(0, 3))
      setExtra((e) => e + 1 + (i % 3))
    }, 2600)
    return () => window.clearInterval(id)
  }, [useLocal])

  return {
    items: (useLocal ? local : storeMem).slice(0, 3),
    count: kpiMem + (useLocal ? extra : 0),
  }
}

function RememberCard({ pulseKey }: { pulseKey: number | null }) {
  const { items, count } = useMemoryStream()

  // floating "+N" whenever the count ticks up
  const prev = useRef(count)
  const [bump, setBump] = useState<{ n: number; k: number } | null>(null)
  useEffect(() => {
    const d = count - prev.current
    prev.current = count
    if (d > 0) setBump({ n: d, k: count })
  }, [count])

  return (
    <LayerCard index={0} verb="Remember" powered="gbrain" color={STAR} mascot={MASCOTS.learn90} mascotW={84} pulseKey={pulseKey}>
      <BigStat>
        <AnimatedNumber value={count} delay={0.5} className="text-[44px] leading-none font-black tracking-tight text-cream" />
        <span className="relative text-[18px] font-bold text-star">
          memories
          <AnimatePresence>
            {bump && (
              <motion.span
                key={bump.k}
                className="tabular absolute -top-5 left-full ml-1.5 text-[15px] font-black text-gold"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: [0, 1, 1, 0], y: -14 }}
                transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.15, 0.6, 1] }}
              >
                +{bump.n}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </BigStat>
      <Sub>people · pitches · replies · everything it did</Sub>

      <div className="relative mt-2.5 min-h-0 flex-1 overflow-hidden" style={{ minHeight: ROW * 2 }}>
        <AnimatePresence initial={false}>
          {items.map((m, i) => (
            <motion.div
              key={m.id}
              className="absolute inset-x-0 top-0 flex gap-2.5"
              style={{ height: ROW }}
              initial={{ opacity: 0, y: -ROW * 0.6 }}
              animate={{ opacity: 1 - i * 0.22, y: i * ROW }}
              exit={{ opacity: 0, y: 3 * ROW }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              <motion.span
                className="mt-0.5 h-[32px] w-[2px] shrink-0 rounded-full"
                initial={{ backgroundColor: GOLD, boxShadow: `0 0 10px ${GOLD}` }}
                animate={{ backgroundColor: `${STAR}66`, boxShadow: `0 0 0px ${STAR}00` }}
                transition={{ duration: 1.6 }}
              />
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] leading-4 text-star">{m.source}</div>
                <div className="truncate text-[14px] leading-5 text-cream/80">{stripSource(m.text, m.source)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </LayerCard>
  )
}

// ---------------------------------------------------------------------------------------------
// 2 · REPEAT — Memorable
// ---------------------------------------------------------------------------------------------
function RepeatCard({ pulseKey }: { pulseKey: number | null }) {
  const storeWf = useSwarm((s) => s.workflows)
  const count = useSwarm((s) => s.kpis.workflows)
  const list: Workflow[] = storeWf.length ? storeWf : FALLBACK_WORKFLOWS
  const top = useMemo(() => [...list].sort((a, b) => b.winRate - a.winRate).slice(0, 4), [list])
  const newestId = useMemo(
    () => list.reduce<Workflow | null>((best, w) => (!best || w.loop > best.loop ? w : best), null)?.id,
    [list],
  )
  const maxWin = Math.max(0.01, ...top.map((w) => w.winRate))

  return (
    <LayerCard index={1} verb="Repeat" powered="Memorable" color={GOLD} mascot={MASCOTS.auditor} mascotW={92} pulseKey={pulseKey}>
      <BigStat>
        <AnimatedNumber value={count} delay={0.6} className="text-[44px] leading-none font-black tracking-tight text-cream" />
        <span className="text-[18px] font-bold text-gold">workflows</span>
      </BigStat>
      <Sub>winning plays, recalled the next loop</Sub>

      <div className="mt-2.5 flex min-h-0 flex-1 flex-col justify-start gap-[6px] overflow-hidden">
        {top.map((w, i) => {
          const isNew = w.id === newestId
          const v = /\bv(\d+)\b/i.exec(w.name)?.[1]
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2">
                <span className={`truncate text-[14px] leading-5 ${isNew ? 'text-cream' : 'text-cream/75'}`}>{w.name}</span>
                {isNew && (
                  <motion.span
                    className="shrink-0 rounded-full bg-gold/15 px-1.5 text-[11px] leading-[18px] font-black text-gold"
                    animate={{ boxShadow: [`0 0 0px ${GOLD}00`, `0 0 12px ${GOLD}aa`, `0 0 0px ${GOLD}00`] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                  >
                    {v ? `v${v}` : 'new'} ↑
                  </motion.span>
                )}
                <span className="tabular ml-auto shrink-0 text-[13px] font-bold text-gold">{pct(w.winRate)}</span>
              </div>
              <div className="mt-[3px] h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${GOLD}66, ${GOLD})`,
                    boxShadow: isNew ? `0 0 10px ${GOLD}` : undefined,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(w.winRate / maxWin) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.95 + i * 0.1 }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </LayerCard>
  )
}

// ---------------------------------------------------------------------------------------------
// 3 · REWIRE — River RL
// ---------------------------------------------------------------------------------------------
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function ReplyRateChart({ data }: { data: number[] }) {
  const uid = useId().replace(/:/g, '')
  const W = 300
  const H = 100
  const vals = data.length >= 2 ? data : [0.03, 0.094]
  const max = Math.max(...vals) * 1.12
  const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * W, y: H - (v / max) * (H - 6) }))
  const line = smoothPath(pts)
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const last = pts[pts.length - 1]

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.42} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
          <clipPath id={`reveal-${uid}`}>
            <motion.rect
              x={0}
              y={-20}
              height={H + 40}
              initial={{ width: 0 }}
              animate={{ width: W + 4 }}
              transition={{ duration: 1.9, delay: 0.8, ease: [0.3, 0.7, 0.2, 1] }}
            />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="white"
            strokeOpacity={0.06}
            strokeDasharray="3 5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <g clipPath={`url(#reveal-${uid})`}>
          <path d={area} fill={`url(#area-${uid})`} />
          <path
            d={line}
            fill="none"
            stroke={GOLD}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 6px ${GOLD}aa)` }}
          />
        </g>
      </svg>
      {/* live head of the curve */}
      <motion.div
        className="absolute"
        style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.5, type: 'spring', stiffness: 260, damping: 14 }}
      >
        <motion.span
          className="absolute -top-[11px] -left-[11px] h-[22px] w-[22px] rounded-full bg-gold/40"
          animate={{ scale: [0.6, 1.6], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <span className="absolute -top-[5px] -left-[5px] h-[10px] w-[10px] rounded-full bg-gold shadow-[0_0_12px_#f6c667]" />
      </motion.div>
    </div>
  )
}

function RewireCard({ pulseKey }: { pulseKey: number | null }) {
  const reward = useSwarm((s) => s.kpis.reward)
  const hist = useSwarm((s) => s.kpis.replyRateHistory)
  const delta = useSwarm((s) => s.lastLearned?.rewardDelta)
  const first = hist[0] ?? 0.03
  const last = hist[hist.length - 1] ?? 0.094

  return (
    <LayerCard index={2} verb="Rewire" powered="River RL" color={VIOLET} mascot={MASCOTS.learn30} mascotW={88} pulseKey={pulseKey}>
      <BigStat>
        <span className="text-[18px] font-bold text-violet">reward</span>
        <AnimatedNumber
          value={reward}
          delay={0.7}
          format={(v) => v.toFixed(2)}
          className="text-[44px] leading-none font-black tracking-tight text-cream"
        />
        {delta != null && delta !== 0 && (
          <span className="tabular rounded-full bg-gold/15 px-2 text-[13px] leading-6 font-bold text-gold">
            {delta > 0 ? '+' : ''}
            {delta.toFixed(3)}
          </span>
        )}
      </BigStat>
      <Sub>voice LoRA + RL: replies are the reward</Sub>

      <div className="mt-2 flex items-baseline gap-1.5 text-[14px]">
        <span className="text-cream/55">reply rate</span>
        <span className="tabular text-cream/80">{pct(first)}</span>
        <span className="text-cream/40">→</span>
        <span className="tabular font-black text-gold">{pct(last)}</span>
      </div>
      <div className="relative mt-2 min-h-[56px] flex-1">
        <ReplyRateChart data={hist} />
      </div>
    </LayerCard>
  )
}

// ---------------------------------------------------------------------------------------------
export default function LayerCards() {
  const pulseKey = useSwarm((s) => s.lastLearned?.loop ?? null)
  // Only pulse on changes that happen while the scene is open.
  const initial = useRef(pulseKey)
  const key = pulseKey !== initial.current ? pulseKey : null
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 pt-5">
      <RememberCard pulseKey={key} />
      <RepeatCard pulseKey={key} />
      <RewireCard pulseKey={key} />
    </div>
  )
}
