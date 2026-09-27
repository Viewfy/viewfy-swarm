// Tweened number: eases from the last shown value to the new one (rAF, no re-renders per frame).
import { useEffect, useRef, type CSSProperties } from 'react'
import clsx from 'clsx'
import { fmtInt } from './format'

export default function AnimatedNumber({
  value,
  format = fmtInt,
  duration = 900,
  className,
  style,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const fmt = useRef(format)
  fmt.current = format
  // Render the first value once; afterwards the tween owns the text node.
  const initial = useRef(format(value)).current

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    const delta = value - from
    if (delta === 0 || !Number.isFinite(delta)) {
      shown.current = value
      el.textContent = fmt.current(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      shown.current = from + delta * e
      el.textContent = fmt.current(t >= 1 ? value : shown.current)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span ref={ref} className={clsx('tabular', className)} style={style}>
      {initial}
    </span>
  )
}
