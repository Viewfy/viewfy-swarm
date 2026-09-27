// Animated loss curve (draws itself) and tone-fingerprint radar.
import { useEffect, useId, useMemo, useState } from 'react'
import { animate, motion } from 'motion/react'

const VIOLET = '#a78bfa'

export function CountUp({ to, from = 0, decimals = 0, duration = 1.8, delay = 0, suffix = '' }: {
  to: number
  from?: number
  decimals?: number
  duration?: number
  delay?: number
  suffix?: string
}) {
  const [v, setV] = useState(from)
  useEffect(() => {
    const c = animate(from, to, { duration, delay, ease: [0.16, 1, 0.3, 1], onUpdate: setV })
    return () => c.stop()
  }, [to, from, duration, delay])
  return (
    <span className="tabular">
      {v.toFixed(decimals)}
      {suffix}
    </span>
  )
}

export function LossCurve({ steps, width = 420, height = 150, delay = 0.4 }: {
  steps: { step: number; loss: number }[]
  width?: number
  height?: number
  delay?: number
}) {
  const gid = useId().replace(/:/g, '')
  const pad = { l: 34, r: 12, t: 10, b: 22 }
  const { d, area, last, yTicks, maxStep } = useMemo(() => {
    const xs = steps.map((s) => s.step)
    const ys = steps.map((s) => s.loss)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const hi = Math.max(...ys)
    const lo = Math.min(...ys)
    const span = Math.max(1e-6, hi - lo)
    const yMax = hi + span * 0.08
    const yMin = Math.max(0, lo - span * 0.25)
    const X = (v: number) => pad.l + ((v - x0) / Math.max(1, x1 - x0)) * (width - pad.l - pad.r)
    const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (height - pad.t - pad.b)
    // light smoothing so the stroke reads as a curve, not a zigzag
    const pts = steps.map((s, i) => {
      const a = steps[Math.max(0, i - 1)].loss
      const b = steps[Math.min(steps.length - 1, i + 1)].loss
      return { x: X(s.step), y: Y(i === 0 || i === steps.length - 1 ? s.loss : (a + 2 * s.loss + b) / 4) }
    })
    let path = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]
      const q = pts[i]
      const cx = (p.x + q.x) / 2
      path += ` C${cx},${p.y} ${cx},${q.y} ${q.x},${q.y}`
    }
    const areaPath = `${path} L${pts[pts.length - 1].x},${Y(yMin)} L${pts[0].x},${Y(yMin)} Z`
    const ticks = [lo, (lo + hi) / 2, hi].map((v) => ({ v, y: Y(v) }))
    return { d: path, area: areaPath, last: pts[pts.length - 1], yTicks: ticks, maxStep: x1 }
  }, [steps, width, height, pad.l, pad.r, pad.t, pad.b])

  const dur = 2.4
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`fill${gid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={VIOLET} stopOpacity="0.28" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow${gid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {yTicks.map((t) => (
        <g key={t.v}>
          <line x1={pad.l} x2={width - pad.r} y1={t.y} y2={t.y} stroke="white" strokeOpacity="0.07" strokeDasharray="2 4" />
          <text x={pad.l - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="#f8f5f1" fillOpacity="0.4" className="tabular">
            {t.v.toFixed(Math.abs(t.v) < 1 ? 2 : 1)}
          </text>
        </g>
      ))}
      <text x={pad.l} y={height - 4} fontSize="11" fill="#f8f5f1" fillOpacity="0.4">
        step 0
      </text>
      <text x={width - pad.r} y={height - 4} textAnchor="end" fontSize="11" fill="#f8f5f1" fillOpacity="0.4" className="tabular">
        {maxStep}
      </text>
      <motion.path
        d={area}
        fill={`url(#fill${gid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + dur * 0.7, duration: 0.8 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={VIOLET}
        strokeWidth={2.5}
        strokeLinecap="round"
        filter={`url(#glow${gid})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: dur, ease: [0.45, 0, 0.2, 1] }}
      />
      <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + dur, type: 'spring', stiffness: 300, damping: 16 }} style={{ originX: `${last.x}px`, originY: `${last.y}px` }}>
        <motion.circle
          cx={last.x}
          cy={last.y}
          r={9}
          fill={VIOLET}
          fillOpacity={0.25}
          initial={{ r: 7, fillOpacity: 0.35 }}
          animate={{ r: [7, 13, 7], fillOpacity: [0.35, 0.05, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={last.x} cy={last.y} r={4.5} fill="#f8f5f1" stroke={VIOLET} strokeWidth={2} />
      </motion.g>
    </svg>
  )
}

export function Radar({ traits, size = 230, delay = 0.6 }: { traits: { name: string; value: number }[]; size?: number; delay?: number }) {
  const c = size / 2
  const R = size / 2 - 34
  const n = traits.length
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n
    return { x: c + Math.cos(a) * r, y: c + Math.sin(a) * r }
  }
  const poly = traits.map((t, i) => pt(i, R * Math.max(0.08, Math.min(1, t.value)))).map((p) => `${p.x},${p.y}`).join(' ')
  const ring = (k: number) => traits.map((_, i) => pt(i, R * k)).map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <svg width={size} height={size} className="overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={ring(k)} fill="none" stroke="white" strokeOpacity={k === 1 ? 0.14 : 0.06} />
      ))}
      {traits.map((_, i) => {
        const p = pt(i, R)
        return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="white" strokeOpacity="0.06" />
      })}
      <motion.g
        style={{ originX: `${c}px`, originY: `${c}px` }}
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay, type: 'spring', stiffness: 70, damping: 11 }}
      >
        <motion.g
          style={{ originX: `${c}px`, originY: `${c}px` }}
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.2 }}
        >
          <polygon points={poly} fill={VIOLET} fillOpacity={0.24} stroke={VIOLET} strokeWidth={2} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgb(167 139 250 / 0.6))' }} />
          {traits.map((t, i) => {
            const p = pt(i, R * Math.max(0.08, Math.min(1, t.value)))
            return <circle key={t.name} cx={p.x} cy={p.y} r={3.5} fill="#f8f5f1" />
          })}
        </motion.g>
      </motion.g>
      {traits.map((t, i) => {
        const p = pt(i, R + 18)
        const anchor = Math.abs(p.x - c) < 6 ? 'middle' : p.x > c ? 'start' : 'end'
        return (
          <motion.text
            key={t.name}
            x={p.x}
            y={p.y + 4}
            textAnchor={anchor}
            fontSize="13"
            fontWeight={700}
            fill="#f8f5f1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: delay + 0.3 + i * 0.07 }}
          >
            {t.name}
            <tspan fill={VIOLET} fontWeight={400} dx="4" className="tabular">
              {Math.round(t.value * 100)}
            </tspan>
          </motion.text>
        )
      })}
    </svg>
  )
}
