// The Operator's agent cursor: pink arrow + "Operator" pill + tiny chrome mascot. Springs between
// fields and leaves a ripple on every click.
import { AnimatePresence, motion } from 'motion/react'
import { MASCOTS } from '../../engine/layout'

const PINK = '#f472b6'

export default function AgentCursor({ x, y, clickSeq }: { x: number; y: number; clickSeq: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-30"
      initial={false}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 90, damping: 17, mass: 1 }}
    >
      {/* click ripples, centered on the hotspot */}
      <AnimatePresence initial={false}>
        <motion.span
          key={clickSeq}
          className="absolute -top-6 -left-6 h-12 w-12 rounded-full"
          style={{ border: `2.5px solid ${PINK}`, background: 'rgb(244 114 182 / 0.18)' }}
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      </AnimatePresence>
      <motion.div key={`press-${clickSeq}`} initial={{ scale: 0.82 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} style={{ originX: 0, originY: 0 }}>
        <svg width="30" height="34" viewBox="0 0 30 34" className="drop-shadow-[0_4px_10px_rgba(244,114,182,0.55)]">
          <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill={PINK} stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <div className="absolute top-[26px] left-[20px] flex items-center gap-1.5 rounded-full py-[3px] pr-3 pl-[3px] text-[13px] font-bold whitespace-nowrap text-night-950 shadow-lg" style={{ background: PINK, boxShadow: '0 6px 20px -4px rgb(244 114 182 / 0.7)' }}>
        <span className="flex h-[28px] w-[28px] items-center justify-center overflow-hidden rounded-full bg-night-900">
          <motion.img
            src={MASCOTS.chrome}
            alt=""
            className="h-[28px] w-[28px] object-contain"
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        Browser agent
      </div>
    </motion.div>
  )
}
