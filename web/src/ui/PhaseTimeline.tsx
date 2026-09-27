// Bottom-center hourly-loop timeline: Sense → Recall → Draft → Act → Measure → Learn.
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { PHASES } from '../engine/layout'
import { colorOf, phaseDef, phaseIndex, rgba } from './format'

export default function PhaseTimeline() {
  const phase = useSwarm((s) => s.phase)
  const phaseProgress = useSwarm((s) => s.phaseProgress)
  const inLoop = useSwarm((s) => s.inLoop)
  const ai = phaseIndex(phase)
  const active = phaseDef(phase)
  const activeColor = colorOf(active.squad)

  return (
    <div className="glass flex items-center gap-5 rounded-full! px-6 py-2.5">
      <span className="shrink-0 text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Hourly loop</span>

      <div className="flex min-w-0 flex-1 items-end gap-2">
        {PHASES.map((p, i) => {
          const c = colorOf(p.squad)
          const state = !inLoop ? 'idle' : i < ai ? 'done' : i === ai ? 'active' : 'todo'
          const fill = state === 'done' ? 1 : state === 'active' ? Math.max(0, Math.min(1, phaseProgress)) : 0
          const isActive = state === 'active'
          return (
            <div key={p.id} className="min-w-0 flex-1">
              <div
                className="flex items-center gap-1.5 text-[13px] leading-none font-bold whitespace-nowrap transition-colors duration-500"
                style={{
                  color: isActive ? c : state === 'done' ? 'rgba(248,245,241,0.78)' : 'rgba(248,245,241,0.35)',
                  textShadow: isActive ? `0 0 14px ${rgba(c, 0.6)}` : 'none',
                }}
              >
                <span className="tabular text-[10px] opacity-60">{String(i + 1).padStart(2, '0')}</span>
                {p.label}
              </div>
              <div
                className="relative mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/10 transition-shadow duration-500"
                style={{ boxShadow: isActive ? `0 0 14px 1px ${rgba(c, 0.7)}` : 'none' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${fill * 100}%`,
                    background: state === 'done' ? rgba(c, 0.6) : c,
                    transition: isActive ? 'width 200ms linear' : 'width 400ms ease-out, background 400ms',
                  }}
                />
                {isActive && (
                  <motion.div
                    className="absolute inset-y-0 w-10"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }}
                    initial={{ left: '-20%' }}
                    animate={{ left: '110%' }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative h-5 w-[300px] shrink-0 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={inLoop ? active.id : 'idle'}
            className="absolute inset-0 truncate text-[14px] leading-5 text-cream/65"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {inLoop ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
                <span className="truncate">{active.blurb}</span>
              </span>
            ) : (
              'Sleeping until the next hourly run'
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
