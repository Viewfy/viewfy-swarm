// World layout + squad definitions shared by canvas, HUD and scenes.
import type { CameraTarget, PhaseId, SquadDef, SquadId } from './types'

/** World units. (0,0) is the brain / center star. */
export const WORLD = {
  brainR: 90, // radius of the center star + memory galaxy core
  squadR: 290, // ring where the 7 squads sit
  marketR: 600, // outer ring: journalists, publishers, community, signals
  extent: 700, // camera zoom=1 fits a circle of this radius into the viewport
}

export const SQUAD_ORDER: SquadId[] = ['scout', 'voice', 'press', 'community', 'ads', 'operator', 'coach']

/**
 * Viewfy stars holding / hugging the tool each job runs on (fal gpt-image-2.5 edits of the mascot + the real logo).
 * Trimmed transparent PNGs, max 380px. Full-size sources sit next to them in /brand/logo-mascots/<brand>.png.
 */
export const LOGO_MASCOTS: Record<string, string> = Object.fromEntries(
  ['x', 'gmail', 'apify', 'river', 'gbrain', 'memorable', 'qm', 'chrome', 'cua', 'superset', 'ufo', 'ads'].map((b) => [
    b,
    `/brand/logo-mascots/sprites/${b}-380.png`,
  ]),
)

/** Which tool each squad's leader shows off. Brain (center) stays the waving hero star. */
export const LOGO_MASCOT_FOR_SQUAD: Record<SquadId, string> = {
  scout: 'apify',
  voice: 'river',
  press: 'gmail',
  community: 'x',
  ads: 'ads',
  operator: 'chrome',
  coach: 'gbrain',
}

export const SQUADS: Record<SquadId, SquadDef> = {
  scout: {
    id: 'scout',
    name: 'Research',
    role: 'Finds journalists, publishers & X threads',
    color: '#6ee7b7',
    mascot: LOGO_MASCOTS.apify,
    powered: 'Apify',
  },
  voice: {
    id: 'voice',
    name: 'Copywriter',
    role: 'Writes everything in your voice',
    color: '#a78bfa',
    mascot: LOGO_MASCOTS.river,
    powered: 'River',
  },
  press: {
    id: 'press',
    name: 'PR',
    role: 'Pitches journalists & publishers',
    color: '#ff8a70',
    mascot: LOGO_MASCOTS.gmail,
    powered: 'Gmail',
  },
  community: {
    id: 'community',
    name: 'Community',
    role: 'Replies & posts on X',
    color: '#7cc4fa',
    mascot: LOGO_MASCOTS.x,
    powered: 'X',
  },
  ads: {
    id: 'ads',
    name: 'Paid Ads',
    role: 'Turns winning posts into Google, Meta & ChatGPT ads',
    color: '#fb923c',
    mascot: LOGO_MASCOTS.ads,
    powered: 'Google · Meta · ChatGPT ads',
  },
  operator: {
    id: 'operator',
    name: 'Browser Agent',
    role: 'Drives X & Gmail like a human',
    color: '#f472b6',
    mascot: LOGO_MASCOTS.chrome,
    powered: 'Computer use',
  },
  coach: {
    id: 'coach',
    name: 'Analytics',
    role: 'Scores results, updates playbooks',
    color: '#f6c667',
    mascot: LOGO_MASCOTS.gbrain,
    powered: 'gbrain · Memorable · River RL',
  },
}

export const BRAIN = {
  name: 'Memory',
  role: 'Remembers everything the swarm did',
  color: '#88c8f8',
  mascot: '/brand/viewfy-hero.png',
  powered: 'gbrain',
}

export const PHASES: { id: PhaseId; label: string; squad: SquadId | 'brain'; blurb: string }[] = [
  { id: 'sense', label: 'Research', squad: 'scout', blurb: 'Research scans news, X and inboxes' },
  { id: 'recall', label: 'Context', squad: 'brain', blurb: 'Memory recalls who we know and what worked' },
  { id: 'draft', label: 'Write', squad: 'voice', blurb: 'River writes in your brand voice' },
  { id: 'act', label: 'Send', squad: 'operator', blurb: 'Browser agent sends & posts' },
  { id: 'measure', label: 'Track', squad: 'community', blurb: 'Replies, likes, meetings booked' },
  { id: 'learn', label: 'Optimize', squad: 'coach', blurb: 'Memory · playbooks · fine-tuning' },
]

