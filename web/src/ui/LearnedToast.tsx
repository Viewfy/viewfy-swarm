// "Loop #N learned" toast — slides in bottom-right whenever the engine publishes a new LearnSummary.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { BRAIN, MASCOTS, SQUADS } from '../engine/layout'
import type { LearnSummary } from '../engine/types'
import { IconBrain, IconFlow, IconSpark, IconTrend } from './bits'
import { rgba } from './format'

const SHOW_MS = 6000
const GOLD = '#f6c667'

const SPARKS = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 9) * Math.PI * 2 - Math.PI / 2
  const r = 46 + (i % 3) * 10
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 9 + (i % 3) * 3, d: 0.25 + (i % 4) * 0.05, c: i % 3 === 0 ? '#88c8f8' : GOLD }
})

function Line({ icon, color, children, i }: { icon: ReactNode; color: string; children: ReactNode; i: number }) {
  return (
    <motion.div
      className="flex items-center gap-2.5 text-[14px] text-cream/85"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 + i * 0.09, type: 'spring', stiffness: 260, damping: 22 }}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
        style={{ color, background: rgba(color, 0.14), boxShadow: `inset 0 0 0 1px ${rgba(color, 0.25)}` }}
      >
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </motion.div>
  )
}

function Arrow() {
  return <span className="mx-1 text-cream/35">→</span>
}

function ToastCard({ s }: { s: LearnSummary }) {
  const reward = `${s.rewardDelta >= 0 ? '+' : '−'}${Math.abs(s.rewardDelta * 100).toFixed(1)}%`
  const notes = (s.notes ?? []).slice(0, 2)

  return (
    <motion.div
      className="glass relative w-[360px] overflow-visible px-5 pt-4 pb-4"
      style={{ borderColor: rgba(GOLD, 0.35) }}
      initial={{ opacity: 0, x: 60, y: 10, scale: 0.94 }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        boxShadow: `0 0 50px -12px ${rgba(GOLD, 0.7)}, 0 24px 60px -20px rgba(0,0,0,0.7)`,
      }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.35 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
    >
      {/* warm wash */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${rgba(GOLD, 0.16)}, transparent 60%)` }}
      />

      <div className="relative flex items-center gap-3.5">
        <div className="relative h-16 w-16 shrink-0">
          {SPARKS.map((p, i) => (
            <motion.span
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{ color: p.c, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.2, 1, 0.6], rotate: 90 }}
              transition={{ delay: p.d, duration: 1.2, ease: 'easeOut' }}
            >
              <IconSpark size={p.s} />
            </motion.span>
          ))}
          <div
            className="absolute inset-0 rounded-full blur-md"
            style={{ background: `radial-gradient(circle, ${rgba(GOLD, 0.5)}, transparent 70%)` }}
          />
          <motion.img
            src={MASCOTS.happy}
            alt=""
            className="relative h-16 w-16 object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
            initial={{ scale: 0.3, rotate: -25, y: 12 }}
            animate={{ scale: 1, rotate: [-25, 10, -4, 0], y: [12, -8, 0] }}
            transition={{ delay: 0.12, duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.2em] text-gold/80 uppercase">Loop complete</div>
          <div className="text-[24px] leading-tight font-black tracking-tight text-cream">
            Loop <span className="tabular">#{s.loop}</span> <span className="text-gold">learned</span>
          </div>
        </div>
      </div>

      <div className="relative mt-3.5 flex flex-col gap-2">
        <Line i={0} color={BRAIN.color} icon={<IconBrain size={14} />}>
          <b className="tabular text-cream">+{s.memoriesAdded}</b> memories
          <Arrow />
          <b style={{ color: BRAIN.color }}>gbrain</b>
        </Line>
        <Line i={1} color={GOLD} icon={<IconFlow size={14} />}>
          {s.workflowSaved ? (
            <>
              workflow <b className="text-cream">‘{s.workflowSaved}’</b> saved
            </>
          ) : (
            <>workflows re-ranked</>
          )}
          <Arrow />
          <b style={{ color: GOLD }}>Memorable</b>
        </Line>
        <Line i={2} color={SQUADS.voice.color} icon={<IconTrend size={14} />}>
          reward <b className="tabular text-cream">{reward}</b>
          <Arrow />
          <b style={{ color: SQUADS.voice.color }}>River</b>
        </Line>
      </div>

      {notes.length > 0 && (
        <div className="relative mt-3 border-t border-white/[0.07] pt-2.5">
          {notes.map((n, i) => (
            <motion.div
              key={i}
              className="font-hand text-[22px] leading-[1.15] text-gold"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 + i * 0.15, duration: 0.5 }}
            >
              “{n}”
            </motion.div>
          ))}
        </div>
      )}

      {/* countdown */}
      <div className="absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full">
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: `linear-gradient(90deg, ${rgba(GOLD, 0.2)}, ${GOLD})` }}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: SHOW_MS / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )
}

export default function LearnedToast() {
  const last = useSwarm((s) => s.lastLearned)
  const seen = useRef(last) // don't replay a summary that already existed when the floor mounted
  const [shown, setShown] = useState<LearnSummary | null>(null)

  useEffect(() => {
    if (!last || last === seen.current) return
    seen.current = last
    setShown(last)
    const t = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [last])

  return (
    <div className="pointer-events-none absolute right-6 bottom-[200px] z-30">
      <AnimatePresence>{shown && <ToastCard key={`${shown.loop}-${shown.replyRate}`} s={shown} />}</AnimatePresence>
    </div>
  )
}
