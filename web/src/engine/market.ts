// Builds the outer "market" ring from targets, padded with ambient dormant nodes.
// Angles are deterministic per slot and preserved by id across data reloads.
import type { DataBundle, MarketKind, MarketNode } from './types'
import { WORLD } from './layout'
import { hash01 } from './rng'

const DEG = Math.PI / 180

/**
 * Arcs (degrees; 0 = right, clockwise on screen). Squads: scout top (-90), voice -30, press 30,
 * community 90, operator 150, coach 210. Signals sit above scout, journalists/publishers near the
 * press desk, the community arc (biggest) wraps the bottom.
 */
const ARCS: Record<MarketKind, { start: number; span: number; cap: number }> = {
  signal: { start: -116, span: 52, cap: 12 },
  journalist: { start: -58, span: 78, cap: 14 },
  publisher: { start: 26, span: 56, cap: 12 },
  community: { start: 88, span: 150, cap: 32 },
}

const AMBIENT: Record<MarketKind, { label: string; sub: string }[]> = {
  community: [
    '@dev***', '@ind***', '@sha***', '@bui***', '@saa***', '@nom***', '@jus***', '@kev***', '@ana***', '@mrk***',
    '@lau***', '@pix***', '@hug***', '@zoe***', '@rav***', '@eli***', '@max***', '@yuk***', '@car***', '@ted***',
    '@noa***', '@ivy***', '@sol***', '@gus***', '@fer***', '@ami***', '@leo***', '@joh***', '@mei***', '@oli***',
  ].map((label, i) => ({
    label,
    sub: ['launch week', 'first 100 users', 'pricing', 'cold outreach', 'SEO', 'build in public', 'churn', 'AI search'][i % 8],
  })),
  journalist: [
    ['Forbes', 'startups desk'], ['The Information', 'AI reporter'], ['Bloomberg Tech', 'AI & software'],
    ['VentureBeat', 'AI agents'], ['Sifted', 'European startups'], ['Fortune', 'Term Sheet'], ['The Register', 'dev tools'],
    ['Inc.', 'small business'], ['Protocol', 'enterprise AI'], ['MIT Tech Review', 'AI'], ['Semafor', 'tech'],
    ['CNBC', 'startups'], ['Reuters', 'AI'], ['ZDNet', 'SaaS'],
  ].map(([label, sub]) => ({ label, sub })),
  publisher: [
    ["Ben's Bites", 'newsletter'], ['The Rundown AI', 'newsletter'], ['Hacker Newsletter', 'newsletter'],
    ['Starter Story', 'blog'], ['Product Hunt Daily', 'newsletter'], ['Every', 'media'], ['SaaS Club', 'podcast'],
    ['Failory', 'blog'], ['Growth.Design', 'blog'], ['The Hustle', 'newsletter'], ['Indie Worldwide', 'community'],
    ['Superhuman AI', 'newsletter'],
  ].map(([label, sub]) => ({ label, sub })),
  signal: [
    ['HN front page', 'Hacker News'], ['r/SaaS · top post', 'Reddit'], ['Product Hunt · #1 today', 'Product Hunt'],
    ['r/startups thread', 'Reddit'], ["Trends · 'ai sdr'", 'Google'], ['YC launch', 'Y Combinator'],
    ['GitHub trending', 'GitHub'], ['r/Entrepreneur', 'Reddit'], ['Show HN', 'Hacker News'], ['IH milestone', 'Indie Hackers'],
    ['X trending · #buildinpublic', 'X'], ['Launch thread', 'X'],
  ].map(([label, sub]) => ({ label, sub })),
}

/** Spread order: the first k slots are well distributed across the arc. */
function spreadSlots(cap: number): number[] {
  const used = new Set<number>()
  const out: number[] = []
  for (let i = 0; out.length < cap; i++) {
    let s = Math.floor((((i * 0.6180339887 + 0.21) % 1) + 1) % 1 * cap)
    while (used.has(s)) s = (s + 1) % cap
    used.add(s)
    out.push(s)
  }
  return out
}

interface Raw {
  id: string
  kind: MarketKind
  label: string
  sub?: string
}

function realNodes(data: DataBundle): Record<MarketKind, Raw[]> {
  const t = data.targets
  return {
    journalist: t.journalists.map((j) => ({ id: j.id, kind: 'journalist', label: j.name, sub: `${j.outlet} · ${j.beat}` })),
    publisher: t.publishers.map((p) => ({ id: p.id, kind: 'publisher', label: p.name, sub: `${p.kind} · ${p.audience ?? p.domain}` })),
    community: t.community.map((c) => ({ id: c.id, kind: 'community', label: c.handle, sub: c.topic })),
    signal: t.signals.map((s) => ({ id: s.id, kind: 'signal', label: s.outlet, sub: s.title })),
  }
}

export function buildMarket(data: DataBundle, prev: MarketNode[] = []): MarketNode[] {
  const prevById = new Map(prev.map((n) => [n.id, n]))
  const reals = realNodes(data)
  const out: MarketNode[] = []
  for (const kind of ['signal', 'journalist', 'publisher', 'community'] as MarketKind[]) {
    const arc = ARCS[kind]
    const real = reals[kind]
    const cap = Math.max(arc.cap, real.length)
    const order = spreadSlots(cap)
    const bySlot: (Raw | null)[] = new Array(cap).fill(null)
    real.forEach((r, i) => (bySlot[order[i]] = r))
    let amb = 0
    for (let slot = 0; slot < cap; slot++) {
      let raw = bySlot[slot]
      if (!raw) {
        const a = AMBIENT[kind][amb++ % AMBIENT[kind].length]
        raw = { id: `a-${kind}-${slot}`, kind, label: a.label, sub: a.sub }
      }
      const old = prevById.get(raw.id)
      const step = arc.span / cap
      const angle = old?.angle ?? (arc.start + step * (slot + 0.5) + (hash01(raw.id, 1) - 0.5) * step * 0.6) * DEG
      const radius = old?.radius ?? WORLD.marketR + (hash01(raw.id, 2) * 2 - 1) * 60
      out.push({ id: raw.id, kind, label: raw.label, sub: raw.sub, state: old?.state ?? 'dormant', angle, radius })
    }
  }
  return out
}

export const isAmbient = (id: string) => id.startsWith('a-')
