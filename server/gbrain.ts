// gbrain adapter. STUB — replaced by the real CLI-backed implementation.
// Keep these exports stable: server/index.ts depends on them.

export interface BrainHit {
  title: string
  snippet: string
  source?: string
}

const mem: { text: string; source: string; at: string }[] = []

export async function remember(text: string, source: string): Promise<boolean> {
  mem.push({ text, source, at: new Date().toISOString() })
  return true
}

export async function search(q: string, limit = 5): Promise<BrainHit[]> {
  const needle = q.toLowerCase()
  return mem
    .filter((m) => m.text.toLowerCase().includes(needle))
    .slice(-limit)
    .map((m) => ({ title: m.source, snippet: m.text, source: m.source }))
}

export async function stats(): Promise<{ pages: number; real: boolean }> {
  return { pages: mem.length, real: false }
}

export async function recent(limit = 10): Promise<BrainHit[]> {
  return mem.slice(-limit).map((m) => ({ title: m.source, snippet: m.text, source: m.source }))
}
