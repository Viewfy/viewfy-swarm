// Shared helpers for the Voice + Hands scenes: a 1920×1080 design stage, data with local fallbacks,
// and a human-feeling typewriter.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSwarm } from '../../engine/store'
import type { Drafts, Fingerprint, Targets, TrainingRun, VoiceCorpus, Draft } from '../../data/types'

// ---------------------------------------------------------------------------------------------
// Stage: children are laid out in design pixels (1920 wide at 16:9) and scaled to the viewport.
// W/H are the stage size in design px (H grows on 16:10 screens so extra room goes to the bottom).
// ---------------------------------------------------------------------------------------------
export interface StageDims {
  s: number
  W: number
  H: number
}
const StageCtx = createContext<StageDims>({ s: 1, W: 1920, H: 1080 })
export const useStage = () => useContext(StageCtx)

function calcStage(): StageDims {
  const w = window.innerWidth
  const h = window.innerHeight
  const s = Math.min(w / 1920, h / 1080)
  return { s, W: w / s, H: h / s }
}

export function Stage({ children }: { children: ReactNode }) {
  const [dims, setDims] = useState(calcStage)
  useEffect(() => {
    const on = () => setDims(calcStage())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return (
    <StageCtx.Provider value={dims}>
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: dims.W, height: dims.H, transform: `scale(${dims.s})` }}
      >
        {children}
      </div>
    </StageCtx.Provider>
  )
}

// ---------------------------------------------------------------------------------------------
// Data: prefer the engine's DataBundle; if it isn't there yet, fetch /data/*.json ourselves;
// anything still missing falls back to the built-ins below.
// ---------------------------------------------------------------------------------------------
export interface VoiceData {
  corpus: VoiceCorpus
  fingerprint: Fingerprint
  training: TrainingRun
  drafts: Drafts
  targets: Targets
}

type Partial5 = Partial<VoiceData>
let fetched: Promise<Partial5> | null = null
function fetchLocal(): Promise<Partial5> {
  if (fetched) return fetched
  const get = <T,>(f: string) =>
    fetch(`/data/${f}`)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : undefined))
      .catch(() => undefined)
  fetched = Promise.all([
    get<VoiceCorpus>('voice-corpus.json'),
    get<Fingerprint>('fingerprint.json'),
    get<TrainingRun>('training.json'),
    get<Drafts>('drafts.json'),
    get<Targets>('targets.json'),
  ]).then(([corpus, fingerprint, training, drafts, targets]) => ({ corpus, fingerprint, training, drafts, targets }))
  return fetched
}

export function useVoiceData(): VoiceData {
  const bundle = useSwarm((s) => s.data)
  const [local, setLocal] = useState<Partial5>({})
  useEffect(() => {
    let alive = true
    void fetchLocal().then((d) => alive && setLocal(d))
    return () => {
      alive = false
    }
  }, [])
  return useMemo(() => {
    const pick = <K extends keyof VoiceData>(k: K, ok: (v: VoiceData[K]) => boolean): VoiceData[K] => {
      const b = bundle?.[k] as VoiceData[K] | undefined
      if (b && ok(b)) return b
      const l = local[k]
      if (l && ok(l)) return l
      return FALLBACK[k]
    }
    return {
      corpus: pick('corpus', (c) => Array.isArray(c?.tweets) && c.tweets.length > 0),
      fingerprint: pick('fingerprint', (f) => Array.isArray(f?.traits) && f.traits.length >= 3),
      training: pick('training', (t) => Array.isArray(t?.steps) && t.steps.length > 3),
      drafts: pick('drafts', (d) => Array.isArray(d?.drafts) && d.drafts.length > 0),
      targets: pick('targets', (t) => Array.isArray(t?.journalists) && Array.isArray(t?.community)),
    }
  }, [bundle, local])
}

// ---------------------------------------------------------------------------------------------
// Target helpers
// ---------------------------------------------------------------------------------------------
export interface TargetInfo {
  label: string // "Maya Chen"
  sub: string // "TechCrunch · AI agents"
  email?: string
  kind: 'journalist' | 'publisher' | 'community' | 'self'
}

