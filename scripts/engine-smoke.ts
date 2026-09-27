// Headless smoke test for the loop engine (fallback data path).
// Run: bun scripts/engine-smoke.ts [seconds=8] [speed=10]
import { initEngine, setSpeed, stopEngine } from '../web/src/engine/engine.ts'
import { bus, useSwarm } from '../web/src/engine/store.ts'
import type { SwarmEvent } from '../web/src/engine/types.ts'

const secs = Number(process.argv[2] ?? 8)
const speed = Number(process.argv[3] ?? 10)

// no network → every file falls back to built-in data; /api/learn fails silently
globalThis.fetch = (async () => {
  throw new Error('offline (smoke test)')
}) as unknown as typeof fetch

const events: Record<string, number> = {}
const phases: string[] = []
bus.on((e: SwarmEvent) => {
  events[e.type] = (events[e.type] ?? 0) + 1
  if (e.type === 'phase') phases.push(`${e.loop}:${e.phase}`)
  if (e.type === 'loopDone') console.log(`  loopDone ${e.summary.loop}`, JSON.stringify(e.summary))
})

let sets = 0
let typingSeen = 0
let maxTyped = ''
useSwarm.subscribe((s) => {
  sets++
  if (s.computer.active && s.computer.status === 'typing') {
    typingSeen++
    maxTyped = `${s.computer.app} → ${s.computer.to}: ${s.computer.typed}/${s.computer.text.length}`
  }
})

setSpeed(speed)
await initEngine()
const s0 = useSwarm.getState()
console.log('ready', s0.ready, 'loaded', s0.data?.loaded, 'market', s0.market.length, 'nodes')
console.log(
  '  by kind',
  Object.entries(s0.market.reduce<Record<string, number>>((a, n) => ((a[n.kind] = (a[n.kind] ?? 0) + 1), a), {})),
)
const t0 = Date.now()
await new Promise((r) => setTimeout(r, secs * 1000))
stopEngine()
const s = useSwarm.getState()
console.log(`\nran ${((Date.now() - t0) / 1000).toFixed(1)}s at speed ${speed}: ${sets} setStates (${(sets / secs).toFixed(1)}/s)`)
console.log('phases', phases.join(' → '))
console.log('events', events)
console.log('computer typing updates', typingSeen, 'last', maxTyped)
console.log('state', { loop: s.loop, phase: s.phase, inLoop: s.inLoop, loopProgress: s.loopProgress.toFixed(2) })
const { replyRateHistory, ...k } = s.kpis
console.log('kpis', k)
console.log('replyRateHistory tail', replyRateHistory.slice(-5))
console.log('market states', s.market.reduce<Record<string, number>>((a, n) => ((a[n.state] = (a[n.state] ?? 0) + 1), a), {}))
console.log('squads', Object.values(s.squads).map((q) => `${q.id}[${q.status}] ${q.task}`))
console.log('workflows', s.workflows.map((w) => `${w.name} ${Math.round(w.winRate * 100)}% x${w.uses}`))
console.log('memories', s.memories.length, s.memories.slice(0, 4).map((m) => m.text))
console.log('lastLearned', s.lastLearned)
console.log(`\nfeed (${s.feed.length}, newest first):`)
for (const f of s.feed.slice(0, 60).reverse()) console.log(`  [${f.loop}] ${f.tone.padEnd(7)} ${f.squad.padEnd(9)} ${f.text}${f.detail ? `\n${' '.repeat(29)}${f.detail}` : ''}`)
process.exit(0)
