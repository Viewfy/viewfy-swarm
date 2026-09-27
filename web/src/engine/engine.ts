// STUB — the engine agent replaces this with the real loop engine.
// Public API (keep stable): initEngine(), runLoopNow(), setRunning(), setSpeed()
import { useSwarm } from './store'

let started = false

export async function initEngine(): Promise<void> {
  if (started) return
  started = true
  useSwarm.setState({ ready: true })
}

export function runLoopNow(): void {}

export function setRunning(running: boolean): void {
  useSwarm.setState({ running })
}

export function setSpeed(speed: number): void {
  useSwarm.setState({ speed })
}
