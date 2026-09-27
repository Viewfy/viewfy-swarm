// Local fallbacks so the Memory scene is alive even when the engine / gbrain server isn't feeding it yet.
import type { BrainHit, MemoryItem, Workflow } from '../../engine/types'

export const FALLBACK_MEMORIES: Omit<MemoryItem, 'id' | 'at' | 'loop'>[] = [
  { source: 'people/maya-chen', text: 'Covers AI infra at TechCrunch; replied to the data-angle pitch in 4h' },
  { source: 'replies/x-jes', text: '@jes*** said "this is the way" and followed back' },
  { source: 'learnings/loop-37', text: 'Lead with a number: 3 of 4 replies did' },
  { source: 'pitches/axios-pro-rata', text: '"We analyzed 18k agent runs…" got a meeting booked' },
  { source: 'publications/techcrunch', text: 'Prefers exclusives + one chart. Never pitch on a Friday' },
  { source: 'people/sam-okafor', text: "Writes Lenny's-style teardowns; asked for founder quotes" },
  { source: 'x/threads/agent-evals', text: 'Thread with a screenshot got 2.4× the replies of text-only' },
  { source: 'workflows/follow-up-48h', text: 'One-line bump after 48h revived 2 of 7 cold threads' },
  { source: 'signals/hn-front-page', text: '"Agents that do GTM" hit HN #3, a news-jack window of about 6h' },
  { source: 'people/priya-raman', text: 'The Verge; wants a demo video, not a deck' },
  { source: 'replies/gmail-maya', text: '"Send me the chart and I\'ll look Monday"' },
  { source: 'learnings/loop-38', text: 'Replies under 40 words from the founder get 2× more likes' },
]

export const FALLBACK_WORKFLOWS: Workflow[] = [
  { id: 'wf-news-jack', name: 'news-jack pitch · data angle v4', winRate: 0.42, uses: 31, loop: 37 },
  { id: 'wf-x-reply', name: 'X reply · build-in-public number v3', winRate: 0.34, uses: 58, loop: 35 },
  { id: 'wf-follow-up', name: 'follow-up after 48h · one-liner v2', winRate: 0.27, uses: 22, loop: 31 },
  { id: 'wf-exclusive', name: 'exclusive offer · 24h embargo v2', winRate: 0.21, uses: 9, loop: 29 },
]

export const BRAIN_QUERIES = ['TechCrunch', 'what worked on X', 'data angle'] as const

export const FALLBACK_HITS: Record<string, BrainHit[]> = {
  techcrunch: [
    {
      title: 'Maya Chen',
      source: 'people/maya-chen',
      snippet: 'TechCrunch AI desk · replied in 4h to the data-angle pitch · prefers a chart',
    },
    {
      title: 'TechCrunch pitch',
      source: 'pitches/tc-agent-benchmarks',
      snippet: 'Led with "3 of 4 founders…", 212 words, sent Tue 9:12am, got a reply',
    },
    {
      title: 'TechCrunch',
      source: 'publications/techcrunch',
      snippet: 'Wants exclusives + one chart. Friday sends: 0 of 6 replied',
    },
  ],
  'what worked on x': [
    {
      title: 'X reply workflow',
      source: 'workflows/x-reply-number-v3',
      snippet: 'Reply within 20 min, open with a build-in-public number: 3.1× the likes',
    },
    {
      title: 'Reply from @jes***',
      source: 'replies/x-jes',
      snippet: '"this is the way", then a follow and a DM asking for the demo',
    },
    {
      title: 'Loop 36 learnings',
      source: 'learnings/loop-36',
      snippet: 'Screenshots beat text-only 2.4×; threads after 9pm PT go quiet',
    },
  ],
  'data angle': [
    {
      title: 'News-jack · data angle',
      source: 'workflows/news-jack-data-v4',
      snippet: 'Lead with one number from our own data. Win rate 42% (v3 was 27%)',
    },
    {
      title: 'Loop 37 learnings',
      source: 'learnings/loop-37',
      snippet: 'Lead with a number: 3 of 4 replies did',
    },
    {
      title: 'Axios Pro Rata',
      source: 'pitches/axios-pro-rata',
      snippet: '"We analyzed 18k agent runs…" got a meeting booked for Thursday',
    },
  ],
}

export function fallbackHitsFor(q: string): BrainHit[] {
  const key = q.trim().toLowerCase()
  if (FALLBACK_HITS[key]) return FALLBACK_HITS[key]
  for (const [k, hits] of Object.entries(FALLBACK_HITS)) {
    if (key.includes(k) || k.includes(key)) return hits
  }
  return FALLBACK_HITS['data angle']
}
