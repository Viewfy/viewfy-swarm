// Memory scene — "It remembers everything. …and gets better every hour."
// Brain star + memory galaxy sit on the left (drawn by the canvas); this overlay fills the right ~62%.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { setCamera, useSwarm } from '../engine/store'
import type { LearnSummary } from '../engine/types'
import { useStageScale } from './memory/shared'
import LayerCards from './memory/LayerCards'
import BrainTerminal from './memory/BrainTerminal'
import DayStrip from './memory/DayStrip'

const TOP = 72 // clears the LoopPill
const BOTTOM = 58 // clears the nav dots
const RIGHT = 40

function Headline({ size }: { size: number }) {
  return (
    <div className="relative shrink-0" style={{ textShadow: '0 2px 28px rgb(5 8 20 / 0.95), 0 0 2px rgb(5 8 20 / 0.6)' }}>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
        className="leading-[1.02] font-black tracking-tight text-cream"
        style={{ fontSize: size }}
      >
        It{' '}
        <span className="relative text-star">
          remembers
          <motion.span
            className="absolute inset-x-0 -bottom-1 h-[5px] origin-left rounded-full bg-star/60"
            style={{ boxShadow: '0 0 18px #88c8f8' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
          />
        </span>{' '}
        everything.
      </motion.h1>
      <div className="mt-2 flex items-center gap-6">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
          className="shrink-0 text-[26px] leading-tight font-light text-cream/75"
        >
          …and gets <span className="font-black text-gold">better every hour</span>.
        </motion.p>
        <LearnedFlash />
      </div>
    </div>
  )
}

/** A small gold line that flashes whenever the loop writes a new learning. */
function LearnedFlash() {
  const last = useSwarm((s) => s.lastLearned)
  const seen = useRef<LearnSummary | null>(last)
  const [show, setShow] = useState<LearnSummary | null>(null)

  useEffect(() => {
    if (!last || last === seen.current) return
    seen.current = last
    setShow(last)
    const t = window.setTimeout(() => setShow(null), 6500)
    return () => window.clearTimeout(t)
  }, [last])

  const what = show
    ? (show.notes[0] ?? (show.workflowSaved ? `saved "${show.workflowSaved}"` : `+${show.memoriesAdded} memories`))
    : ''

  return (
    <div className="min-w-0 flex-1">
      <AnimatePresence>
        {show && (
          <motion.div
            key={show.loop}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="ml-auto flex w-fit max-w-full items-center gap-2.5 rounded-full border border-gold/30 bg-gold/10 py-1.5 pr-4 pl-3 text-[14px]"
            style={{ boxShadow: '0 0 30px -8px #f6c667' }}
          >
            <motion.span
              className="text-gold"
              animate={{ rotate: [0, 180], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              ✦
            </motion.span>
            <span className="shrink-0 font-black text-gold">Run #{show.loop} insight:</span>
            <span className="truncate text-cream/85">{what}</span>
            {show.memoriesAdded > 0 && (
              <span className="tabular shrink-0 text-gold/70">+{show.memoriesAdded}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Founder-scribble annotation above the brain star. */
function BrainNote({ s }: { s: number }) {
  return (
    <motion.div
      className="absolute -translate-x-1/2 text-center font-hand leading-none text-star"
      style={{ left: '24%', top: `calc(50% - ${216 * s}px)`, fontSize: 30 * s, rotate: -4 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
    >
      <div style={{ fontSize: 26 * s }} className="text-star/80">
        every person, pitch &amp; reply
      </div>
      <div className="mt-1 font-bold">lives in its brain ↓</div>
    </motion.div>
  )
}

export default function MemoryScene() {
  useEffect(() => {
    setCamera({ x: 0, y: 0, zoom: 2.3, anchorX: 0.24, anchorY: 0.5, dim: 0.25 })
  }, [])

  const { s, vw, vh } = useStageScale()
  const boxW = Math.round(vw * 0.62)
  // The LoopPill (~300px, fixed px) sits top-right; keep the headline's text left of it (≈10.9px per font px).
  const headSize = Math.max(48, Math.min(64, (boxW + RIGHT - 320 / s - 12) / 10.9))

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* soft shade that seats the overlay on the right without hiding the sky */}
      <div
        className="absolute inset-y-0 right-0 w-[72%]"
        style={{ background: 'linear-gradient(90deg, transparent, rgb(5 8 20 / 0.5) 22%, rgb(5 8 20 / 0.62))' }}
      />

      <BrainNote s={s} />

      <div className="absolute top-0 right-0" style={{ zoom: s, width: boxW + RIGHT, height: vh }}>
        <div className="absolute flex flex-col gap-4" style={{ top: TOP, bottom: BOTTOM, right: RIGHT, width: boxW }}>
          <Headline size={headSize} />
          <LayerCards />
          <BrainTerminal />
          <DayStrip />
        </div>
      </div>
    </div>
  )
}