function outletDomain(outlet: string): string {
  const o = outlet.toLowerCase().trim()
  const known: Record<string, string> = {
    'the verge': 'theverge.com',
    'wired': 'wired.com',
    'the information': 'theinformation.com',
    'business insider': 'businessinsider.com',
    'fast company': 'fastcompany.com',
    'mit technology review': 'technologyreview.com',
    'venturebeat': 'venturebeat.com',
  }
  return known[o] ?? `${o.replace(/[^a-z0-9]/g, '')}.com`
}

export function targetInfo(targets: Targets, id: string): TargetInfo {
  const j = targets.journalists?.find((x) => x.id === id) ?? FALLBACK.targets.journalists.find((x) => x.id === id)
  if (j) {
    const first = j.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')
    return { label: j.name, sub: `${j.outlet} · ${j.beat}`, email: `${first}@${outletDomain(j.outlet)}`, kind: 'journalist' }
  }
  const p = targets.publishers?.find((x) => x.id === id) ?? FALLBACK.targets.publishers.find((x) => x.id === id)
  if (p) {
    return { label: p.name, sub: `${p.kind}${p.audience ? ` · ${p.audience}` : ''}`, email: `editor@${p.domain}`, kind: 'publisher' }
  }
  const c = targets.community?.find((x) => x.id === id) ?? FALLBACK.targets.community.find((x) => x.id === id)
  if (c) return { label: c.handle, sub: `X · ${c.topic}`, kind: 'community' }
  return { label: 'Launch post', sub: '@viewfy_ai on X', kind: 'self' }
}

export function communityPost(targets: Targets, id: string) {
  return targets.community?.find((x) => x.id === id) ?? FALLBACK.targets.community.find((x) => x.id === id)
}

export function avgVoiceMatch(drafts: Draft[]): number {
  const v = drafts.map((d) => d.voiceMatch).filter((x) => x > 0)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0.95
}

// ---------------------------------------------------------------------------------------------
// Typewriter: per-char schedule with human jitter (pauses after punctuation / newlines).
// ---------------------------------------------------------------------------------------------
function hash(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function typeSchedule(text: string, cps: number): number[] {
  const base = 1000 / cps
  const out: number[] = []
  let t = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    let d = base * (0.55 + hash(i + text.length) * 0.9)
    const prev = text[i - 1]
    if (prev === '.' || prev === '!' || prev === '?') d += base * 3
    else if (prev === ',') d += base * 1.5
    if (ch === '\n') d += base * 2
    t += d
    out.push(t)
  }
  return out
}

