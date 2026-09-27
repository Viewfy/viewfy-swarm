// The persistent night-sky swarm canvas. All animation lives in SwarmRenderer (rAF, no React state).
import { useEffect, useRef } from 'react'
import { SwarmRenderer } from './renderer'
import { startDevSim } from './devSim'

export default function SwarmCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const r = new SwarmRenderer(canvas)
    const stopSim = import.meta.env.DEV && location.search.includes('sim') ? startDevSim() : null
    return () => {
      r.destroy()
      stopSim?.()
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 block h-full w-full" />
}
