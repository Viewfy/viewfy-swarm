// Allocation-free object pools for transient swarm effects.

/** Fixed-capacity pool. Live items are items[0..n). `kill(i)` swap-removes (iterate backwards when killing). */
export class Pool<T> {
  items: T[]
  n = 0
  constructor(make: () => T, readonly cap: number) {
    this.items = Array.from({ length: cap }, make)
  }
  spawn(): T | null {
    if (this.n >= this.cap) return null
    return this.items[this.n++]
  }
  kill(i: number) {
    const last = --this.n
    if (i !== last) {
      const tmp = this.items[i]
      this.items[i] = this.items[last]
      this.items[last] = tmp
    }
  }
  clear() {
    this.n = 0
  }
}

export type Tex = HTMLCanvasElement

/** Free particle (world space). kind: 0 glow dot, 1 star shape (spins), 2 sparkle glint. */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  t0: number
  life: number
  size: number
  rot: number
  vr: number
  drag: number
  grav: number
  kind: number
  tex: Tex | null
  a: number
}
export const makeParticle = (): Particle => ({
  x: 0, y: 0, vx: 0, vy: 0, t0: 0, life: 1, size: 1, rot: 0, vr: 0, drag: 0, grav: 0, kind: 0, tex: null, a: 1,
})

export const FLIGHT_COMET = 0 // shooting star squad → node (with rider)
export const FLIGHT_SPARK = 1 // gold spark node → brain
export const FLIGHT_DUST = 2 // handoff dust mote
export const FLIGHT_MEM = 3 // memory sparkle → galaxy

/** Something travelling along a quadratic bezier (x0,y0) → (x1,y1) via (cx,cy). */
export interface Flight {
  kind: number
  t0: number
  dur: number
  x0: number
  y0: number
  cx: number
  cy: number
  x1: number
  y1: number
  tex: Tex | null
  size: number
  si: number // squad index (rider / color), -1 brain
  big: boolean
  node: string
}
export const makeFlight = (): Flight => ({
  kind: 0, t0: 0, dur: 1, x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0, tex: null, size: 1, si: -1, big: false, node: '',
})

/** Expanding ring pulse (world space). w = line width in screen px. */
export interface Ring {
  x: number
  y: number
  r0: number
  r1: number
  t0: number
  dur: number
  color: string
  w: number
  a: number
}
export const makeRing = (): Ring => ({ x: 0, y: 0, r0: 0, r1: 1, t0: 0, dur: 1, color: '#fff', w: 1, a: 1 })

/** Happy mascot pop at a node. */
export interface Pop {
  x: number
  y: number
  t0: number
}
export const makePop = (): Pop => ({ x: 0, y: 0, t0: 0 })

// ---- easing / curve helpers ----
export const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u)
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
export const easeOut = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u)
export const easeInOutSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2
export const easeOutBack = (u: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2)
}
export const qb = (a: number, c: number, b: number, u: number) => {
  const v = 1 - u
  return v * v * a + 2 * v * u * c + u * u * b
}
