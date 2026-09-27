// Data contracts for the JSON files in web/public/data/.
// Every file is optional: the engine falls back to built-in defaults when a file is missing.
// `real: true` means the data came from a live API (Apify / River / gbrain), not a hand-written fallback.

export interface Tweet {
  id: string
  text: string
  createdAt: string
  likes: number
  replies: number
  retweets: number
  views?: number
  url?: string
}

/** web/public/data/voice-corpus.json */
export interface VoiceCorpus {
  handle: string
  fetchedAt: string
  real: boolean
  tweets: Tweet[]
  /** Gmail is not connected for the demo: these are synthetic founder emails in the same voice. */
  gmailSamples: { subject: string; text: string }[]
}

/** web/public/data/fingerprint.json */
export interface Fingerprint {
  /** 5-7 traits, value 0..1, e.g. Direct, Warm, Playful, Technical, Concise, Confident */
  traits: { name: string; value: number }[]
  signaturePhrases: string[]
  avgWords: number
  emojiRate: number
  examples: string[]
}

/** web/public/data/targets.json */
export interface Signal {
  id: string
  title: string
  outlet: string
  url: string
  date?: string
}
export interface Journalist {
  id: string
  /** fictional persona name */
  name: string
  /** real outlet */
  outlet: string
  beat: string
  /** id of a Signal this journalist would care about */
  signalId?: string
}
export interface Publisher {
  id: string
  name: string
  domain: string
  kind: 'newsletter' | 'blog' | 'podcast' | 'media' | 'community'
  audience?: string
}
export interface CommunityPost {
  id: string
  /** masked handle, e.g. "@jes***" */
  handle: string
  text: string
  url?: string
  likes?: number
  topic: string
}
export interface Targets {
  fetchedAt: string
  real: boolean
  signals: Signal[]
  journalists: Journalist[]
  publishers: Publisher[]
  community: CommunityPost[]
}

/** web/public/data/training.json */
export interface TrainingRun {
  provider: 'river'
  real: boolean
  baseModel: string
  adapter: string
  examples: number
  steps: { step: number; loss: number }[]
  voiceMatch: number
  notes?: string
  startedAt?: string
  finishedAt?: string
}

/** web/public/data/drafts.json */
export interface Draft {
  targetId: string
  channel: 'gmail' | 'x_reply' | 'x_post'
  voice: 'founder' | 'company'
  subject?: string
  text: string
  voiceMatch: number
  real: boolean
}
export interface Drafts {
  drafts: Draft[]
  /** bland "generic AI" versions of a few drafts, for the side-by-side comparison */
  generic: { targetId: string; text: string }[]
}
