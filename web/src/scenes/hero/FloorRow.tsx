// "Meet the floor": six job mascots pop in with a springy stagger, then idle-bob out of phase.
import { motion } from 'motion/react'
import { LOGO_MASCOTS, LOGO_MASCOT_FOR_SQUAD, SQUADS } from '../../engine/layout'
import { useSwarm } from '../../engine/store'
import type { SquadId } from '../../engine/types'

// Each job holds the tool it runs on. Community hugging the huge X is the star of the row (wider + taller).
const CREW: { squad: SquadId; name: string; tool: string; big?: boolean }[] = [
  { squad: 'scout', name: 'Scout', tool: 'Apify' },
  { squad: 'voice', name: 'Voice', tool: 'River' },
  { squad: 'press', name: 'Press', tool: 'Gmail' },
  { squad: 'community', name: 'Community', tool: 'X', big: true },
  { squad: 'operator', name: 'Operator', tool: 'Chrome' },
  { squad: 'coach', name: 'Coach', tool: 'gbrain' },
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
              className={`flex flex-col items-center ${c.big ? 'w-[clamp(104px,7.4vw,142px)]' : 'w-[clamp(66px,4.6vw,88px)]'}`}
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
              <div className={`relative w-full ${c.big ? 'aspect-[1.3]' : 'aspect-square'}`}>
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
                  src={LOGO_MASCOTS[LOGO_MASCOT_FOR_SQUAD[c.squad]]}
                  alt={c.name}
                  draggable={false}
                  className="relative h-full w-full object-contain"
                  // the big black X gets a soft sky rim so it reads on the night sky
                  style={{
                    filter: c.big
                      ? 'drop-shadow(0 0 8px rgb(124 196 250 / 0.5)) drop-shadow(0 8px 14px rgb(0 0 0 / 0.45))'
                      : 'drop-shadow(0 8px 14px rgb(0 0 0 / 0.45))',
                  }}
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
              <div className="mt-1 text-[11px] leading-none font-bold tracking-[0.16em] whitespace-nowrap text-cream/45 uppercase">
                {c.tool}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
