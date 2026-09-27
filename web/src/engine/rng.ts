// Seeded randomness helpers (deterministic per loop).

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable 32-bit hash of a string (FNV-1a). */
export function hashStr(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Stable 0..1 from a string (+ salt). */
export function hash01(s: string, salt = 0): number {
  return mulberry32(hashStr(s) ^ Math.imul(salt + 1, 0x9e3779b1))()
}

export const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo)
export const int = (r: Rng, lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1))
export const chance = (r: Rng, p: number) => r() < p
export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length) % arr.length]
}
export function shuffle<T>(r: Rng, arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export function sample<T>(r: Rng, arr: readonly T[], n: number): T[] {
  return shuffle(r, arr).slice(0, Math.max(0, n))
}
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[@*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'x'
