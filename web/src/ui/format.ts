// Small formatting + color helpers for the HUD.
import { BRAIN, PHASES, SQUADS } from '../engine/layout'
import type { FeedTone, PhaseId, SquadId } from '../engine/types'

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')
export const fmtPct0 = (n: number) => `${Math.round(n * 100)}%`
export const fmtPct1 = (n: number) => `${(n * 100).toFixed(1)}%`

export function colorOf(id: SquadId | 'brain'): string {
  return id === 'brain' ? BRAIN.color : SQUADS[id].color
}

export function phaseIndex(id: PhaseId): number {
  return Math.max(0, PHASES.findIndex((p) => p.id === id))
}

export function phaseDef(id: PhaseId) {
  return PHASES[phaseIndex(id)]
}

/** '#rrggbb' + alpha → 'rgba(r, g, b, a)' (motion can interpolate these). */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export function relTime(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000))
  if (s < 3) return 'now'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export const TONE_COLOR: Record<FeedTone, string> = {
  success: '#f6c667',
  learn: '#a78bfa',
  act: '#f472b6',
  info: 'rgba(248, 245, 241, 0.72)',
  warn: '#ff8a70',
}

/** Floor HUD layout (px) — FloorScene uses these to frame the camera in the open center. */
export const HUD = {
  margin: 24,
  leftRail: 300,
  rightRail: 360,
  top: 112, // rails start below the top bar
  bottom: 196, // rails end above the KPI strip + timeline
}
