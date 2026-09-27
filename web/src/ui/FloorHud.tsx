// HUD overlay for the "floor" scene. The center stays open so the swarm canvas shows through.
// Exports: default FloorHud, named LoopPill (App shows the pill on other scenes too).
import { motion } from 'motion/react'
import LoopPill from './LoopPill'
import { Brand, SponsorChips } from './TopBar'
import SquadRail from './SquadRail'
import LiveFeed from './LiveFeed'
import KpiStrip from './KpiStrip'
import PhaseTimeline from './PhaseTimeline'
import LearnedToast from './LearnedToast'
import Controls from './Controls'
import { HUD } from './format'

export { LoopPill }

export default function FloorHud() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-cream">
      {/* top bar: brand · sponsor chips · loop pill */}
      <motion.div
        className="absolute inset-x-6 top-5 flex items-start gap-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Brand />
        <div className="flex min-w-0 flex-1 justify-center pt-2">
          <SponsorChips />
        </div>
        <LoopPill />
      </motion.div>

      {/* left rail: squads */}
      <aside className="absolute left-6" style={{ top: HUD.top, bottom: HUD.bottom, width: HUD.leftRail }}>
        <SquadRail />
      </aside>

      {/* right rail: live feed */}
      <motion.aside
        className="absolute right-6"
        style={{ top: HUD.top, bottom: HUD.bottom, width: HUD.rightRail }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 24 }}
      >
        <LiveFeed />
      </motion.aside>

      {/* bottom center: KPIs + phase timeline (above the scene dots) */}
      <motion.div
        className="absolute bottom-[56px] left-1/2 flex w-[min(1040px,calc(100%-48px))] -translate-x-1/2 flex-col gap-2.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
      >
        <KpiStrip />
        <PhaseTimeline />
      </motion.div>

      {/* bottom left: demo controls (the only clickable bit) */}
      <div className="absolute bottom-3 left-6">
        <Controls />
      </div>

      <LearnedToast />
    </div>
  )
}