export const MARKET_COLORS = {
  journalist: '#ff8a70',
  publisher: '#f6c667',
  community: '#7cc4fa',
  signal: '#6ee7b7',
} as const

export function squadAngle(id: SquadId): number {
  const i = SQUAD_ORDER.indexOf(id)
  return -Math.PI / 2 + (i * Math.PI * 2) / SQUAD_ORDER.length
}

export function squadPos(id: SquadId): { x: number; y: number } {
  const a = squadAngle(id)
  return { x: Math.cos(a) * WORLD.squadR, y: Math.sin(a) * WORLD.squadR }
}

export function polar(angle: number, radius: number): { x: number; y: number } {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

/** Camera presets. Scenes may also build their own targets. */
export const CAMERA: Record<'hero' | 'floor' | 'close', CameraTarget> = {
  hero: { x: 0, y: 0, zoom: 3.2, anchorX: 0.7, anchorY: 0.52, dim: 0.35 },
  floor: { x: 0, y: 0, zoom: 1, anchorX: 0.5, anchorY: 0.53, dim: 0 },
  close: { x: 0, y: 0, zoom: 1.35, anchorX: 0.5, anchorY: 0.5, dim: 0.45 },
}

/** Camera focused on a squad, with the squad placed at a given screen anchor. */
export function cameraOnSquad(id: SquadId, zoom = 2, anchorX = 0.3, anchorY = 0.5, dim = 0.2): CameraTarget {
  const p = squadPos(id)
  return { x: p.x, y: p.y, zoom, anchorX, anchorY, dim }
}

/**
 * Mascot sprites (trimmed, small) for the canvas swarm — one job variant per squad.
 * `<id>-160.png` = squad leader: the star with its tool (logo-mascot; the old job pose is kept as `<id>-job-160.png`),
 * `<id>-mini-64.png` = tiny micro-agent in that squad's swarm.
 */
export const SPRITES = {
  leader: (id: SquadId) => `/brand/sprites/${id}-160.png`,
  mini: (id: SquadId) => `/brand/sprites/${id}-mini-64.png`,
  brain: '/brand/sprites/brain-160.png', // waving hero star at the center
  brainWise: '/brand/sprites/brain-wise-160.png', // star on a pile of books holding an orb (memory)
  star: '/brand/sprites/star-64.png', // plain star — generic micro-agent
  happy: '/brand/sprites/happy-160.png', // reply / meeting celebration
  sad: '/brand/sprites/sad-160.png', // bounced / ignored
  team: '/brand/sprites/team-160.png', // wizard team — "hire your swarm"
  traffic: '/brand/sprites/traffic-160.png', // three stars — a squad
  wizard: '/brand/sprites/wizard-160.png',
}

/** Full-size mascot images by job, for scenes (all transparent PNGs in /brand). */
export const MASCOTS = {
  hero: '/brand/viewfy-hero.png',
  sit: '/brand/viewfy-mascot.png',
  happy: '/brand/viewfy-happy.png',
  sad: '/brand/viewfy-sad.png',
  scout: '/brand/viewfy-scout.png',
  writer: '/brand/blogger-mascot.png',
  draft: '/brand/scout-draft-mascot.png',
  inbox: '/brand/viewfy-inbox.png',
  mail: '/brand/linkbuilder-mascot.png',
  social: '/brand/viewfy-social.png',
  chrome: '/brand/viewfy-chrome.png',
  auditor: '/brand/seo-auditor-mascot.png',
  learn1: '/brand/viewfy-learn-1.png',
  learn7: '/brand/viewfy-learn-7.png',
  learn30: '/brand/viewfy-learn-30.png',
  learn90: '/brand/viewfy-learn-90.png',
  team: '/brand/viewfy-hire-team.png',
  wizard: '/brand/viewfy-hire-wizard.png',
  wizardMail: '/brand/viewfy-hire-wizard-mail.png',
  traffic: '/brand/viewfy-traffic.png',
  mentions: '/brand/viewfy-mentions.png',
  reddit: '/brand/viewfy-reddit.png',
  geo: '/brand/viewfy-geo.png',
  roam: '/brand/viewfy-roam.png',
  star: '/brand/viewfy-star.png',
}
