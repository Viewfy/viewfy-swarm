// Shared cinematic bits for the opening (Hero) and closing (Close) scenes.
import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import clsx from 'clsx'

export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Glow used on key words ("sales floor", "GTM intelligence"). */
export const STAR_GLOW = '0 0 28px rgb(136 200 248 / 0.45), 0 0 2px rgb(191 227 255 / 0.4)'

/**
 * Word-by-word reveal: each word rises out of a soft blur with a spring.
 * `start` = delay of the first word (s), `step` = stagger between words (s).
 */
export function Words({
  text,
  start = 0,
  step = 0.085,
  accent = false,
  className,
}: {
  text: string
  start?: number
  step?: number
  accent?: boolean
  className?: string
}) {
  const words = text.split(' ')
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <motion.span
            className={clsx('inline-block will-change-transform', accent && 'text-star', className)}
            style={accent ? { textShadow: STAR_GLOW } : undefined}
            initial={{ opacity: 0, y: '0.42em', filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: '0em', filter: 'blur(0px)' }}
            transition={{
              delay: start + i * step,
              y: { type: 'spring', stiffness: 170, damping: 19, delay: start + i * step },
              opacity: { duration: 0.5, delay: start + i * step },
              filter: { duration: 0.6, delay: start + i * step },
            }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  )
}

/** Number that counts up from 0 on mount, then tweens to each new live value. */
export function CountUp({
  value,
  delay = 0,
  duration = 1.9,
  className,
}: {
  value: number
  delay?: number
  duration?: number
  className?: string
}) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('en-US'))
  const introDone = useRef(false)
  const mountedAt = useRef(0)

  useEffect(() => {
    if (!mountedAt.current) mountedAt.current = performance.now()
    // live values can change mid-intro: keep the intro on its original schedule instead of restarting it
    const elapsed = (performance.now() - mountedAt.current) / 1000
    const intro = !introDone.current
    const controls = animate(mv, value, {
      duration: intro ? Math.max(0.6, duration - Math.max(0, elapsed - delay)) : 0.9,
      delay: intro ? Math.max(0, delay - elapsed) : 0,
      ease: EASE_OUT,
      onComplete: () => {
        introDone.current = true
      },
    })
    return () => controls.stop()
  }, [value, delay, duration, mv])

  return <motion.span className={clsx('tabular', className)}>{text}</motion.span>
}

/** Rounded sponsor/tech chip with a glowing color dot. */
export function TechChip({
  name,
  what,
  color,
  delay = 0,
}: {
  name: string
  what: string
  color: string
  delay?: number
}) {
  return (
    <motion.div
      className="flex items-center gap-2.5 rounded-full border border-white/10 bg-night-900/60 py-2 pr-4 pl-3 text-[clamp(14px,0.85vw,16px)] backdrop-blur-md"
      style={{ boxShadow: `0 0 26px -14px ${color}` }}
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2.3], opacity: [0.55, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: delay + 0.4 }}
        />
        <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      </span>
      <span className="font-bold text-cream">{name}</span>
      <span className="text-cream/55">· {what}</span>
    </motion.div>
  )
}

/** A tiny four-point sparkle that twinkles. */
export function Twinkle({
  className,
  delay = 0,
  size = 14,
  color = '#bfe3ff',
}: {
  className?: string
  delay?: number
  size?: number
  color?: string
}) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={clsx('absolute', className)}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0.35, 1, 0], scale: [0.4, 1, 0.7, 1.05, 0.4], rotate: [0, 20, 45] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay }}
      style={{ filter: `drop-shadow(0 0 6px ${color})` }}
    >
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={color} />
    </motion.svg>
  )
}
