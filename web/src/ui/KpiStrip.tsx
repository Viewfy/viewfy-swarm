// Bottom-center KPI strip: animated counters + reply-rate sparkline ("it learns").
import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { BRAIN, SQUADS } from '../engine/layout'
import AnimatedNumber from './AnimatedNumber'
import { fmtInt, fmtPct0, fmtPct1, rgba } from './format'

const GOLD = '#f6c667'

function KpiCell({
  label,
  value,
  color,
  format = fmtInt,
  bump = true,
}: {
  label: string
  value: number
  color: string
  format?: (n: number) => string
  bump?: boolean
}) {
  const prev = useRef(value)
  const timers = useRef<number[]>([])
  const [bumps, setBumps] = useState<{ id: number; n: number }[]>([])

  useEffect(() => {
    const d = value - prev.current
    prev.current = value
    if (!bump || d <= 0) return
    const id = Date.now() + Math.random()
    setBumps((b) => [...b.slice(-2), { id, n: d }])
    timers.current.push(window.setTimeout(() => setBumps((b) => b.filter((x) => x.id !== id)), 1400))
  }, [value, bump])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center px-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] whitespace-nowrap text-cream/50 uppercase">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        {label}
      </div>
      <AnimatedNumber value={value} format={format} className="mt-1 text-[26px] leading-none font-black tracking-tight text-cream" />
      <AnimatePresence>
        {bumps.map((b) => (
          <motion.span
            key={b.id}
            className="tabular pointer-events-none absolute -top-3 right-1 rounded-full px-1.5 py-0.5 text-[12px] font-black"
            style={{ color, background: rgba(color, 0.14) }}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            +{fmtInt(b.n)}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Sparkline({ data, w = 128, h = 40 }: { data: number[]; w?: number; h?: number }) {
  const gid = useId().replace(/:/g, '')
  const pad = 4
  if (data.length < 2) return <svg width={w} height={h} />
  const max = Math.max(...data) * 1.1 || 1
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), h - pad - (v / max) * (h - pad * 2)] as const)
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2
    line += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  const area = `${line} L${last[0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
          <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={GOLD}
        strokeWidth={2.2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${rgba(GOLD, 0.6)})` }}
      />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={GOLD}>
        <animate attributeName="r" values="3.5;4.5;3.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={last[0]} cy={last[1]} r={4} fill="none" stroke={GOLD} strokeWidth={1.5}>
        <animate attributeName="r" values="4;11" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export default function KpiStrip() {
  const k = useSwarm((s) => s.kpis)
  const hist = k.replyRateHistory ?? []
  const rate = hist.length ? hist[hist.length - 1] : 0
  const first = hist.length ? hist[0] : 0

  return (
    <div className="glass flex items-center px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center">
        <KpiCell label="Pitches" value={k.pitches} color={SQUADS.press.color} />
        <KpiCell label="X replies" value={k.xReplies} color={SQUADS.community.color} />
        <KpiCell label="Replies" value={k.repliesIn} color={GOLD} />
        <KpiCell label="Meetings" value={k.meetings} color={GOLD} />
        <KpiCell label="Brand voice" value={k.voiceMatch} color={SQUADS.voice.color} format={fmtPct0} bump={false} />
        <KpiCell label="CRM notes" value={k.memories} color={BRAIN.color} />
      </div>
      <div className="mx-3 h-11 w-px shrink-0 bg-white/10" />
      <div className="flex shrink-0 items-center gap-3 pr-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-[0.16em] whitespace-nowrap text-cream/50 uppercase">Reply rate</span>
          <span className="tabular mt-0.5 text-[11px] whitespace-nowrap text-cream/35">from {fmtPct1(first)}</span>
        </div>
        <Sparkline data={hist} />
        <AnimatedNumber
          value={rate}
          format={fmtPct1}
          className="text-[26px] leading-none font-black tracking-tight"
          style={{ color: GOLD, textShadow: `0 0 18px ${rgba(GOLD, 0.45)}` }}
        />
      </div>
    </div>
  )
}
