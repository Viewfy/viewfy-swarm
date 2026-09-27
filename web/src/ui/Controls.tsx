// Bottom-left demo controls: run a loop now, pause/play, speed.
import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { useSwarm } from '../engine/store'
import { runLoopNow, setRunning, setSpeed } from '../engine/engine'
import { IconBolt, IconPause, IconPlay } from './bits'

const SPEEDS = [1, 2, 4]
// Keep focus off the buttons so Space/arrow keys keep driving scene navigation.
const noFocus = (e: MouseEvent) => e.preventDefault()

export default function Controls() {
  const running = useSwarm((s) => s.running)
  const speed = useSwarm((s) => s.speed)

  return (
    <div className="glass pointer-events-auto flex items-center gap-1 rounded-full! p-1 text-[13px]">
      <button
        onMouseDown={noFocus}
        onClick={() => runLoopNow()}
        className="flex items-center gap-2 rounded-full bg-star/15 py-1.5 pr-2 pl-3 font-bold text-star-bright transition-colors hover:bg-star/25"
      >
        <IconBolt size={13} />
        Run now
        <kbd className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 text-[11px] leading-5 font-bold text-cream/60">
          R
        </kbd>
      </button>
      <button
        onMouseDown={noFocus}
        onClick={() => setRunning(!running)}
        title={running ? 'Pause' : 'Play'}
        className="grid h-8 w-8 place-items-center rounded-full text-cream/80 transition-colors hover:bg-white/10"
      >
        {running ? <IconPause size={13} /> : <IconPlay size={13} />}
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <div className="flex items-center gap-0.5 pr-1">
        {SPEEDS.map((x) => (
          <button
            key={x}
            onMouseDown={noFocus}
            onClick={() => setSpeed(x)}
            className={clsx(
              'tabular rounded-full px-2.5 py-1.5 font-bold transition-colors',
              speed === x ? 'bg-white/12 text-cream' : 'text-cream/45 hover:bg-white/[0.06] hover:text-cream/80',
            )}
          >
            ×{x}
          </button>
        ))}
      </div>
    </div>
  )
}
