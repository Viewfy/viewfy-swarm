// Top-left brand + top-center sponsor/infra chips with live numbers.
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { BRAIN, SPRITES, SQUADS } from '../engine/layout'
import AnimatedNumber from './AnimatedNumber'
import { fmtPct0, rgba } from './format'

export function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 rounded-full blur-md"
          style={{ background: `radial-gradient(circle, ${rgba(BRAIN.color, 0.55)}, transparent 70%)` }}
        />
        <motion.img
          src={SPRITES.brain}
          alt=""
          className="relative h-12 w-12 object-contain drop-shadow-[0_4px_12px_rgba(136,200,248,0.35)]"
          animate={{ y: [0, -3, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="leading-none">
        <div className="text-[28px] font-black tracking-tight text-cream">
          Viewfy <span className="text-star">Swarm</span>
        </div>
        <div className="mt-1.5 text-[11px] whitespace-nowrap text-cream/50">
          <span className="tracking-[0.16em] uppercase">AI sales floor · QM room</span>{' '}
          <span className="font-bold text-star/80">#gtm-floor</span>
        </div>
      </div>
    </div>
  )
}

function Chip({ color, name, children, delay }: { color: string; name: string; children?: ReactNode; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-night-900/65 px-2.5 py-1.5 text-[12px] whitespace-nowrap backdrop-blur-md min-[1680px]:gap-2 min-[1680px]:px-3 min-[1680px]:text-[13px]"
      style={{ boxShadow: `0 0 24px -12px ${color}` }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="font-black" style={{ color }}>
        {name}
      </span>
      {children && <span className="text-cream/70">{children}</span>}
    </motion.div>
  )
}

export function SponsorChips() {
  const voiceMatch = useSwarm((s) => s.kpis.voiceMatch)
  const memories = useSwarm((s) => s.kpis.memories)
  const workflows = useSwarm((s) => s.kpis.workflows)
  const scouts = useSwarm((s) => s.squads.scout.workers)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 min-[1680px]:gap-2">
      <Chip color={SQUADS.voice.color} name="River" delay={0.05}>
        voice · <AnimatedNumber value={voiceMatch} format={fmtPct0} className="font-bold text-cream" /> match
      </Chip>
      <Chip color={BRAIN.color} name="gbrain" delay={0.11}>
        · <AnimatedNumber value={memories} className="font-bold text-cream" /> memories
      </Chip>
      <Chip color={SQUADS.coach.color} name="Memorable" delay={0.17}>
        · <AnimatedNumber value={workflows} className="font-bold text-cream" /> workflows
      </Chip>
      <Chip color={SQUADS.scout.color} name="Apify" delay={0.23}>
        scouts · <AnimatedNumber value={scouts} className="font-bold text-cream" />
      </Chip>
      <Chip color="#bfe3ff" name="QM" delay={0.29}>
        · hourly
      </Chip>
    </div>
  )
}
