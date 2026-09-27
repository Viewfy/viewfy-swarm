// Small shared pieces for the Memory scene: stage scale + an animated (ticking) number.
import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'
import clsx from 'clsx'

/** Design base is 1440×900. s scales everything (CSS zoom) so 1920×1080 renders at 1.2×. */
export interface StageScale {
  s: number
  vw: number // viewport width in design px
  vh: number // viewport height in design px
}

function calc(): StageScale {
  const w = window.innerWidth
  const h = window.innerHeight
  const s = Math.max(0.6, Math.min(w / 1440, h / 900))
  return { s, vw: w / s, vh: h / s }
}

export function useStageScale(): StageScale {
  const [dims, setDims] = useState(calc)
  useEffect(() => {
    const on = () => setDims(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return dims
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')

/** A number that springs (ticks) to its value. Counts up from `from` on mount after `delay` seconds. */
export function AnimatedNumber({
  value,
  format = fmtInt,
  from = 0,
  delay = 0,
  stiffness = 60,
  damping = 20,
  className,
}: {
  value: number
  format?: (n: number) => string
  from?: number
  delay?: number
  stiffness?: number
  damping?: number
  className?: string
}) {
  const mv = useSpring(from, { stiffness, damping })
  const started = useRef(false)
  useEffect(() => {
    if (!started.current) {
      const t = window.setTimeout(() => {
        started.current = true
        mv.set(value)
      }, delay * 1000)
      return () => window.clearTimeout(t)
    }
    mv.set(value)
  }, [value, mv, delay])
  const text = useTransform(mv, (v) => format(v))
  return <motion.span className={clsx('tabular', className)}>{text}</motion.span>
}

export function pct(n: number): string {
  const v = n * 100
  return `${Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)}%`
}