/** Count of chars revealed, starting `delay` ms after `runKey` changes (or `active` turns on). */
export function useTypewriter(text: string, { cps = 60, delay = 0, active = true, runKey = '' } = {}): number {
  const [n, setN] = useState(0)
  const sched = useMemo(() => typeSchedule(text, cps), [text, cps])
  const raf = useRef(0)
  useEffect(() => {
    setN(0)
    if (!active) return
    const start = performance.now() + delay
    const tick = () => {
      const el = performance.now() - start
      let lo = 0
      if (el > 0) {
        // binary search #chars whose time <= el
        let hi = sched.length
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (sched[mid] <= el) lo = mid + 1
          else hi = mid
        }
      }
      setN(lo)
      if (lo < text.length) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [sched, text, delay, active, runKey])
  return n
}

export function Caret({ color = '#a78bfa', className = '' }: { color?: string; className?: string }) {
  return (
    <span
      className={`ml-[1px] inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-pulse rounded-full ${className}`}
      style={{ background: color }}
    />
  )
}

export const stripUrls = (t: string) => t.replace(/https?:\/\/\S+/g, '').replace(/\s+\n/g, '\n').trim()

export function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

// ---------------------------------------------------------------------------------------------
// Built-in fallbacks (shapes match web/public/data/*.json)
// ---------------------------------------------------------------------------------------------
const lossSteps = Array.from({ length: 40 }, (_, i) => ({
  step: i + 1,
  loss: +(0.9 + 3.0 * Math.exp(-i / 11) + (hash(i) - 0.5) * 0.08).toFixed(3),
}))

export const FALLBACK: VoiceData = {
  corpus: {
    handle: '@viewfy_ai',
    fetchedAt: '2026-09-27T00:00:00Z',
    real: false,
    tweets: [
      "Watching what founders actually approve, the deciding factor isn't the writing. It's thread age. Under a few hours old: approved.",
      'Capped our draft Reddit replies at 2-5 sentences this week. The long ones always read like a pitch wearing a helpful hat.',
      'build distribution, not 100 apps',
      "viewfy's seo fixes land as a pull request, not a locked report. you merge it, app logic stays untouched. 💙",
      'the buyers are already typing the question. go find it.',
      "Scanned 156 Show HN launches from last month. 23 block Anthropic's crawler. Zero block OpenAI.",
      'Every marketing tool we tried ended in a task list. So we made the output a diff.',
      'The honest version of "marketing while building": you do it in 90-second decisions.',
      "Had a call with $500M ARR company today selling my software. I don't have experience in b2b sales. Fun 🤣",
      'the first $1k bought the map. now the same miles take fewer wrong turns.',
    ].map((text, i) => ({ id: `f${i}`, text, createdAt: '', likes: Math.round(hash(i) * 12), replies: 0, retweets: 0 })),
    gmailSamples: [],
  },
  fingerprint: {
    traits: [
      { name: 'Direct', value: 0.92 },
      { name: 'Concise', value: 0.8 },
      { name: 'Technical', value: 0.73 },
      { name: 'Confident', value: 0.81 },
      { name: 'Warm', value: 0.59 },
      { name: 'Playful', value: 0.46 },
    ],
    signaturePhrases: ['Shipped … this week', '💙', "Now it's …", 'You still approve before anything posts', 'build distribution, not 100 apps', 'keep building'],
    avgWords: 19,
    emojiRate: 0.18,
    examples: [],
  },
  training: {
    provider: 'river',
    real: false,
    baseModel: 'Qwen/Qwen3.5-9B',
    adapter: 'viewfy-voice-lora',
    examples: 2037,
    steps: lossSteps,
    voiceMatch: 0.96,
  },
  drafts: {
    drafts: [
      {
        targetId: 'j1',
        channel: 'gmail',
        voice: 'founder',
        subject: "solo founders are handing GTM to agents. here's what they approve",
        text: "Hi,\n\nyou cover AI agents at startups, so one data point: watching founders approve agent-written replies, the deciding factor isn't the writing. it's thread age. under a few hours old, approved. a day old, skipped.\n\nI'm building Viewfy, the growth agent that gets you users while you ship. it finds the threads, drafts in your voice, you approve before anything posts.\n\nhappy to share the numbers. 15 min?\n\nMike",
        voiceMatch: 0.94,
        real: false,
      },
      {
        targetId: 'p1',
        channel: 'gmail',
        voice: 'company',
        subject: 'guest post: why your first 100 users come from threads, not ads',
        text: "Hi,\n\nyour readers ship fast and grow slow. we have data from thousands of founder-approved replies: under a few hours old, approved. a day old, skipped. short answers get upvoted, long ones read like a pitch.\n\nwe'd like to write it up for your audience. no product pitch, just the numbers and the playbook.\n\nViewfy, the growth agent that gets you users while you ship.",
        voiceMatch: 0.95,
        real: false,
      },
      {
        targetId: 'c1',
        channel: 'x_reply',
        voice: 'founder',
        text: "don't post more. find 5 threads from this week where someone asks for exactly what you built and answer them properly. no link unless they ask. the buyers are already typing the question.",
        voiceMatch: 0.96,
        real: false,
      },
      {
        targetId: 'c8',
        channel: 'x_reply',
        voice: 'founder',
        text: 'same boat. what worked for me: build distribution, not 100 apps. one product, one channel, every day. congrats on shipping 💙',
        voiceMatch: 0.94,
        real: false,
      },
      {
        targetId: 'self-1',
        channel: 'x_post',
        voice: 'company',
        text: 'Shipped hourly outcome tracking this week. Every reply we draft now gets scored an hour later: replied, liked, booked a call. The next draft learns from it. You still approve before anything posts. 💙',
        voiceMatch: 0.95,
        real: false,
      },
    ],
    generic: [
      {
        targetId: 'j1',
        text: "Dear Journalist,\n\nI hope this email finds you well! I'm thrilled to introduce Viewfy, a cutting-edge, AI-powered growth platform that leverages state-of-the-art agentic technology to revolutionize go-to-market for startups. In today's fast-paced digital landscape, founders need innovative solutions to unlock scalable growth. I would love to schedule a call at your earliest convenience to explore potential synergies.\n\nBest regards",
      },
      {
        targetId: 'c1',
        text: 'Great question! 🚀 Growth can be challenging, but with the right strategy anything is possible! Have you considered leveraging AI-powered tools like Viewfy to supercharge your go-to-market? Check it out at viewfy.ai! #growth #startups #AI #SaaS',
      },
      {
        targetId: 'p1',
        text: 'Hello,\n\nI hope this message finds you well. We are excited to announce that Viewfy, the leading AI-driven marketing solution, is seeking collaboration opportunities with best-in-class publications such as yours. Our game-changing platform empowers businesses to maximize ROI and drive engagement. Please let us know if you would be interested in a mutually beneficial partnership.\n\nKind regards,\nThe Viewfy Team',
      },
      {
        targetId: 'self-1',
        text: "🚀 Exciting news! We're thrilled to announce our latest feature that will revolutionize the way you approach growth! Unlock the power of AI-driven insights and take your marketing to the next level. Stay tuned for more! #AI #Growth #Innovation #StartupLife",
      },
    ],
  },
  targets: {
    fetchedAt: '2026-09-27T00:00:00Z',
    real: false,
    signals: [],
    journalists: [
      { id: 'j1', name: 'Maya Chen', outlet: 'TechCrunch', beat: 'AI agents & startups' },
      { id: 'j2', name: 'Sarah Okafor', outlet: 'The Verge', beat: 'AI search' },
      { id: 'j3', name: 'Dan Reyes', outlet: 'Business Insider', beat: 'solo founders' },
      { id: 'j4', name: 'Priya Nair', outlet: 'Wired', beat: 'AI moderation' },
      { id: 'j5', name: 'Tom Becker', outlet: 'Fast Company', beat: 'small business' },
      { id: 'j6', name: 'Lena Park', outlet: 'The Information', beat: 'AI revenue' },
    ],
    publishers: [
      { id: 'p1', name: "Lenny's Newsletter", domain: 'lennysnewsletter.com', kind: 'newsletter', audience: '1M+ PMs & founders' },
      { id: 'p2', name: 'Indie Hackers', domain: 'indiehackers.com', kind: 'community', audience: 'bootstrappers' },
      { id: 'p3', name: 'My First Million', domain: 'mfmpod.com', kind: 'podcast', audience: 'founders' },
      { id: 'p4', name: 'Hacker Noon', domain: 'hackernoon.com', kind: 'blog', audience: 'devs' },
    ],
    community: [
      { id: 'c1', handle: '@jes***', topic: 'first users', likes: 42, text: 'launched 3 weeks ago. 40 signups, posting on X every day and nothing moves. how did you actually get your first 100 users?' },
      { id: 'c2', handle: '@dev***', topic: 'AI search', likes: 18, text: "why doesn't ChatGPT ever mention my product? competitors show up, we don't. is there an 'SEO for AI' thing I'm missing?" },
      { id: 'c3', handle: '@ana***', topic: 'Reddit', likes: 27, text: 'every time I reply on Reddit about my tool it gets removed. what am I doing wrong?' },
      { id: 'c4', handle: '@bui***', topic: 'distribution', likes: 64, text: 'I can ship a feature in a day but marketing feels impossible. anyone else scared of distribution?' },
      { id: 'c5', handle: '@kai***', topic: 'pricing', likes: 12, text: 'no idea how to price my SaaS. $9? $29? $99? how did you figure it out?' },
      { id: 'c6', handle: '@mar***', topic: 'engagement', likes: 9, text: 'spent 2 hours writing the perfect reply to a thread. zero views. what gives?' },
      { id: 'c7', handle: '@tob***', topic: 'SEO', likes: 21, text: 'is it even worth replying to old threads? the OP already picked a tool.' },
      { id: 'c8', handle: '@lu***', topic: 'launch', likes: 88, text: 'shipped my 4th app this year. still 0 paying users. starting to think the problem is not the product.' },
    ],
  },
}
