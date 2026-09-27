// Left rail: one card per squad (mascot, name, powered-by, status, live task line, done count).
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { SQUADS, SQUAD_ORDER } from '../engine/layout'
import type { SquadId } from '../engine/types'
import AnimatedNumber from './AnimatedNumber'
import { PulseDot } from './bits'
import { rgba } from './format'

const SHADOW_BASE = '0 24px 60px -20px rgba(0, 0, 0, 0.6)'

function SquadCard({ id, index }: { id: SquadId; index: number }) {
  const s = useSwarm((st) => st.squads[id])
  const def = SQUADS[id]
  const c = def.color
  const working = s?.status === 'working'

  return (
    <motion.div
      className="glass relative flex min-h-0 flex-1 items-center gap-3.5 px-4 py-2.5"
      initial={{ opacity: 0, x: -24 }}
      animate={{
        opacity: 1,
        x: 0,
        borderColor: working ? rgba(c, 0.5) : 'rgba(255, 255, 255, 0.09)',
        boxShadow: working ? `0 0 40px -10px ${rgba(c, 0.9)}, ${SHADOW_BASE}` : `0 0 40px -10px ${rgba(c, 0)}, ${SHADOW_BASE}`,
      }}
      transition={{
        opacity: { delay: 0.1 + index * 0.07, duration: 0.5 },
        x: { delay: 0.1 + index * 0.07, type: 'spring', stiffness: 200, damping: 24 },
        default: { duration: 0.5, ease: 'easeOut' },
      }}
    >
      {/* soft inner wash when working */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{ background: `linear-gradient(100deg, ${rgba(c, 0.13)}, transparent 55%)` }}
        animate={{ opacity: working ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      <div
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 58%, ${rgba(c, working ? 0.42 : 0.26)}, ${rgba(c, 0.07)} 62%, transparent 74%)`,
          boxShadow: `inset 0 0 0 1px ${rgba(c, 0.18)}`,
        }}
      >
        <motion.img
          src={def.mascot}
          alt=""
          className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
          animate={working ? { y: [0, -3, 0], rotate: [0, -5, 0, 5, 0] } : { y: 0, rotate: 0 }}
          transition={working ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
        />
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[16px] leading-tight font-black tracking-tight text-cream">{def.name}</span>
          <PulseDot color={working ? c : 'rgba(248, 245, 241, 0.25)'} active={working} size={7} />
          <span className="ml-auto shrink-0 text-[11px] text-cream/40">
            <AnimatedNumber value={s?.done ?? 0} className="text-[13px] font-bold text-cream/80" /> done
          </span>
        </div>
        <div className="truncate text-[12px] leading-tight font-bold" style={{ color: c }} title={`powered by ${def.powered}`}>
          <span className="font-normal text-cream/35">powered by </span>
          {def.powered}
        </div>
        <div className="relative mt-1 min-h-5 overflow-hidden text-[14px] leading-snug">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={s?.task ?? ''}
              className={`truncate [@media(min-height:1000px)]:line-clamp-2 [@media(min-height:1000px)]:whitespace-normal ${
                working ? 'text-cream/90' : 'text-cream/50'
              }`}
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {s?.task || 'Waiting for the next loop'}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function SquadRail() {
  return (
    <div className="flex h-full flex-col gap-2">
      {SQUAD_ORDER.map((id, i) => (
        <SquadCard key={id} id={id} index={i} />
      ))}
    </div>
  )
}
