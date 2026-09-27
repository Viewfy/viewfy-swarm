// STUB — the HUD agent replaces this. Keep exports: default FloorHud, named LoopPill.
import { useSwarm } from '../engine/store'

export function LoopPill() {
  const loop = useSwarm((s) => s.loop)
  const phase = useSwarm((s) => s.phase)
  return (
    <div className="glass px-4 py-2 text-sm tabular">
      Loop #{loop} · {phase}
    </div>
  )
}

export default function FloorHud() {
  return null
}
