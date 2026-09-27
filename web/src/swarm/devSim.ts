// Dev-only simulator: `?sim` in the URL emits random swarm events and fills a fake market,
// so the canvas can be developed without the engine. Also exposes window.__swarm for poking.
import { bus, setCamera, useSwarm } from '../engine/store'
import { CAMERA, PHASES, SQUAD_ORDER, WORLD, cameraOnSquad } from '../engine/layout'
import type { MarketKind, MarketNode, MarketNodeState, SquadId, SwarmEvent } from '../engine/types'

const pick = <T,>(a: readonly T[]): T => a[(Math.random() * a.length) | 0]

const NAMES = [
  'Maya Chen', 'Theo Park', 'Priya Raman', 'Jonah Weiss', 'Ava Lindqvist', 'Sam Okafor', 'Lena Duarte',
  'Kenji Mori', 'Ruth Adler', 'Omar Haddad', 'Nina Petrova', 'Diego Santos',
]
const PUBS = [
  "Lenny's Newsletter", 'TechCrunch', 'The Verge', 'Stratechery', 'Every', 'Platformer', 'The Information',
  'Product Hunt Daily', 'Indie Hackers', 'SaaStr',
]
const HANDLES = ['@jes***', '@buildwith***', '@shipfast***', '@saas_***', '@dev_***', '@growth***', '@indie***', '@founder***']
const SIGNALS = ['AI launch thread', 'Funding news', 'HN front page', 'Reddit r/SaaS', 'New GTM tool', 'Hiring post']

function fakeMarket(): MarketNode[] {
  const out: MarketNode[] = []
  const plan: [MarketKind, number, string][] = [
    ['journalist', 22, 'j'],
    ['publisher', 14, 'p'],
    ['community', 30, 'c'],
    ['signal', 18, 's'],
  ]
  let total = 0
  for (const [, n] of plan) total += n
  let i = 0
  for (const [kind, n, pre] of plan) {
    for (let k = 0; k < n; k++, i++) {
      const r = Math.random()
      const state: MarketNodeState =
        r < 0.62 ? 'dormant' : r < 0.77 ? 'found' : r < 0.9 ? 'contacted' : r < 0.97 ? 'replied' : 'meeting'
      const label =
        kind === 'journalist' ? pick(NAMES) : kind === 'publisher' ? pick(PUBS) : kind === 'community' ? pick(HANDLES) : pick(SIGNALS)
      out.push({
        id: `${pre}${k + 1}`,
        kind,
        label,
        state,
        angle: ((i + Math.random() * 0.6) / total) * Math.PI * 2 - Math.PI / 2,
        radius: WORLD.marketR + (Math.random() - 0.5) * 50,
      })
    }
  }
  // shuffle kinds around the ring a bit so it looks organic
  for (let k = out.length - 1; k > 0; k--) {
    const j = (Math.random() * (k + 1)) | 0
    const a = out[k].angle
    out[k].angle = out[j].angle
    out[j].angle = a
  }
  return out
}

function setNodeState(id: string, state: MarketNodeState) {
  const order: MarketNodeState[] = ['dormant', 'found', 'contacted', 'replied', 'meeting']
  const m = useSwarm.getState().market
  const i = m.findIndex((n) => n.id === id)
  if (i < 0 || order.indexOf(m[i].state) >= order.indexOf(state)) return
  const next = m.slice()
  next[i] = { ...m[i], state }
  useSwarm.setState({ market: next })
}

export function startDevSim(): () => void {
  const st = useSwarm.getState()
  if (!st.market.length) useSwarm.setState({ market: fakeMarket() })
  ;(window as unknown as Record<string, unknown>).__swarm = { useSwarm, bus, setCamera, CAMERA, cameraOnSquad }

  const cam = new URLSearchParams(location.search).get('cam')
  if (cam === 'hero' || cam === 'floor' || cam === 'close') setCamera(CAMERA[cam])
  else if (cam && (SQUAD_ORDER as string[]).includes(cam)) setCamera(cameraOnSquad(cam as SquadId, 2.1, 0.25, 0.5))

  let phaseI = 0
  let lastProgress = -1
  let driveLoop = true

  const emit = (e: SwarmEvent) => bus.emit(e)

  const tick = () => {
    const s = useSwarm.getState()
    const nodes = s.market
    if (!nodes.length) return
    const r = Math.random()
    const node = pick(nodes)
    if (r < 0.22) {
      emit({ type: 'scout', squad: 'scout', to: node.id })
      setTimeout(() => {
        emit({ type: 'found', node: node.id })
        setNodeState(node.id, 'found')
      }, 1400)
    } else if (r < 0.46) {
      const from = pick<SquadId>(['press', 'community', 'operator', 'press', 'community'])
      emit({ type: 'transmit', from, to: node.id, kind: from === 'press' ? 'pitch' : 'reply' })
      setTimeout(() => setNodeState(node.id, 'contacted'), 1800)
    } else if (r < 0.58) {
      const meeting = Math.random() < 0.25
      emit({ type: 'response', from: node.id, kind: meeting ? 'meeting' : Math.random() < 0.5 ? 'reply' : 'like' })
      setNodeState(node.id, meeting ? 'meeting' : 'replied')
    } else if (r < 0.72) {
      const a = pick<SquadId | 'brain'>([...SQUAD_ORDER, 'brain'])
      let b = pick<SquadId | 'brain'>([...SQUAD_ORDER, 'brain'])
      if (b === a) b = a === 'brain' ? 'voice' : 'brain'
      emit({ type: 'handoff', from: a, to: b })
    } else if (r < 0.84) {
      const count = 2 + ((Math.random() * 10) | 0)
      emit({ type: 'memory', count })
      setTimeout(() => {
        const k = useSwarm.getState().kpis
        useSwarm.setState({ kpis: { ...k, memories: k.memories + count * 4 } })
      }, 1200)
    } else {
      emit({ type: 'pulse', squad: pick<SquadId | 'brain'>([...SQUAD_ORDER, 'brain']) })
    }
  }

  const loopTick = () => {
    const s = useSwarm.getState()
    if (!driveLoop) return
    if (lastProgress >= 0 && Math.abs(s.loopProgress - lastProgress) > 1e-6) {
      driveLoop = false // the real engine is driving; back off
      return
    }
    let p = s.loopProgress + 0.1 / 24
    let loop = s.loop
    if (p >= 1) {
      p = 0
      loop += 1
      emit({
        type: 'loopDone',
        summary: { loop: s.loop, memoriesAdded: 12, rewardDelta: 0.03, replyRate: 0.1, notes: [] },
      })
    }
    const newPhase = Math.min(PHASES.length - 1, Math.floor(p * PHASES.length))
    const squads = { ...s.squads }
    if (newPhase !== phaseI || p === 0) {
      phaseI = newPhase
      const ph = PHASES[phaseI]
      emit({ type: 'phase', phase: ph.id, loop })
      for (const id of SQUAD_ORDER) squads[id] = { ...squads[id], status: id === ph.squad ? 'working' : 'idle' }
    }
    lastProgress = p
    useSwarm.setState({ loopProgress: p, inLoop: true, loop, phase: PHASES[phaseI].id, squads })
  }

  const a = setInterval(tick, 420)
  const b = setInterval(loopTick, 100)
  return () => {
    clearInterval(a)
    clearInterval(b)
  }
}
