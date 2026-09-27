// Append-only run ledger: data/ledger.jsonl (one JSON object per line).
// Every learn call and every headless loop (hourly cron or manual) lands here.
// Never throws: a broken ledger must not take the server down.

import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const LEDGER_PATH = resolve(
  process.env.LEDGER_PATH ?? resolve(import.meta.dir, '..', 'data', 'ledger.jsonl'),
)

export type LedgerKind = 'learn' | 'hourly' | 'manual'

export interface LedgerEntry {
  at: string // ISO timestamp
  kind: LedgerKind
  loop?: number
  summary?: string
  memories: number // memories submitted
  remembered: number // memories gbrain accepted
  real: boolean // gbrain was the real CLI (not the in-memory fallback)
  ms?: number // how long the brain writes took
  sources?: string[] // gbrain page slugs written
  [extra: string]: unknown
}

// Serialize writes so concurrent appends never interleave.
let chain: Promise<unknown> = Promise.resolve()

export function appendLedger(entry: LedgerEntry): Promise<boolean> {
  const line = JSON.stringify(entry) + '\n'
  const job = chain.then(async () => {
    try {
      await mkdir(dirname(LEDGER_PATH), { recursive: true })
      await appendFile(LEDGER_PATH, line, 'utf8')
      return true
    } catch (err) {
      console.error(`[ledger] append failed: ${(err as Error).message}`)
      return false
    }
  })
  chain = job
  return job
}

/** All parsed entries, oldest first. Bad lines are skipped. */
export async function readAll(): Promise<LedgerEntry[]> {
  let raw = ''
  try {
    raw = await readFile(LEDGER_PATH, 'utf8')
  } catch {
    return [] // no ledger yet
  }
  const out: LedgerEntry[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      out.push(JSON.parse(t) as LedgerEntry)
    } catch {
      /* skip a torn line */
    }
  }
  return out
}

/** Latest entries, newest first. */
export async function readLedger(limit = 20): Promise<{ total: number; entries: LedgerEntry[] }> {
  const all = await readAll()
  return { total: all.length, entries: all.slice(-limit).reverse() }
}
