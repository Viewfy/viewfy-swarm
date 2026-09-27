// Engine contracts shared by the engine, the swarm canvas, the HUD and all scenes.
// Keep this file stable — many modules are built against it in parallel.

import type {
  VoiceCorpus,
  Fingerprint,
  Targets,
  TrainingRun,
  Drafts,
} from '../data/types'

export type SquadId = 'scout' | 'voice' | 'press' | 'community' | 'ads' | 'operator' | 'coach'

/** Hourly loop phases, in order. */
export type PhaseId = 'sense' | 'recall' | 'draft' | 'act' | 'measure' | 'learn'

export interface SquadDef {
  id: SquadId
  name: string // "Scout"
  role: string // "Finds journalists, publishers & X threads"
  color: string // hex
  mascot: string // /brand/... image
  powered: string // "Apify"
}

export interface SquadState {
  id: SquadId
  status: 'idle' | 'working'
  task: string // current task line, e.g. "Scanning 1,240 X posts…"
  workers: number // micro-agents in this squad (drives particle count)
  done: number // tasks completed (lifetime)
}

export type MarketKind = 'journalist' | 'publisher' | 'community' | 'signal'
export type MarketNodeState = 'dormant' | 'found' | 'contacted' | 'replied' | 'meeting'

/** A node on the outer "market" ring: a person/publication/post the swarm can reach. */
export interface MarketNode {
  id: string // matches target ids from targets.json (j1, p1, c1, s1…) or generated
  kind: MarketKind
  label: string // "Maya Chen" / "@jes***" / "Lenny's Newsletter"
  sub?: string // "TechCrunch · AI" / topic
  state: MarketNodeState
  angle: number // radians, position on the ring
  radius: number // world units from center (≈ WORLD.marketR ± jitter)
}

export type FeedTone = 'info' | 'act' | 'success' | 'learn' | 'warn'

export interface FeedItem {
  id: string
  at: number // Date.now()
  loop: number
  squad: SquadId | 'brain'
  text: string // one line, e.g. "Pitched Maya Chen (TechCrunch) — data angle"
  detail?: string // optional second line / quote
  tone: FeedTone
}

export interface Kpis {
  loopsRun: number
  pitches: number // emails to journalists + publishers
  xReplies: number // replies posted on X
  posts: number // company posts on X
  repliesIn: number // responses received
  meetings: number
  impressions: number
  voiceMatch: number // 0..1
  memories: number // gbrain pages/facts
  workflows: number // Memorable workflows
  reward: number // River RL avg reward 0..1
  replyRateHistory: number[] // reply rate per loop (0..1), grows over time → "it learns"
}

export interface ComputerUseState {
  active: boolean
  app: 'x' | 'gmail'
  to: string // "@jes***" or "maya@techcrunch.com"
  subject?: string
  context?: string // the post being replied to (X) or thread snippet
  text: string // full text to type
  typed: number // chars typed so far (0..text.length)
  status: 'idle' | 'typing' | 'sent'
}

export interface MemoryItem {
  id: string
  text: string
  source: string // gbrain page slug, e.g. "people/maya-chen"
  at: number
  loop: number
}

export interface Workflow {
  id: string
  name: string // "news-jack pitch · data angle v4"
  winRate: number // 0..1
  uses: number
  loop: number // loop when saved/updated
}

export interface LearnSummary {
  loop: number
  memoriesAdded: number
  workflowSaved?: string
  rewardDelta: number // e.g. +0.032
  replyRate: number
  notes: string[] // "Lead with a number — 3/4 replies did"
}

/** Where the swarm canvas camera should look. Scenes set this; the canvas tweens to it. */
export interface CameraTarget {
  x: number // world coords of focus point (0,0 = the brain / center star)
  y: number
  zoom: number // 1 = whole world (market ring) fits the viewport
  anchorX: number // where on screen the focus point sits, 0..1 (0.5 = center)
  anchorY: number
  dim: number // 0..1 darken the swarm so overlays are readable
}

export interface DataBundle {
  corpus: VoiceCorpus
  fingerprint: Fingerprint
  targets: Targets
  training: TrainingRun
  drafts: Drafts
  /** which files were loaded from /data (true) vs built-in fallback (false) */
  loaded: Record<'corpus' | 'fingerprint' | 'targets' | 'training' | 'drafts' | 'brain', boolean>
  brain: BrainSnapshot
}

export interface BrainHit {
  title: string
  snippet: string
  source?: string
}

export interface BrainSnapshot {
  real: boolean
  pages: number
  sampleQueries: { q: string; hits: BrainHit[] }[]
}

/** Transient visual events for the canvas (particles, pulses). Not stored in state. */
export type SwarmEvent =
  | { type: 'phase'; phase: PhaseId; loop: number }
  | { type: 'scout'; squad: SquadId; to: string } // micro-agents fly out to a market node and come back
  | { type: 'found'; node: string } // market node lights up
  | { type: 'transmit'; from: SquadId; to: string; kind: 'pitch' | 'reply' | 'post' } // shooting star out
  | { type: 'response'; from: string; kind: 'reply' | 'like' | 'meeting' } // gold spark back to the brain
  | { type: 'handoff'; from: SquadId | 'brain'; to: SquadId | 'brain' } // squad → squad stream
  | { type: 'memory'; count: number } // brain absorbs new memories
  | { type: 'pulse'; squad: SquadId | 'brain' }
  | { type: 'loopDone'; summary: LearnSummary }

export interface EngineState {
  ready: boolean
  running: boolean // auto-runs loops back to back (demo) when true
  speed: number // 1 = demo speed (one hourly loop ≈ 30s); 2 = faster; 0.5 = slower
  loop: number // current loop number (starts ~38: there is history)
  phase: PhaseId
  phaseProgress: number // 0..1 within current phase
  loopProgress: number // 0..1 within current loop
  inLoop: boolean // false while "sleeping until next hour"
  nextHourlyRunAt: number // epoch ms of the next real top-of-hour cron run
  squads: Record<SquadId, SquadState>
  market: MarketNode[]
  feed: FeedItem[] // newest first, capped
  kpis: Kpis
  computer: ComputerUseState
  memories: MemoryItem[] // newest first, capped
  workflows: Workflow[]
  lastLearned: LearnSummary | null
  camera: CameraTarget
  data: DataBundle | null
}
