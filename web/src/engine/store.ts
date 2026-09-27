// Global swarm state (zustand) + transient visual event bus.
// The engine (engine.ts) is the only writer of loop state; scenes write `camera`.
import { create } from 'zustand'
import { CAMERA, SQUAD_ORDER } from './layout'
import type { CameraTarget, EngineState, SquadId, SquadState, SwarmEvent } from './types'

function nextTopOfHour(): number {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.getTime()
}

const initialSquads = Object.fromEntries(
  SQUAD_ORDER.map((id) => [id, { id, status: 'idle', task: 'Waiting for the next loop', workers: 36, done: 0 } satisfies SquadState]),
) as Record<SquadId, SquadState>

export const initialState: EngineState = {
  ready: false,
  running: true,
  speed: 1,
  loop: 38,
  phase: 'sense',
  phaseProgress: 0,
  loopProgress: 0,
  inLoop: false,
  nextHourlyRunAt: nextTopOfHour(),
  squads: initialSquads,
  market: [],
  feed: [],
  kpis: {
    loopsRun: 37,
    pitches: 212,
    xReplies: 486,
    posts: 74,
    repliesIn: 61,
    meetings: 9,
    impressions: 184_300,
    voiceMatch: 0.93,
    memories: 1_284,
    workflows: 23,
    reward: 0.61,
    replyRateHistory: [0.03, 0.035, 0.04, 0.038, 0.047, 0.052, 0.05, 0.061, 0.066, 0.071, 0.069, 0.078, 0.084, 0.09, 0.094],
  },
  computer: { active: false, app: 'x', to: '', text: '', typed: 0, status: 'idle' },
  memories: [],
  workflows: [],
  lastLearned: null,
  camera: CAMERA.hero,
  data: null,
}

export const useSwarm = create<EngineState>()(() => initialState)

export const setCamera = (camera: CameraTarget) => useSwarm.setState({ camera })

// ---- transient event bus (particles, pulses) ----
type Listener = (e: SwarmEvent) => void
const listeners = new Set<Listener>()

export const bus = {
  emit(e: SwarmEvent) {
    for (const l of listeners) l(e)
  },
  on(fn: Listener): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}
