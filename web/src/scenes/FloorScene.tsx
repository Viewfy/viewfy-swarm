// Scene 2 — "The floor": the whole swarm running its hourly loop, framed between the HUD rails.
import { useEffect } from 'react'
import { setCamera } from '../engine/store'
import { CAMERA, WORLD } from '../engine/layout'
import type { CameraTarget } from '../engine/types'
import FloorHud from '../ui/FloorHud'
import { HUD } from '../ui/format'

/**
 * Fit the market ring into the open box between the rails / top bar / bottom strip.
 * Assumes zoom=1 fits WORLD.extent into half the viewport's short side.
 */
function floorCamera(): CameraTarget {
  const W = window.innerWidth
  const H = window.innerHeight
  const gap = 16
  const L = HUD.margin + HUD.leftRail + gap
  const R = W - (HUD.margin + HUD.rightRail + gap)
  const T = HUD.top - 8
  const B = H - HUD.bottom + 8
  const half = Math.max(120, Math.min(R - L, B - T) / 2)
  const pxPerUnit = Math.min(W, H) / 2 / WORLD.extent
  // let outer market nodes kiss the panels a little — the squad ring is what must breathe
  const fitR = WORLD.marketR * 0.93
  const zoom = Math.max(0.78, Math.min(1, half / (fitR * pxPerUnit)))
  return { ...CAMERA.floor, zoom, anchorX: (L + R) / 2 / W, anchorY: (T + B) / 2 / H, dim: 0 }
}

export default function FloorScene() {
  useEffect(() => {
    const apply = () => setCamera(floorCamera())
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
  return <FloorHud />
}
