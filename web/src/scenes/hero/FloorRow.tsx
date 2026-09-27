// "Meet the floor": six job mascots pop in with a springy stagger, then idle-bob out of phase.
import { motion } from 'motion/react'
import { MASCOTS, SQUADS } from '../../engine/layout'
import { useSwarm } from '../../engine/store'
import type { SquadId } from '../../engine/types'

const CREW: { squad: SquadId; img: string; name: string }[] = [
  { squad: 'scout', img: MASCOTS.scout, name: 'Scout' },
  { squad: 'voice', img: MASCOTS.writer, name: 'Voice' },
  { squad: 'press', img: MASCOTS.inbox, name: 'Press' },
  { squad: 'community', img: MASCOTS.social, name: 'Community' },
  { squad: 'operator', img: MASCOTS.chrome, name: 'Operator' },
  { squad: 'coach', img: MASCOTS.auditor, name: 'Coach' },
]

export default function FloorRow({ delay = 0 }: { delay?: number }) {
  const agents = useSwarm((s) => Object.values(s.squads).reduce((n, q) => n + q.workers, 0))

  return (
    <div>
      <motion.div
        className="mb-[2.2vh] flex items-center gap-3 text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay }}
      >
        <span className="text-cream/80">Meet the floor</span>
        <span className="h-px w-8 bg-white/20" />
        <span>
          6 squads · <span className="tabular">{agents}</span> micro-agents
        </span>
      </motion.div>

      <div className="flex items-end gap-[clamp(14px,1.45vw,30px)]">
        {CREW.map((c, i) => {
          const color = SQUADS[c.squad].color
          return (
            <motion.div
              key={c.squad}
              className="flex w-[clamp(66px,4.6vw,88px)] flex-col items-center"
              initial={{ opacity: 0, y: 40, scale: 0.3, rotate: i % 2 ? 14 : -14 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 14,
                mass: 0.9,
                delay: delay + 0.15 + i * 0.09,
                opacity: { duration: 0.25, delay: delay + 0.15 + i * 0.09 },
              }}
            >
              <div className="relative aspect-square w-full">
                {/* soft squad-colored halo */}
                <motion.div
                  className="absolute inset-[-18%] rounded-full blur-xl"
                  style={{ background: `radial-gradient(circle, ${color}55 0%, ${color}14 45%, transparent 70%)` }}
                  animate={{ opacity: [0.55, 1, 0.55], scale: [0.92, 1.04, 0.92] }}
                  transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.41 }}
                />
                {/* ground shadow that breathes with the bob */}
                <motion.div
                  className="absolute bottom-[-4%] left-1/2 h-[10%] w-[62%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[3px]"
                  animate={{ scaleX: [1, 0.82, 1], opacity: [0.7, 0.45, 0.7] }}
                  transition={{ duration: 2.3 + i * 0.21, repeat: Infinity, ease: 'easeInOut', delay: i * 0.37 }}
                />
                <motion.img
                  src={c.img}
                  alt={c.name}
                  draggable={false}
                  className="relative h-full w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]"
                  animate={{ y: [0, -7, 0], rotate: [0, i % 2 ? 2.5 : -2.5, 0] }}
                  transition={{ duration: 2.3 + i * 0.21, repeat: Infinity, ease: 'easeInOut', delay: i * 0.37 }}
                />
              </div>
              <div
                className="mt-2.5 text-[clamp(14px,0.9vw,17px)] leading-none font-black tracking-tight whitespace-nowrap"
                style={{ color, textShadow: `0 0 14px ${color}66` }}
              >
                {c.name}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
