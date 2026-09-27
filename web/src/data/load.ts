// Loads /data/*.json with per-file fallback to built-in data.
// Called at init and at the start of every loop, so files written late appear without a refresh.
import type { BrainSnapshot, DataBundle } from '../engine/types'
import type { Drafts, Fingerprint, Targets, TrainingRun, VoiceCorpus } from './types'
import {
  FALLBACK_BRAIN,
  FALLBACK_CORPUS,
  FALLBACK_DRAFTS,
  FALLBACK_FINGERPRINT,
  FALLBACK_TARGETS,
  FALLBACK_TRAINING,
} from './fallback'

const isArr = Array.isArray
type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !isArr(x)

async function fetchJson(name: string): Promise<unknown | null> {
  try {
    if (typeof fetch !== 'function') return null
    const res = await fetch(`/data/${name}.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    // Vite serves index.html for missing files, so parse the text defensively.
    const text = await res.text()
    if (!text || text.trimStart()[0] === '<') return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

function validCorpus(x: unknown): x is VoiceCorpus {
  return isObj(x) && isArr(x.tweets) && x.tweets.length > 0
}
function validFingerprint(x: unknown): x is Fingerprint {
  return isObj(x) && isArr(x.traits) && x.traits.length > 0
}
function validTargets(x: unknown): x is Targets {
  return (
    isObj(x) &&
    (isArr(x.journalists) || isArr(x.community) || isArr(x.publishers) || isArr(x.signals))
  )
}
function validTraining(x: unknown): x is TrainingRun {
  return isObj(x) && isArr(x.steps) && x.steps.length > 1
}
function validDrafts(x: unknown): x is Drafts {
  return isObj(x) && isArr(x.drafts) && x.drafts.length > 0
}
function validBrain(x: unknown): x is BrainSnapshot {
  return isObj(x) && (typeof x.pages === 'number' || isArr(x.sampleQueries))
}

function normCorpus(c: VoiceCorpus): VoiceCorpus {
  return {
    ...FALLBACK_CORPUS,
    ...c,
    tweets: c.tweets.filter((t) => t && typeof t.text === 'string'),
    gmailSamples: isArr(c.gmailSamples) && c.gmailSamples.length ? c.gmailSamples : FALLBACK_CORPUS.gmailSamples,
  }
}
function normTargets(t: Targets): Targets {
  // Missing sections are filled from the fallback so the ring never has an empty arc.
  const pickArr = <T,>(a: T[] | undefined, fb: T[]) => (isArr(a) && a.length ? a : fb)
  return {
    fetchedAt: t.fetchedAt ?? FALLBACK_TARGETS.fetchedAt,
    real: !!t.real,
    signals: pickArr(t.signals, FALLBACK_TARGETS.signals).filter((s) => s && s.id && s.title),
    journalists: pickArr(t.journalists, FALLBACK_TARGETS.journalists).filter((j) => j && j.id && j.name),
    publishers: pickArr(t.publishers, FALLBACK_TARGETS.publishers).filter((p) => p && p.id && p.name),
    community: pickArr(t.community, FALLBACK_TARGETS.community).filter((c) => c && c.id && c.handle),
  }
}
function normDrafts(d: Drafts): Drafts {
  return {
    drafts: d.drafts.filter((x) => x && x.targetId && typeof x.text === 'string'),
    generic: isArr(d.generic) && d.generic.length ? d.generic : FALLBACK_DRAFTS.generic,
  }
}
function normBrain(b: BrainSnapshot): BrainSnapshot {
  return {
    real: !!b.real,
    pages: typeof b.pages === 'number' ? b.pages : FALLBACK_BRAIN.pages,
    sampleQueries: isArr(b.sampleQueries) && b.sampleQueries.length ? b.sampleQueries : FALLBACK_BRAIN.sampleQueries,
  }
}

export async function loadData(): Promise<DataBundle> {
  const [corpus, fingerprint, targets, training, drafts, brain] = await Promise.all([
    fetchJson('voice-corpus'),
    fetchJson('fingerprint'),
    fetchJson('targets'),
    fetchJson('training'),
    fetchJson('drafts'),
    fetchJson('brain'),
  ])
  const ok = {
    corpus: validCorpus(corpus),
    fingerprint: validFingerprint(fingerprint),
    targets: validTargets(targets),
    training: validTraining(training),
    drafts: validDrafts(drafts),
    brain: validBrain(brain),
  }
  return {
    corpus: ok.corpus ? normCorpus(corpus as VoiceCorpus) : FALLBACK_CORPUS,
    fingerprint: ok.fingerprint ? { ...FALLBACK_FINGERPRINT, ...(fingerprint as Fingerprint) } : FALLBACK_FINGERPRINT,
    targets: ok.targets ? normTargets(targets as Targets) : FALLBACK_TARGETS,
    training: ok.training ? { ...FALLBACK_TRAINING, ...(training as TrainingRun) } : FALLBACK_TRAINING,
    drafts: ok.drafts ? normDrafts(drafts as Drafts) : FALLBACK_DRAFTS,
    brain: ok.brain ? normBrain(brain as BrainSnapshot) : FALLBACK_BRAIN,
    loaded: ok,
  }
}

/** Synchronous built-in bundle (used before the first fetch resolves, and in tests). */
export function fallbackData(): DataBundle {
  return {
    corpus: FALLBACK_CORPUS,
    fingerprint: FALLBACK_FINGERPRINT,
    targets: FALLBACK_TARGETS,
    training: FALLBACK_TRAINING,
    drafts: FALLBACK_DRAFTS,
    brain: FALLBACK_BRAIN,
    loaded: { corpus: false, fingerprint: false, targets: false, training: false, drafts: false, brain: false },
  }
}
