// Compact loop status: loop #, current phase (squad color), loop progress, next cron run, running state.
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { useSwarm } from '../engine/store'
import { BRAIN } from '../engine/layout'
import { PulseDot, IconPause } from './bits'
import { clockTime, colorOf, phaseDef, rgba } from './format'

export default function LoopPill({ className }: { className?: string }) {
  const loop = useSwarm((s) => s.loop)
  const phase = useSwarm((s) => s.phase)
  const inLoop = useSwarm((s) => s.inLoop)
  const running = useSwarm((s) => s.running)
  const speed = useSwarm((s) => s.speed)
  const loopProgress = useSwarm((s) => s.loopProgress)
  const nextRun = useSwarm((s) => s.nextHourlyRunAt)

  const p = phaseDef(phase)
  const color = inLoop ? colorOf(p.squad) : BRAIN.color
  const label = inLoop ? p.label : running ? 'Standing by' : 'Paused'
  const progress = inLoop ? Math.max(0, Math.min(1, loopProgress)) : 0

  return (
    <div
      className={clsx('glass w-[288px] px-4 pt-3 pb-2.5 transition-shadow duration-700 min-[1680px]:w-[300px]', className)}
      style={{ boxShadow: `0 0 44px -16px ${rgba(color, 0.55)}, 0 24px 60px -20px rgba(0,0,0,0.6)` }}
    >
      <div className="flex items-center gap-2.5">
        <PulseDot color={color} active={running && inLoop} size={8} />
        <span className="text-[11px] font-bold tracking-[0.2em] text-cream/50 uppercase">Loop</span>
        <span className="tabular text-[18px] leading-none font-black tracking-tight text-cream">#{loop}</span>
        <span className="h-4 w-px bg-white/15" />
        <span className="relative flex h-5 min-w-0 flex-1 items-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label}
              className="truncate text-[15px] leading-none font-black tracking-tight"
              style={{ color }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
        {running ? (
          <span className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-mint uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
            Live{speed !== 1 && <span className="tabular tracking-normal">×{speed}</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-cream/55 uppercase">
            <IconPause size={9} />
            Paused
          </span>
        )}
      </div>

      <div className="relative mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${rgba(color, 0.35)}, ${color})`,
            boxShadow: `0 0 10px ${color}`,
            transition: 'width 250ms linear, background 600ms ease',
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-cream/50">
        <span>
          next hourly run <span className="tabular font-bold text-cream/85">{clockTime(nextRun)}</span>
        </span>
        <span className="tabular tracking-wide text-cream/35">cron 0 * * * *</span>
      </div>
    </div>
  )
}
