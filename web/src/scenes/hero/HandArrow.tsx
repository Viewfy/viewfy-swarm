// Hand-drawn annotation: a curved arrow that draws itself in (stroke-dashoffset via
// motion's pathLength) from the headline to the big star, with a Caveat note on the arc.
import { motion } from 'motion/react'

export type Pt = { x: number; y: number }

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }
}

export default function HandArrow({
  from,
  to,
  note,
  delay = 0,
  color = '#88c8f8',
}: {
  from: Pt
  to: Pt
  note: string
  delay?: number
  color?: string
}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lift = Math.min(150, Math.max(60, dx * 0.32))
  // leave the headline heading right & slightly up, arc over, drop into the star from above-left
  const c1 = { x: from.x + dx * 0.42, y: from.y - lift }
  const c2 = { x: to.x - dx * 0.1, y: to.y - Math.max(70, dy + lift * 0.9) }
  const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`

  // arrowhead follows the final tangent
  const ang = Math.atan2(to.y - c2.y, to.x - c2.x)
  const len = 20
  const spread = 0.5
  const h1 = { x: to.x - Math.cos(ang - spread) * len, y: to.y - Math.sin(ang - spread) * len }
  const h2 = { x: to.x - Math.cos(ang + spread) * len, y: to.y - Math.sin(ang + spread) * len }
  const head = `M ${h1.x} ${h1.y} L ${to.x} ${to.y} L ${h2.x} ${h2.y}`

  const mid = bez(from, c1, c2, to, 0.42)
  const draw = 1.0

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <filter id="hero-arrow-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#hero-arrow-glow)" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d={d}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: draw, ease: [0.65, 0, 0.35, 1], delay },
              opacity: { duration: 0.15, delay },
            }}
          />
          <motion.path
            d={head}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.28, ease: 'easeOut', delay: delay + draw - 0.05 },
              opacity: { duration: 0.1, delay: delay + draw - 0.05 },
            }}
          />
        </g>
      </svg>
      <motion.div
        className="absolute font-hand text-[clamp(30px,2.05vw,40px)] leading-none font-bold whitespace-nowrap text-star"
        style={{
          left: mid.x,
          top: mid.y,
          x: '-50%',
          y: '-135%',
          rotate: -6,
          // dark under-glow keeps the note legible where it crosses the Coach leader on the canvas
          textShadow: '0 0 18px rgb(136 200 248 / 0.45), 0 1px 3px rgb(5 8 20 / 0.95), 0 0 10px rgb(5 8 20 / 0.8)',
        }}
        initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
        animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.75, ease: 'easeOut', delay: delay + 0.45 }}
      >
        {note}
      </motion.div>
    </>
  )
}
