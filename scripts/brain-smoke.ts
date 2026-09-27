#!/usr/bin/env bun
// Smoke test for server/gbrain.ts against the real gbrain CLI (falls back to the in-memory store).
// Also writes web/public/data/brain.json (the UI's offline fallback) from real query results.
// Usage: bun scripts/brain-smoke.ts [--no-write]   (--no-remember skips the test write)
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { recent, remember, search, stats, type BrainHit } from '../server/gbrain'

const ROOT = join(import.meta.dir, '..')
const args = new Set(process.argv.slice(2))
const t = async <T>(label: string, fn: () => Promise<T>) => {
  const t0 = performance.now()
  const v = await fn()
  console.log(`${label.padEnd(28)} ${Math.round(performance.now() - t0)}ms`)
  return v
}

const s0 = await t('stats()', stats)
console.log(`  real=${s0.real} pages=${s0.pages}`)

const queries = ['TechCrunch', 'data angle', 'what worked on X']
const sampleQueries: { q: string; hits: BrainHit[] }[] = []
for (const q of queries) {
  const hits = await t(`search("${q}")`, () => search(q, 5))
  sampleQueries.push({ q, hits })
  for (const h of hits.slice(0, 3)) console.log(`  - ${h.source} · ${h.title} · ${h.snippet.slice(0, 90)}`)
  if (!hits.length) console.log('  (no hits)')
}

if (!args.has('--no-remember')) {
  const ok = await t('remember()', () =>
    remember('Smoke test: pitching with one chart plus a number gets faster replies from TechCrunch.', 'smoke/brain-smoke'),
  )
  console.log(`  ok=${ok}`)
  const again = await t('search("smoke test")', () => search('smoke test', 3))
  console.log(`  found after remember: ${again.some((h) => h.source?.startsWith('learned/smoke'))}`)
}

const r = await t('recent(5)', () => recent(5))
for (const h of r) console.log(`  - ${h.source} · ${h.title}`)

const s1 = await stats()
if (!args.has('--no-write')) {
  const out = { real: s1.real, pages: s1.pages, sampleQueries }
  writeFileSync(join(ROOT, 'web/public/data/brain.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`wrote web/public/data/brain.json (real=${s1.real}, pages=${s1.pages})`)
}
