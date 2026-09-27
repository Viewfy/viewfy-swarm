// The night-sky swarm renderer. One canvas, one rAF loop, reads useSwarm.getState() every frame.
import { bus, useSwarm } from '../engine/store'
import {
  MARKET_COLORS,
  MASCOTS,
  PHASES,
  SPRITES,
  SQUADS,
  SQUAD_ORDER,
  WORLD,
  squadAngle,
  squadPos,
} from '../engine/layout'
import type { CameraTarget, MarketNode, SquadId, SwarmEvent } from '../engine/types'
import {
  FLIGHT_COMET,
  FLIGHT_DUST,
  FLIGHT_MEM,
  FLIGHT_SPARK,
  Pool,
  clamp01,
  easeInOut,
  easeInOutSine,
  easeOut,
  easeOutBack,
  makeFlight,
  makeParticle,
  makePop,
  makeRing,
  qb,
  type Flight,
  type Particle,
  type Pop,
  type Ring,
  type Tex,
} from './particles'
import { glow, img, ok, rgba, sparkle, starShape } from './sprites'

const TAU = Math.PI * 2
const STAR = '#88c8f8'
const STAR_BRIGHT = '#bfe3ff'
const GOLD = '#f6c667'
const CREAM = '#f8f5f1'
const VIOLET = '#a78bfa'
const MINT = '#6ee7b7'
const WHITE = '#ffffff'

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface SquadInfo {
  id: SquadId
  color: string
  name: string
  powered: string
  poweredColor: string
  x: number
  y: number
  angle: number
  leader: HTMLImageElement
  mini64: HTMLImageElement
  mini160: HTMLImageElement
  glow: Tex
  core: Tex
  energy: number // smoothed flock speed multiplier
  flash: number // 0..1 decaying highlight
  work: number // smoothed 0..1 working
}

interface Mini {
  si: number
  a: number
  w: number
  r: number
  p1: number
  p2: number
  p3: number
  f1: number
  f2: number
  size: number
  wob: number
  wobF: number
  x: number
  y: number
  rot: number
  fade: number
  // scout missions: 0 flock, 1 out, 2 hover, 3 back
  mission: number
  mt0: number
  sx: number
  sy: number
  tx: number
  ty: number
  side: number
  slot: number
  carry: number
}

interface Wanderer {
  from: number
  to: number
  t0: number
  wait: number
  dur: number
  rOff: number
  size: number
  p: number
  x: number
  y: number
  rot: number
}

interface BgStar {
  x: number
  y: number
  d: number
  s: number
  a: number
  f: number
  p: number
  big: boolean
}

interface GalaxyDot {
  r: number
  a0: number
  size: number
  tex: Tex
  p: number
  born: number
}

interface Label {
  x: number
  y: number
  text: string
  pri: number
  nx: number
  ny: number
  gold: boolean
}

const DUST_COLORS = [STAR, STAR_BRIGHT, VIOLET]
const DUST_ALPHAS = [0.16, 0.3, 0.5]
const MAX_GALAXY = 450

export class SwarmRenderer {
  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private w = 1
  private h = 1
  private raf = 0
  private last = 0
  private t = 0
  private unsub: () => void
  private bgGrad: CanvasGradient | null = null

  // camera (current, tweened)
  private cam: CameraTarget
  private S = 1 // css px per world unit
  private OX = 0
  private OY = 0

  private squads: SquadInfo[]
  private minis: Mini[][]
  private wanderers: Wanderer[] = []
  private stars: BgStar[] = []
  private galaxy: GalaxyDot[] = []
  private galaxyShown = 0
  private dustR = new Float32Array(1200)
  private dustA = new Float32Array(1200)
  private dustW = new Float32Array(1200)
  private dustP = new Float32Array(1200)
  private dustBucket: Uint8Array = new Uint8Array(1200)
  private dustOrder: Uint16Array = new Uint16Array(1200)

  private particles = new Pool<Particle>(makeParticle, 1400)
  private flights = new Pool<Flight>(makeFlight, 500)
  private rings = new Pool<Ring>(makeRing, 120)
  private pops = new Pool<Pop>(makePop, 12)

  private brainFlash = 0
  private marketRef: MarketNode[] | null = null
  private nodes = new Map<string, MarketNode>()
  private nodeFlash = new Map<string, number>()
  private labels: Label[] = Array.from({ length: 160 }, () => ({ x: 0, y: 0, text: '', pri: 0, nx: 0, ny: 0, gold: false }))
  private labelN = 0
  private placed: number[] = [] // x0,y0,x1,y1 flat
  private textW = new Map<string, number>()

  private brainImg = img(SPRITES.brain)
  private brainHi = img(MASCOTS.hero)
  private starImg = img(SPRITES.star)
  private happyImg = img(SPRITES.happy)
  private texStar = glow(STAR)
  private texStarCore = glow(STAR, 'core')
  private texGold = glow(GOLD)
  private texGoldCore = glow(GOLD, 'core')
  private texWhite = glow(STAR_BRIGHT, 'core')
  private texMint = glow(MINT)
  private texViolet = glow(VIOLET)
  private texCream = glow(CREAM)
  private nebViolet = glow(VIOLET, 'nebula')
  private nebBlue = glow(STAR, 'nebula')
  private goldStar = starShape(GOLD)
  private spkGold = sparkle(GOLD)
  private spkMint = sparkle(MINT)
  private spkStar = sparkle(STAR_BRIGHT)
  private marketTex: Record<string, Tex> = {}
  private marketCore: Record<string, Tex> = {}

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.cam = { ...useSwarm.getState().camera }

    this.squads = SQUAD_ORDER.map((id) => {
      const d = SQUADS[id]
      const p = squadPos(id)
      return {
        id,
        color: d.color,
        name: d.name,
        powered: d.powered,
        poweredColor: rgba(d.color, 0.75),
        x: p.x,
        y: p.y,
        angle: squadAngle(id),
        leader: img(SPRITES.leader(id)),
        mini64: img(SPRITES.mini(id)),
        mini160: img(SPRITES.mini(id).replace('-64.png', '-160.png')),
        glow: glow(d.color),
        core: glow(d.color, 'core'),
        energy: 1,
        flash: 0,
        work: 0,
      }
    })
    this.minis = this.squads.map(() => [])
    for (const k of Object.keys(MARKET_COLORS) as (keyof typeof MARKET_COLORS)[]) {
      this.marketTex[k] = glow(MARKET_COLORS[k])
      this.marketCore[k] = glow(MARKET_COLORS[k], 'core')
    }

    this.initStars()
    this.initDust()
    this.initGalaxy()
    this.initWanderers()

    this.unsub = bus.on((e) => this.onEvent(e))
    window.addEventListener('resize', this.resize)
    this.resize()
    if (document.fonts) {
      void document.fonts.load('700 13px Lato')
      void document.fonts.load('400 11px Lato')
    }
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.unsub()
    window.removeEventListener('resize', this.resize)
  }

  // ------------------------------------------------------------------ setup
  private resize = () => {
    const c = this.canvas
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = Math.max(1, c.clientWidth)
    this.h = Math.max(1, c.clientHeight)
    c.width = Math.round(this.w * this.dpr)
    c.height = Math.round(this.h * this.dpr)
    const g = this.ctx.createLinearGradient(0, 0, 0, this.h)
    g.addColorStop(0, '#050814')
    g.addColorStop(1, '#0a1024')
    this.bgGrad = g
  }

  private initStars() {
    for (let i = 0; i < 350; i++) {
      const big = Math.random() < 0.06
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        d: rand(0.02, 0.14),
        s: big ? rand(1.4, 2.1) : rand(0.6, 1.3),
        a: big ? rand(0.6, 0.9) : rand(0.2, 0.65),
        f: rand(0.4, 2.2),
        p: rand(0, TAU),
        big,
      })
    }
  }

  private initDust() {
    const bands: [number, number, number][] = [
      // center, half-width, share
      [130, 30, 0.14],
      [215, 25, 0.16],
      [290, 55, 0.32],
      [440, 40, 0.2],
      [545, 45, 0.18],
    ]
    const N = this.dustR.length
    let i = 0
    for (const [c, hw, share] of bands) {
      const n = Math.round(N * share)
      for (let k = 0; k < n && i < N; k++, i++) {
        const r = c + (Math.random() + Math.random() - 1) * hw
        this.dustR[i] = r
        this.dustA[i] = rand(0, TAU)
        this.dustW[i] = (1.25 / Math.sqrt(r)) * rand(0.75, 1.25)
        this.dustP[i] = rand(0, TAU)
      }
    }
    for (; i < N; i++) {
      const r = rand(100, 600)
      this.dustR[i] = r
      this.dustA[i] = rand(0, TAU)
      this.dustW[i] = (1.25 / Math.sqrt(r)) * rand(0.75, 1.25)
      this.dustP[i] = rand(0, TAU)
    }
    for (let j = 0; j < N; j++) {
      const c = Math.random() < 0.62 ? 0 : Math.random() < 0.6 ? 1 : 2
      const a = Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2
      this.dustBucket[j] = c * 3 + a
    }
    const order = Array.from({ length: N }, (_, j) => j).sort((a, b) => this.dustBucket[a] - this.dustBucket[b])
    this.dustOrder = Uint16Array.from(order)
  }

  private initGalaxy() {
    const arms = 3
    const cols = [this.texStar, this.texStar, this.texStar, glow(STAR_BRIGHT), this.texViolet, this.texCream, this.texGold]
    for (let i = 0; i < MAX_GALAXY; i++) {
      const u = i / MAX_GALAXY
      const r = 96 + 128 * Math.pow(u, 0.85) + rand(-7, 7)
      const arm = i % arms
      this.galaxy.push({
        r,
        a0: (arm * TAU) / arms + r * 0.021 + rand(-0.2, 0.2),
        size: rand(2.2, 4.6) * (Math.random() < 0.08 ? 1.8 : 1),
        tex: cols[(Math.random() * cols.length) | 0],
        p: rand(0, TAU),
        born: -10,
      })
    }
    this.galaxyShown = Math.min(MAX_GALAXY, useSwarm.getState().kpis.memories / 4)
  }

  private initWanderers() {
    for (let i = 0; i < 12; i++) {
      const from = i % 6
      this.wanderers.push({
        from,
        to: (from + (Math.random() < 0.5 ? 1 : 5)) % 6,
        t0: -rand(0, 5),
        wait: rand(0.3, 2),
        dur: rand(3, 6),
        rOff: rand(-55, 55),
        size: rand(13, 17),
        p: rand(0, TAU),
        x: 0,
        y: 0,
        rot: 0,
      })
    }
  }

  private newMini(si: number): Mini {
    const dir = Math.random() < 0.8 ? 1 : -1
    return {
      si,
      a: rand(0, TAU),
      w: dir * rand(0.22, 0.6),
      r: 40 + Math.pow(Math.random(), 0.8) * 80,
      p1: rand(0, TAU),
      p2: rand(0, TAU),
      p3: rand(0, TAU),
      f1: rand(0.4, 1.1),
      f2: rand(1.6, 3.2),
      size: rand(12, 20),
      wob: rand(0, TAU),
      wobF: rand(1.2, 2.6),
      x: this.squads[si].x,
      y: this.squads[si].y,
      rot: 0,
      fade: 0,
      mission: 0,
      mt0: 0,
      sx: 0,
      sy: 0,
      tx: 0,
      ty: 0,
      side: 1,
      slot: 0,
      carry: -10,
    }
  }

  // ------------------------------------------------------------------ helpers
  private syncMarket(market: MarketNode[]) {
    if (market === this.marketRef) return
    this.marketRef = market
    this.nodes.clear()
    for (const n of market) this.nodes.set(n.id, n)
  }

  private nodePos(id: string): { x: number; y: number } {
    this.syncMarket(useSwarm.getState().market)
    const n = this.nodes.get(id)
    if (n) return { x: Math.cos(n.angle) * n.radius, y: Math.sin(n.angle) * n.radius }
    const a = ((hash(id) % 3600) / 3600) * TAU
    return { x: Math.cos(a) * WORLD.marketR, y: Math.sin(a) * WORLD.marketR }
  }

  private posOf(id: SquadId | 'brain'): { x: number; y: number } {
    if (id === 'brain') return { x: 0, y: 0 }
    const s = this.squads[SQUAD_ORDER.indexOf(id)]
    return { x: s.x, y: s.y }
  }

  private ring(x: number, y: number, r0: number, r1: number, dur: number, color: string, w: number, a: number, delay = 0) {
    const r = this.rings.spawn()
    if (!r) return
    r.x = x
    r.y = y
    r.r0 = r0
    r.r1 = r1
    r.t0 = this.t + delay
    r.dur = dur
    r.color = color
    r.w = w
    r.a = a
  }

  private particle(
    x: number, y: number, vx: number, vy: number, life: number, size: number,
    kind: number, tex: Tex, drag = 1.5, grav = 0, a = 1,
  ) {
    const p = this.particles.spawn()
    if (!p) return
    p.x = x
    p.y = y
    p.vx = vx
    p.vy = vy
    p.t0 = this.t
    p.life = life
    p.size = size
    p.kind = kind
    p.tex = tex
    p.drag = drag
    p.grav = grav
    p.rot = rand(0, TAU)
    p.vr = rand(-4, 4)
    p.a = a
  }

  private burst(x: number, y: number, n: number, speed: number, tex: Tex, kind: number, size: number, life: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU)
      const v = speed * rand(0.35, 1)
      this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, life * rand(0.7, 1.2), size * rand(0.7, 1.2), kind, tex, 2.2)
    }
  }

  private flight(kind: number, x0: number, y0: number, x1: number, y1: number, dur: number, bend: number, delay = 0): Flight | null {
    const f = this.flights.spawn()
    if (!f) return null
    const dx = x1 - x0
    const dy = y1 - y0
    f.kind = kind
    f.t0 = this.t + delay
    f.dur = dur
    f.x0 = x0
    f.y0 = y0
    f.x1 = x1
    f.y1 = y1
    // control point: midpoint pushed along the perpendicular
    f.cx = (x0 + x1) / 2 - dy * bend
    f.cy = (y0 + y1) / 2 + dx * bend
    f.tex = null
    f.size = 1
    f.si = -1
    f.big = false
    f.node = ''
    return f
  }

  // ------------------------------------------------------------------ events
  private onEvent(e: SwarmEvent) {
    switch (e.type) {
      case 'scout': {
        const si = SQUAD_ORDER.indexOf(e.squad)
        if (si < 0) return
        const target = this.nodePos(e.to)
        const pool = this.minis[si]
        const n = 3 + ((Math.random() * 3) | 0)
        let sent = 0
        const start = (Math.random() * pool.length) | 0
        for (let k = 0; k < pool.length && sent < n; k++) {
          const m = pool[(start + k) % pool.length]
          if (m.mission !== 0 || m.fade < 1) continue
          m.mission = 1
          m.mt0 = this.t + sent * 0.09
          m.sx = m.x
          m.sy = m.y
          const oa = (sent / n) * TAU + rand(-0.3, 0.3)
          m.tx = target.x + Math.cos(oa) * 16
          m.ty = target.y + Math.sin(oa) * 16
          m.side = Math.random() < 0.5 ? -1 : 1
          m.slot = oa
          sent++
        }
        break
      }
      case 'found': {
        const p = this.nodePos(e.node)
        const n = this.nodes.get(e.node)
        const col = n ? MARKET_COLORS[n.kind] : MINT
        this.ring(p.x, p.y, 5, 42, 1.1, col, 2, 0.9)
        this.ring(p.x, p.y, 5, 26, 0.9, WHITE, 1, 0.6, 0.15)
        this.nodeFlash.set(e.node, this.t)
        break
      }
      case 'transmit': {
        const si = SQUAD_ORDER.indexOf(e.from)
        if (si < 0) return
        const s = this.squads[si]
        const p = this.nodePos(e.to)
        const f = this.flight(FLIGHT_COMET, s.x, s.y, p.x, p.y, rand(1.6, 2.0), rand(0.12, 0.22) * (Math.random() < 0.5 ? -1 : 1))
        if (f) {
          f.si = si
          f.tex = s.glow
          f.node = e.to
        }
        s.flash = Math.max(s.flash, 0.6)
        break
      }
      case 'response': {
        const p = this.nodePos(e.from)
        const meeting = e.kind === 'meeting'
        // land on the brain's rim (not its face)
        const pl = Math.hypot(p.x, p.y) || 1
        const f = this.flight(
          FLIGHT_SPARK, p.x, p.y, (p.x / pl) * 64, (p.y / pl) * 64,
          meeting ? 2.1 : 1.7, rand(0.1, 0.2) * (Math.random() < 0.5 ? -1 : 1),
        )
        if (f) {
          f.tex = this.texGold
          f.big = meeting
          f.size = meeting ? 1.6 : e.kind === 'like' ? 0.7 : 1
        }
        this.nodeFlash.set(e.from, this.t)
        this.ring(p.x, p.y, 6, meeting ? 70 : 34, meeting ? 1.4 : 0.9, GOLD, meeting ? 3 : 1.6, 0.9)
        if (meeting) {
          this.burst(p.x, p.y, 26, 150, this.goldStar, 1, 7, 1.6)
          this.burst(p.x, p.y, 14, 110, this.spkGold, 2, 12, 1.1)
          const pop = this.pops.spawn()
          if (pop) {
            pop.x = p.x
            pop.y = p.y
            pop.t0 = this.t
          }
        }
        break
      }
      case 'handoff': {
        const a = this.posOf(e.from)
        const b = this.posOf(e.to)
        const tex = e.from === 'brain' ? this.texStar : this.squads[SQUAD_ORDER.indexOf(e.from)].glow
        const bend = rand(0.18, 0.3) * (Math.random() < 0.5 ? -1 : 1)
        for (let i = 0; i < 30; i++) {
          const f = this.flight(FLIGHT_DUST, a.x, a.y, b.x, b.y, rand(1.1, 1.5), bend + rand(-0.06, 0.06), i * 0.035)
          if (!f) break
          f.tex = tex
          f.size = rand(2.5, 5)
        }
        break
      }
      case 'memory': {
        const n = Math.max(3, Math.min(24, e.count))
        for (let i = 0; i < n; i++) {
          const a0 = rand(0, TAU)
          const r0 = rand(290, 380)
          const a1 = a0 + rand(0.8, 1.6)
          const r1 = rand(100, 210)
          const f = this.flight(
            FLIGHT_MEM,
            Math.cos(a0) * r0, Math.sin(a0) * r0,
            Math.cos(a1) * r1, Math.sin(a1) * r1,
            rand(1.1, 1.7), -0.35, i * 0.07,
          )
          if (!f) break
          f.tex = Math.random() < 0.3 ? this.spkGold : this.spkStar
          f.size = rand(9, 14)
        }
        break
      }
      case 'pulse': {
        if (e.squad === 'brain') {
          this.ring(0, 0, 70, 180, 1.2, STAR, 2.5, 0.9)
          this.brainFlash = 1
        } else {
          const s = this.squads[SQUAD_ORDER.indexOf(e.squad)]
          this.ring(s.x, s.y, 46, 130, 1.1, s.color, 2.5, 0.9)
          s.flash = 1
        }
        break
      }
      case 'phase': {
        const ph = PHASES.find((p) => p.id === e.phase)
        if (!ph) return
        const p = this.posOf(ph.squad)
        const col = ph.squad === 'brain' ? STAR : SQUADS[ph.squad].color
        const r0 = ph.squad === 'brain' ? 80 : 50
        this.ring(p.x, p.y, r0, r0 + 150, 2.2, col, 14, 0.18)
        this.ring(p.x, p.y, r0, r0 + 120, 1.8, col, 2, 0.6, 0.12)
        this.ring(p.x, p.y, r0, r0 + 90, 1.6, col, 1, 0.4, 0.4)
        if (ph.squad === 'brain') this.brainFlash = 1
        else this.squads[SQUAD_ORDER.indexOf(ph.squad)].flash = 1
        break
      }
      case 'loopDone': {
        this.ring(0, 0, 70, WORLD.marketR + 60, 2.6, GOLD, 22, 0.16)
        this.ring(0, 0, 70, WORLD.marketR + 40, 2.4, GOLD, 2.5, 0.8)
        this.ring(0, 0, 70, WORLD.marketR, 2.6, STAR, 1.5, 0.6, 0.25)
        this.brainFlash = 1
        for (let i = 0; i < 110; i++) {
          const a = rand(0, TAU)
          const v = rand(140, 420)
          this.particle(
            Math.cos(a) * 50, Math.sin(a) * 50,
            Math.cos(a) * v, Math.sin(a) * v - 40,
            rand(1.8, 3), rand(7, 13), 1, Math.random() < 0.75 ? this.goldStar : starShape(STAR_BRIGHT),
            1.1, 60,
          )
        }
        this.burst(0, 0, 30, 260, this.spkGold, 2, 14, 1.4)
        for (const s of this.squads) s.flash = 0.8
        break
      }
    }
  }

  // ------------------------------------------------------------------ frame
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const p0 = performance.now()
    this.render(now)
    if (import.meta.env.DEV) {
      const w = window as unknown as { __swarmFrameMs?: number }
      w.__swarmFrameMs = (w.__swarmFrameMs ?? 0) * 0.95 + (performance.now() - p0) * 0.05
    }
  }

  private render(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.t += dt
    const t = this.t
    const st = useSwarm.getState()
    this.syncMarket(st.market)

    // camera tween (framerate-independent exponential smoothing, ~1.2s settle)
    const target = st.camera
    const k = 1 - Math.exp(-dt * 3.4)
    const c = this.cam
    c.x += (target.x - c.x) * k
    c.y += (target.y - c.y) * k
    c.zoom = Math.exp(Math.log(c.zoom) + (Math.log(target.zoom) - Math.log(c.zoom)) * k)
    c.anchorX += (target.anchorX - c.anchorX) * k
    c.anchorY += (target.anchorY - c.anchorY) * k
    c.dim += (target.dim - c.dim) * k

    const w = this.w
    const h = this.h
    const S = ((Math.min(w, h) / 2) / WORLD.extent) * c.zoom
    this.S = S
    this.OX = c.anchorX * w - c.x * S
    this.OY = c.anchorY * h - c.y * S

    // squad smoothing
    const kk = 1 - Math.exp(-dt * 2)
    for (let i = 0; i < this.squads.length; i++) {
      const s = this.squads[i]
      const ss = st.squads[s.id]
      const working = ss?.status === 'working' ? 1 : 0
      s.work += (working - s.work) * kk
      s.energy = 1 + s.work * 0.9
      s.flash *= Math.exp(-dt * 2.2)
      this.syncMinis(i, ss ? ss.workers : 36)
    }
    this.brainFlash *= Math.exp(-dt * 2)

    // galaxy count
    const gTarget = Math.min(MAX_GALAXY, Math.max(0, st.kpis.memories / 4))
    const prev = Math.floor(this.galaxyShown)
    this.galaxyShown += (gTarget - this.galaxyShown) * (1 - Math.exp(-dt * 1.5))
    if (Math.abs(gTarget - this.galaxyShown) < 0.02) this.galaxyShown = gTarget
    const now2 = Math.floor(this.galaxyShown)
    for (let i = prev; i < now2; i++) this.galaxy[i].born = t

    const ctx = this.ctx
    const dpr = this.dpr

    // ---------------- background
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = this.bgGrad ?? '#050814'
    ctx.fillRect(0, 0, w, h)
    this.drawNebula()
    this.drawBgStars()

    // ---------------- world, additive pass 1
    ctx.globalCompositeOperation = 'lighter'
    this.drawDust()
    this.setWorld()
    this.drawOrbits()
    ctx.globalCompositeOperation = 'lighter'
    this.drawBrainGlow()
    this.drawGalaxy()
    this.drawMarket()
    this.drawSquadGlows()
    this.updateMinis(dt)
    this.updateWanderers()
    this.drawMiniGlows()
    this.drawRings()
    this.drawFlights(dt, false)
    this.drawPopGlows()

    // ---------------- sprites
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    this.drawLoopArc(st.loopProgress, st.inLoop)
    this.drawBrain()
    this.drawLeaders()
    this.drawMinis()
    this.drawWanderers()
    this.drawFlights(dt, true)
    this.drawPops()

    // ---------------- additive pass 2 (glints, confetti)
    ctx.globalCompositeOperation = 'lighter'
    this.setWorld()
    this.drawGlints()
    this.updateParticles(dt)

    // ---------------- screen-space labels
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.drawLabels()

    // ---------------- dim
    if (c.dim > 0.005) {
      ctx.globalAlpha = 1
      ctx.fillStyle = `rgba(5,8,20,${(c.dim * 0.65).toFixed(3)})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  private setWorld() {
    const s = this.dpr * this.S
    this.ctx.setTransform(s, 0, 0, s, this.dpr * this.OX, this.dpr * this.OY)
  }

  /** Draw an image centered at world (x,y) with world size (w,h), rotated. */
  private sprite(im: CanvasImageSource, x: number, y: number, w: number, h: number, rot: number) {
    const s = this.dpr * this.S
    const cs = Math.cos(rot) * s
    const sn = Math.sin(rot) * s
    this.ctx.setTransform(cs, sn, -sn, cs, this.dpr * (this.OX + x * this.S), this.dpr * (this.OY + y * this.S))
    this.ctx.drawImage(im, -w / 2, -h / 2, w, h)
  }

  /** Is world point (x,y) with world radius r on screen? */
  private vis(x: number, y: number, r: number): boolean {
    const sx = this.OX + x * this.S
    const sy = this.OY + y * this.S
    const m = r * this.S + 4
    return sx > -m && sx < this.w + m && sy > -m && sy < this.h + m
  }

  // ------------------------------------------------------------------ background
  private drawNebula() {
    const ctx = this.ctx
    const { w, h } = this
    const base = (Math.min(w, h) / 2) / WORLD.extent
    const zs = base * (1 + (this.cam.zoom - 1) * 0.25)
    const px = this.cam.anchorX * w - this.cam.x * this.S * 0.18
    const py = this.cam.anchorY * h - this.cam.y * this.S * 0.18
    ctx.globalCompositeOperation = 'lighter'
    const blobs: [Tex, number, number, number, number][] = [
      [this.nebViolet, -520, -260, 900, 0.075],
      [this.nebBlue, 560, 300, 850, 0.07],
      [this.nebViolet, 180, 620, 600, 0.05],
    ]
    for (const [tex, x, y, r, a] of blobs) {
      const breathe = 1 + Math.sin(this.t * 0.12 + x) * 0.04
      const R = r * zs * breathe
      ctx.globalAlpha = a
      ctx.drawImage(tex, px + x * zs - R, py + y * zs - R, R * 2, R * 2)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawBgStars() {
    const ctx = this.ctx
    const { w, h, t } = this
    const base = (Math.min(w, h) / 2) / WORLD.extent
    const cx = this.cam.x * base * 3
    const cy = this.cam.y * base * 3
    const zf = Math.log(this.cam.zoom)
    ctx.fillStyle = '#dfefff'
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i]
      const sp = 1 + zf * s.d * 1.5
      let x = (s.x * w - w / 2) * sp + w / 2 - cx * s.d
      let y = (s.y * h - h / 2) * sp + h / 2 - cy * s.d
      x = ((x % w) + w) % w
      y = ((y % h) + h) % h
      const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.p)
      const a = s.a * tw
      if (s.big) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = a * 0.5
        const R = s.s * 5
        ctx.drawImage(this.texWhite, x - R, y - R, R * 2, R * 2)
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = a
      ctx.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s)
    }
    ctx.globalAlpha = 1
  }

  private drawDust() {
    const ctx = this.ctx
    const { t, S, OX, OY, w, h } = this
    const dpr = this.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const size = Math.min(2.6, 1.1 * Math.sqrt(this.cam.zoom))
    const half = size / 2
    let bucket = -1
    const N = this.dustOrder.length
    for (let j = 0; j < N; j++) {
      const i = this.dustOrder[j]
      const b = this.dustBucket[i]
      if (b !== bucket) {
        if (bucket >= 0) ctx.fill()
        bucket = b
        ctx.fillStyle = DUST_COLORS[(b / 3) | 0]
        ctx.globalAlpha = DUST_ALPHAS[b % 3]
        ctx.beginPath()
      }
      const a = this.dustA[i] + this.dustW[i] * t * 0.9
      const r = this.dustR[i] + Math.sin(t * 0.35 + this.dustP[i]) * 7
      const x = OX + Math.cos(a) * r * S
      const y = OY + Math.sin(a) * r * S
      if (x < -2 || x > w + 2 || y < -2 || y > h + 2) continue
      ctx.rect(x - half, y - half, size, size)
    }
    if (bucket >= 0) ctx.fill()
    ctx.globalAlpha = 1
  }

  private drawOrbits() {
    const ctx = this.ctx
    const S = this.S
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineWidth = 1 / S
    // squad orbit (dashed)
    ctx.strokeStyle = 'rgba(136,200,248,0.16)'
    ctx.setLineDash([3 / S, 9 / S])
    ctx.lineDashOffset = -this.t * 4 / S
    ctx.beginPath()
    ctx.arc(0, 0, WORLD.squadR, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    // market ring (very faint)
    ctx.strokeStyle = 'rgba(136,200,248,0.06)'
    ctx.beginPath()
    ctx.arc(0, 0, WORLD.marketR, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(167,139,250,0.035)'
    ctx.lineWidth = 18 / S
    ctx.beginPath()
    ctx.arc(0, 0, WORLD.marketR, 0, TAU)
    ctx.stroke()
  }

  // ------------------------------------------------------------------ brain + galaxy
  private drawBrainGlow() {
    const ctx = this.ctx
    const t = this.t
    const br = 1 + Math.sin(t * 1.3) * 0.06 + this.brainFlash * 0.25
    let R = 180 * br
    ctx.globalAlpha = 0.42 + this.brainFlash * 0.3
    ctx.drawImage(this.texStar, -R, -R, R * 2, R * 2)
    R = 100 * br
    ctx.globalAlpha = 0.34 + this.brainFlash * 0.3
    ctx.drawImage(this.texStar, -R, -R, R * 2, R * 2)
    ctx.globalAlpha = 1
  }

  private drawGalaxy() {
    const ctx = this.ctx
    const t = this.t
    const n = Math.floor(this.galaxyShown)
    if (!this.vis(0, 0, 240)) return
    // dots
    for (let i = 0; i < n; i++) {
      const d = this.galaxy[i]
      const a = d.a0 + t * (0.9 / Math.sqrt(d.r))
      const x = Math.cos(a) * d.r
      const y = Math.sin(a) * d.r * 0.92
      const age = t - d.born
      const fresh = age < 2.5 ? 1 - age / 2.5 : 0
      const tw = 0.55 + 0.45 * Math.sin(t * 1.7 + d.p)
      ctx.globalAlpha = Math.min(1, 0.5 * tw + 0.32 + fresh)
      const R = d.size * (1.15 + fresh * 1.8)
      ctx.drawImage(d.tex, x - R, y - R, R * 2, R * 2)
      if (i % 3 === 0) {
        // soft haze so the arms read as a galaxy, not just dots
        const H = R * 5
        ctx.globalAlpha = 0.05
        ctx.drawImage(this.texStar, x - H, y - H, H * 2, H * 2)
      }
    }
    // constellation lines between neighbours on the same arm
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(136,200,248,0.13)'
    ctx.lineWidth = 0.8 / this.S
    ctx.beginPath()
    for (let i = 0; i + 9 < n; i += 11) {
      for (let s = 0; s < 3; s++) {
        const d0 = this.galaxy[i + s * 3]
        const d1 = this.galaxy[i + s * 3 + 3]
        const a0 = d0.a0 + t * (0.9 / Math.sqrt(d0.r))
        const a1 = d1.a0 + t * (0.9 / Math.sqrt(d1.r))
        ctx.moveTo(Math.cos(a0) * d0.r, Math.sin(a0) * d0.r * 0.92)
        ctx.lineTo(Math.cos(a1) * d1.r, Math.sin(a1) * d1.r * 0.92)
      }
    }
    ctx.stroke()
  }

  private drawLoopArc(progress: number, inLoop: boolean) {
    const ctx = this.ctx
    this.setWorld()
    const R = 84
    const S = this.S
    ctx.lineCap = 'round'
    ctx.lineWidth = 2 / S
    ctx.strokeStyle = 'rgba(136,200,248,0.12)'
    ctx.beginPath()
    ctx.arc(0, 0, R, 0, TAU)
    ctx.stroke()
    const p = clamp01(progress)
    if (p > 0.001) {
      const a0 = -Math.PI / 2
      const a1 = a0 + p * TAU
      ctx.strokeStyle = inLoop ? 'rgba(136,200,248,0.9)' : 'rgba(136,200,248,0.5)'
      ctx.lineWidth = 2.4 / S
      ctx.beginPath()
      ctx.arc(0, 0, R, a0, a1)
      ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'
      const hx = Math.cos(a1) * R
      const hy = Math.sin(a1) * R
      const gr = 12 / Math.max(1, S) + 6
      ctx.drawImage(this.texStarCore, hx - gr, hy - gr, gr * 2, gr * 2)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.lineCap = 'butt'
  }

  private drawBrain() {
    const t = this.t
    const H = 120
    const bob = Math.sin(t * 1.6) * 3
    const squash = 1 + Math.sin(t * 3.2) * 0.012
    const dev = H * this.S * this.dpr
    const im = dev > 190 && ok(this.brainHi) ? this.brainHi : this.brainImg
    if (!ok(im)) return
    const W = H * (im.naturalWidth / im.naturalHeight)
    this.sprite(im, 0, bob, W * squash, H / squash, Math.sin(t * 0.9) * 0.03)
  }

  // ------------------------------------------------------------------ squads
  private drawSquadGlows() {
    const ctx = this.ctx
    const t = this.t
    for (let i = 0; i < this.squads.length; i++) {
      const s = this.squads[i]
      if (!this.vis(s.x, s.y, 180)) continue
      const R = 78 * (1 + Math.sin(t * 1.4 + i) * 0.05 + s.flash * 0.35 + s.work * 0.12)
      ctx.globalAlpha = 0.3 + s.flash * 0.35 + s.work * 0.12
      ctx.drawImage(s.glow, s.x - R, s.y - R, R * 2, R * 2)
      // working: pulsing rings
      if (s.work > 0.02) {
        ctx.strokeStyle = s.color
        for (let k = 0; k < 2; k++) {
          const u = (t * 0.7 + k * 0.5) % 1
          ctx.globalAlpha = (1 - u) * 0.55 * s.work
          ctx.lineWidth = (2.2 * (1 - u) + 0.4) / this.S
          ctx.beginPath()
          ctx.arc(s.x, s.y, 48 + u * 60, 0, TAU)
          ctx.stroke()
        }
      }
    }
    ctx.globalAlpha = 1
  }

  private drawLeaders() {
    const t = this.t
    for (let i = 0; i < this.squads.length; i++) {
      const s = this.squads[i]
      if (!ok(s.leader) || !this.vis(s.x, s.y, 60)) continue
      const H = 80
      const W = H * (s.leader.naturalWidth / s.leader.naturalHeight)
      const bob = Math.sin(t * 1.8 + i * 1.3) * 2.5
      const hop = s.work > 0.1 ? Math.abs(Math.sin(t * 5 + i)) * -4 * s.work : 0
      this.sprite(s.leader, s.x, s.y + bob + hop, W, H, Math.sin(t * 1.1 + i) * 0.04)
    }
  }

  // ------------------------------------------------------------------ flock
  private syncMinis(si: number, count: number) {
    const arr = this.minis[si]
    const n = Math.max(0, Math.min(80, count | 0))
    while (arr.length < n) arr.push(this.newMini(si))
    while (arr.length > n) arr.pop()
  }

  private updateMinis(dt: number) {
    const t = this.t
    const OUT = 1.25
    const HOVER = 0.9
    const BACK = 1.4
    for (let si = 0; si < this.minis.length; si++) {
      const s = this.squads[si]
      const arr = this.minis[si]
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i]
        if (m.fade < 1) m.fade = Math.min(1, m.fade + dt * 0.8)
        m.a += m.w * s.energy * dt
        const r = m.r + Math.sin(t * m.f1 + m.p1) * 10
        const fx = s.x + Math.cos(m.a) * r + Math.sin(t * 0.6 + m.p3) * 7
        const fy = s.y + Math.sin(m.a) * r * 0.82 + Math.sin(t * m.f2 + m.p2) * 4
        let tilt = 0
        if (m.mission === 0) {
          m.x = fx
          m.y = fy
        } else {
          const el = t - m.mt0
          if (m.mission === 1) {
            if (el < 0) {
              m.x = fx
              m.y = fy
              m.sx = fx
              m.sy = fy
            } else {
              const u = clamp01(el / OUT)
              const e = easeInOut(u)
              const dx = m.tx - m.sx
              const dy = m.ty - m.sy
              const cx = (m.sx + m.tx) / 2 - dy * 0.28 * m.side
              const cy = (m.sy + m.ty) / 2 + dx * 0.28 * m.side
              const nx = qb(m.sx, cx, m.tx, e)
              tilt = (nx - m.x) > 0 ? 0.3 : -0.3
              m.x = nx
              m.y = qb(m.sy, cy, m.ty, e)
              if (u >= 1) {
                m.mission = 2
                m.mt0 = t
              }
            }
          } else if (m.mission === 2) {
            m.x = m.tx + Math.cos(t * 3 + m.slot) * 5
            m.y = m.ty + Math.sin(t * 3.4 + m.slot) * 5
            if (el > HOVER) {
              m.mission = 3
              m.mt0 = t
              m.sx = m.x
              m.sy = m.y
              m.carry = t + BACK + 1.5
            }
          } else {
            const u = clamp01(el / BACK)
            const e = easeInOut(u)
            const dx = fx - m.sx
            const dy = fy - m.sy
            const cx = (m.sx + fx) / 2 + dy * 0.22 * m.side
            const cy = (m.sy + fy) / 2 - dx * 0.22 * m.side
            const nx = qb(m.sx, cx, fx, e)
            tilt = (nx - m.x) > 0 ? 0.3 : -0.3
            m.x = nx
            m.y = qb(m.sy, cy, fy, e)
            if (u >= 1) m.mission = 0
          }
        }
        m.rot = Math.sin(t * m.wobF + m.wob) * 0.17 + tilt
      }
    }
  }

  private drawMiniGlows() {
    const ctx = this.ctx
    for (let si = 0; si < this.minis.length; si++) {
      const tex = this.squads[si].glow
      const arr = this.minis[si]
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i]
        if (!this.vis(m.x, m.y, m.size)) continue
        const R = m.size * 1.3
        ctx.globalAlpha = 0.55 * m.fade
        ctx.drawImage(tex, m.x - R, m.y - R, R * 2, R * 2)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawMinis() {
    const ctx = this.ctx
    const dev = this.S * this.dpr
    for (let si = 0; si < this.minis.length; si++) {
      const s = this.squads[si]
      const arr = this.minis[si]
      if (!arr.length) continue
      const hi = ok(s.mini160)
      const lo = ok(s.mini64)
      if (!hi && !lo) continue
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i]
        if (!this.vis(m.x, m.y, m.size)) continue
        const im = (m.size * dev > 52 && hi) || !lo ? s.mini160 : s.mini64
        const H = m.size
        const W = H * (im.naturalWidth / im.naturalHeight)
        ctx.globalAlpha = m.fade
        this.sprite(im, m.x, m.y, W, H, m.rot)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawGlints() {
    const ctx = this.ctx
    const t = this.t
    for (let si = 0; si < this.minis.length; si++) {
      const arr = this.minis[si]
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i]
        if (m.carry < t || m.mission === 1) continue
        const left = m.carry - t
        const a = Math.min(1, left / 0.6)
        const R = m.size * (0.55 + 0.15 * Math.sin(t * 9 + i))
        const gx = m.x + m.size * 0.45
        const gy = m.y - m.size * 0.5
        ctx.globalAlpha = a * 0.9
        ctx.drawImage(this.texMint, gx - R, gy - R, R * 2, R * 2)
        ctx.drawImage(this.spkMint, gx - R * 0.8, gy - R * 0.8, R * 1.6, R * 1.6)
      }
    }
    ctx.globalAlpha = 1
  }

  private updateWanderers() {
    const t = this.t
    const R = WORLD.squadR
    const ctx = this.ctx
    for (const wd of this.wanderers) {
      let el = t - wd.t0
      if (el > wd.wait + wd.dur) {
        wd.from = wd.to
        wd.to = (wd.from + (Math.random() < 0.5 ? 1 : 5) + (Math.random() < 0.15 ? 1 : 0)) % 6
        wd.t0 = t
        wd.wait = rand(0.4, 2.2)
        wd.dur = rand(3, 5.5)
        wd.rOff = rand(-60, 60)
        el = 0
      }
      const a0 = this.squads[wd.from].angle
      let d = this.squads[wd.to].angle - a0
      while (d > Math.PI) d -= TAU
      while (d < -Math.PI) d += TAU
      const u = el < wd.wait ? 0 : clamp01((el - wd.wait) / wd.dur)
      const e = easeInOutSine(u)
      const park = 0.2 * Math.sign(d || 1)
      const a = a0 + park * (1 - e) + (d - park) * e + (u === 0 ? Math.sin(t * 1.2 + wd.p) * 0.02 : 0)
      const rr = R + Math.sin(u * Math.PI) * wd.rOff + Math.sin(t * 2 + wd.p) * 3
      wd.x = Math.cos(a) * rr
      wd.y = Math.sin(a) * rr + Math.sin(t * 4 + wd.p) * 1.5
      wd.rot = Math.sin(t * 2.2 + wd.p) * 0.2 + (u > 0 && u < 1 ? 0.2 * Math.sign(d) : 0)
      if (this.vis(wd.x, wd.y, 20)) {
        ctx.globalAlpha = 0.45
        const g = wd.size * 1.2
        ctx.drawImage(this.texStar, wd.x - g, wd.y - g, g * 2, g * 2)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawWanderers() {
    if (!ok(this.starImg)) return
    const im = this.starImg
    const ar = im.naturalWidth / im.naturalHeight
    for (const wd of this.wanderers) {
      if (!this.vis(wd.x, wd.y, 20)) continue
      this.sprite(im, wd.x, wd.y, wd.size * ar, wd.size, wd.rot)
    }
  }

  // ------------------------------------------------------------------ market
  private drawMarket() {
    const ctx = this.ctx
    const t = this.t
    const S = this.S
    const market = this.marketRef ?? []
    const minR = 1.6 / S // keep dots visible when zoomed out
    const labelsOn = S >= 0.45
    this.labelN = 0
    for (let i = 0; i < market.length; i++) {
      const n = market[i]
      const x = Math.cos(n.angle) * n.radius
      const y = Math.sin(n.angle) * n.radius
      if (!this.vis(x, y, 40)) continue
      const kind = n.kind
      const fl = this.nodeFlash.get(n.id)
      const flash = fl !== undefined && t - fl < 1.4 ? 1 - (t - fl) / 1.4 : 0
      const tw = 0.8 + 0.2 * Math.sin(t * 1.3 + i * 1.7)
      let pri = 0
      switch (n.state) {
        case 'dormant': {
          const R = Math.max(7, minR * 3) * (1 + flash)
          ctx.globalAlpha = Math.min(1, 0.25 * tw + flash * 0.6)
          ctx.drawImage(this.marketTex[kind], x - R, y - R, R * 2, R * 2)
          break
        }
        case 'found':
        case 'contacted': {
          const R = Math.max(12, minR * 4) * (1 + flash * 0.8)
          ctx.globalAlpha = 0.85 * tw
          ctx.drawImage(this.marketCore[kind], x - R, y - R, R * 2, R * 2)
          if (n.state === 'found') {
            const u = (t * 0.8 + i * 0.13) % 1
            ctx.globalAlpha = (1 - u) * 0.6
            ctx.strokeStyle = MARKET_COLORS[kind]
            ctx.lineWidth = 1.2 / S
            ctx.beginPath()
            ctx.arc(x, y, 6 + u * 16, 0, TAU)
            ctx.stroke()
            pri = 1
          } else pri = 2
          break
        }
        case 'replied': {
          const R = Math.max(22, minR * 6) * (1 + flash * 0.6) * (0.92 + 0.08 * tw)
          ctx.globalAlpha = 0.55
          ctx.drawImage(this.texGold, x - R * 1.6, y - R * 1.6, R * 3.2, R * 3.2)
          ctx.globalAlpha = 1
          ctx.drawImage(this.texGoldCore, x - R * 0.7, y - R * 0.7, R * 1.4, R * 1.4)
          pri = 3
          break
        }
        case 'meeting': {
          const R = Math.max(30, minR * 7) * (1 + flash * 0.5)
          ctx.globalAlpha = 0.6
          ctx.drawImage(this.texGold, x - R, y - R, R * 2, R * 2)
          pri = 4
          break
        }
      }
      if (
        labelsOn &&
        n.state !== 'dormant' &&
        this.labelN < this.labels.length &&
        (kind === 'journalist' || kind === 'publisher' || pri >= 3 || (kind === 'community' && hash(n.id) % 3 === 0))
      ) {
        const L = this.labels[this.labelN++]
        L.x = this.OX + x * S
        L.y = this.OY + y * S
        L.text = n.label
        L.pri = pri
        L.nx = Math.cos(n.angle)
        L.ny = Math.sin(n.angle)
        L.gold = pri >= 3
      }
    }
    ctx.globalAlpha = 1

    // meeting stars (drawn source-over on top of their glow)
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < market.length; i++) {
      const n = market[i]
      if (n.state !== 'meeting') continue
      const x = Math.cos(n.angle) * n.radius
      const y = Math.sin(n.angle) * n.radius
      if (!this.vis(x, y, 30)) continue
      const sz = Math.max(15, minR * 8) * (1 + Math.sin(t * 3 + i) * 0.06)
      const s = this.dpr * S
      const rot = Math.sin(t * 0.8 + i) * 0.25
      const cs = Math.cos(rot) * s
      const sn = Math.sin(rot) * s
      ctx.setTransform(cs, sn, -sn, cs, this.dpr * (this.OX + x * S), this.dpr * (this.OY + y * S))
      ctx.drawImage(this.goldStar, -sz / 2, -sz / 2, sz, sz)
    }
    this.setWorld()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < market.length; i++) {
      const n = market[i]
      if (n.state !== 'meeting') continue
      const x = Math.cos(n.angle) * n.radius
      const y = Math.sin(n.angle) * n.radius
      if (!this.vis(x, y, 30)) continue
      const u = (t * 0.9 + i * 0.37) % 1
      const R = Math.max(10, minR * 5) * Math.sin(u * Math.PI)
      const sa = i * 2.1 + Math.floor(t * 0.9 + i * 0.37) * 2.4
      const sx = x + Math.cos(sa) * 11
      const sy = y + Math.sin(sa) * 11
      ctx.globalAlpha = 0.9
      ctx.drawImage(this.spkGold, sx - R, sy - R, R * 2, R * 2)
    }
    ctx.globalAlpha = 1
  }

  // ------------------------------------------------------------------ effects
  private drawRings() {
    const ctx = this.ctx
    const t = this.t
    const S = this.S
    const pool = this.rings
    for (let i = pool.n - 1; i >= 0; i--) {
      const r = pool.items[i]
      const el = t - r.t0
      if (el < 0) continue
      const u = el / r.dur
      if (u >= 1) {
        pool.kill(i)
        continue
      }
      const e = easeOut(u)
      ctx.globalAlpha = r.a * (1 - u) * (1 - u)
      ctx.strokeStyle = r.color
      ctx.lineWidth = r.w / S
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** sprites=false: additive trails/heads; sprites=true: riders (source-over), and retire finished flights. */
  private drawFlights(_dt: number, sprites: boolean) {
    const ctx = this.ctx
    const t = this.t
    const pool = this.flights
    if (sprites) {
      for (let i = pool.n - 1; i >= 0; i--) {
        const f = pool.items[i]
        const u = (t - f.t0) / f.dur
        if (u >= 1) {
          this.arrive(f)
          pool.kill(i)
          continue
        }
        if (f.kind !== FLIGHT_COMET || u < 0) continue
        const s = this.squads[f.si]
        const im = ok(s.mini160) ? s.mini160 : s.mini64
        if (!ok(im)) continue
        const e = easeInOutSine(u)
        const x = qb(f.x0, f.cx, f.x1, e)
        const y = qb(f.y0, f.cy, f.y1, e)
        const e2 = easeInOutSine(Math.max(0, u - 0.02))
        const dx = x - qb(f.x0, f.cx, f.x1, e2)
        const H = 19
        const W = H * (im.naturalWidth / im.naturalHeight)
        const fade = Math.min(1, u * 8, (1 - u) * 6)
        ctx.globalAlpha = fade
        this.sprite(im, x, y - 9, W, H, (dx > 0 ? 0.28 : -0.28) + Math.sin(t * 10) * 0.06)
      }
      ctx.globalAlpha = 1
      return
    }
    for (let i = 0; i < pool.n; i++) {
      const f = pool.items[i]
      const u = (t - f.t0) / f.dur
      if (u < 0 || u >= 1 || !f.tex) continue
      if (f.kind === FLIGHT_COMET || f.kind === FLIGHT_SPARK) {
        const spark = f.kind === FLIGHT_SPARK
        const headSz = spark ? 11 * f.size : 12
        const TAIL = spark ? 16 : 18
        const step = spark ? 0.016 : 0.02
        for (let k = TAIL; k >= 1; k--) {
          const uk = u - k * step
          if (uk < 0) continue
          const e = easeInOutSine(uk)
          const x = qb(f.x0, f.cx, f.x1, e)
          const y = qb(f.y0, f.cy, f.y1, e)
          const q = 1 - k / (TAIL + 1)
          const R = headSz * (0.25 + 0.75 * q)
          ctx.globalAlpha = q * q * 0.7
          ctx.drawImage(f.tex, x - R, y - R, R * 2, R * 2)
        }
        const e = easeInOutSine(u)
        const x = qb(f.x0, f.cx, f.x1, e)
        const y = qb(f.y0, f.cy, f.y1, e)
        const core = spark ? this.texGoldCore : this.squads[f.si].core
        ctx.globalAlpha = 1
        const R = headSz * 1.5
        ctx.drawImage(core, x - R, y - R, R * 2, R * 2)
        if (spark && f.big) {
          const R2 = R * (1.4 + Math.sin(t * 12) * 0.2)
          ctx.drawImage(this.spkGold, x - R2, y - R2, R2 * 2, R2 * 2)
        }
      } else if (f.kind === FLIGHT_DUST) {
        const e = easeInOut(u)
        const x = qb(f.x0, f.cx, f.x1, e)
        const y = qb(f.y0, f.cy, f.y1, e)
        const R = f.size
        ctx.globalAlpha = Math.min(1, u * 5, (1 - u) * 4) * 0.85
        ctx.drawImage(f.tex, x - R, y - R, R * 2, R * 2)
      } else if (f.kind === FLIGHT_MEM) {
        const e = easeInOut(u)
        const x = qb(f.x0, f.cx, f.x1, e)
        const y = qb(f.y0, f.cy, f.y1, e)
        const R = f.size * (1 - e * 0.5) * (0.85 + 0.15 * Math.sin(t * 14 + i))
        ctx.globalAlpha = Math.min(1, u * 4) * 0.95
        ctx.drawImage(f.tex, x - R, y - R, R * 2, R * 2)
        const R2 = R * 0.9
        ctx.globalAlpha *= 0.5
        ctx.drawImage(this.texStar, x - R2, y - R2, R2 * 2, R2 * 2)
      }
    }
    ctx.globalAlpha = 1
  }

  private arrive(f: Flight) {
    if (f.kind === FLIGHT_COMET) {
      const s = this.squads[f.si]
      this.ring(f.x1, f.y1, 6, 38, 0.9, s.color, 2, 0.9)
      this.burst(f.x1, f.y1, 8, 70, s.glow, 0, 5, 0.7)
      if (f.node) this.nodeFlash.set(f.node, this.t)
    } else if (f.kind === FLIGHT_SPARK) {
      this.brainFlash = Math.max(this.brainFlash, f.big ? 1 : 0.6)
      this.ring(0, 0, 60, f.big ? 150 : 110, 1, GOLD, f.big ? 3 : 2, 0.8)
      this.burst(f.x1, f.y1, f.big ? 16 : 8, 90, this.spkGold, 2, 10, 0.8)
    } else if (f.kind === FLIGHT_MEM) {
      this.brainFlash = Math.max(this.brainFlash, 0.35)
      this.particle(f.x1, f.y1, 0, 0, 0.6, 12, 2, this.spkStar, 0)
    }
  }

  private updateParticles(dt: number) {
    const ctx = this.ctx
    const t = this.t
    const pool = this.particles
    for (let i = pool.n - 1; i >= 0; i--) {
      const p = pool.items[i]
      const u = (t - p.t0) / p.life
      if (u >= 1 || !p.tex) {
        pool.kill(i)
        continue
      }
      const damp = Math.exp(-p.drag * dt)
      p.vx *= damp
      p.vy = p.vy * damp + p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (!this.vis(p.x, p.y, p.size)) continue
      const a = p.a * (u < 0.1 ? u / 0.1 : 1 - Math.pow((u - 0.1) / 0.9, 2))
      ctx.globalAlpha = Math.max(0, a)
      const R = p.size * (p.kind === 2 ? 0.6 + 0.4 * Math.sin(u * Math.PI) : 1)
      if (p.kind === 1) {
        // spinning star confetti: draw source-over-ish via lighter is fine (bright gold)
        const s = this.dpr * this.S
        const cs = Math.cos(p.rot) * s
        const sn = Math.sin(p.rot) * s
        ctx.setTransform(cs, sn, -sn, cs, this.dpr * (this.OX + p.x * this.S), this.dpr * (this.OY + p.y * this.S))
        ctx.drawImage(p.tex, -R / 2, -R / 2, R, R)
      } else {
        this.setWorld()
        ctx.drawImage(p.tex, p.x - R, p.y - R, R * 2, R * 2)
      }
    }
    this.setWorld()
    ctx.globalAlpha = 1
  }

  private popScale(u: number) {
    if (u < 0.25) return easeOutBack(u / 0.25)
    if (u > 0.78) return Math.max(0, 1 - easeInOut((u - 0.78) / 0.22))
    return 1 + Math.sin((u - 0.25) * 14) * 0.03
  }

  private drawPopGlows() {
    const ctx = this.ctx
    const t = this.t
    const pool = this.pops
    for (let i = 0; i < pool.n; i++) {
      const p = pool.items[i]
      const u = (t - p.t0) / 1.2
      if (u >= 1 || u < 0) continue
      const s = this.popScale(u)
      const R = 50 * s
      ctx.globalAlpha = 0.7
      ctx.drawImage(this.texGold, p.x - R, p.y - 30 - R, R * 2, R * 2)
    }
    ctx.globalAlpha = 1
  }

  private drawPops() {
    const t = this.t
    const pool = this.pops
    for (let i = pool.n - 1; i >= 0; i--) {
      const p = pool.items[i]
      const u = (t - p.t0) / 1.2
      if (u >= 1) {
        pool.kill(i)
        continue
      }
      if (!ok(this.happyImg)) continue
      const s = this.popScale(u)
      if (s <= 0.01) continue
      const H = 52 * s
      const W = H * (this.happyImg.naturalWidth / this.happyImg.naturalHeight)
      this.sprite(this.happyImg, p.x, p.y - 30 - (1 - s) * 10, W, H, Math.sin(u * 20) * 0.08)
    }
  }

  // ------------------------------------------------------------------ labels
  private measure(text: string, font: string): number {
    const key = font + '|' + text
    let v = this.textW.get(key)
    if (v === undefined) {
      this.ctx.font = font
      v = this.ctx.measureText(text).width
      this.textW.set(key, v)
    }
    return v
  }

  private collides(x0: number, y0: number, x1: number, y1: number): boolean {
    const P = this.placed
    for (let i = 0; i < P.length; i += 4) {
      if (x0 < P[i + 2] && x1 > P[i] && y0 < P[i + 3] && y1 > P[i + 1]) return true
    }
    return false
  }

  private drawLabels() {
    const ctx = this.ctx
    const S = this.S
    const P = this.placed
    P.length = 0
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(5,8,20,0.9)'
    ctx.shadowBlur = 6

    // squad labels
    const nameFont = '700 13px Lato, ui-sans-serif, sans-serif'
    const subFont = '400 11px Lato, ui-sans-serif, sans-serif'
    ctx.textAlign = 'center'
    for (const s of this.squads) {
      const sx = this.OX + s.x * S
      const sy = this.OY + (s.y + 42) * S + 4
      if (sx < -80 || sx > this.w + 80 || sy < -40 || sy > this.h + 10) continue
      const w1 = this.measure(s.name, nameFont)
      const w2 = this.measure(s.powered, subFont)
      const hw = Math.max(w1, w2) / 2
      P.push(sx - hw, sy, sx + hw, sy + 30)
      ctx.font = nameFont
      ctx.fillStyle = CREAM
      ctx.globalAlpha = 1
      ctx.fillText(s.name, sx, sy)
      ctx.font = subFont
      ctx.fillStyle = s.poweredColor
      ctx.fillText(s.powered, sx, sy + 16)
    }

    // market labels, highest priority first, greedy non-overlapping
    const n = this.labelN
    if (n) {
      const L = this.labels
      // insertion sort by priority desc (small n, no allocation)
      for (let i = 1; i < n; i++) {
        const cur = L[i]
        let j = i - 1
        while (j >= 0 && L[j].pri < cur.pri) {
          L[j + 1] = L[j]
          j--
        }
        L[j + 1] = cur
      }
      const font = '400 11px Lato, ui-sans-serif, sans-serif'
      ctx.font = font
      for (let i = 0; i < n; i++) {
        const l = L[i]
        const tw = this.measure(l.text, font)
        const off = 14 + (l.pri >= 3 ? 10 : 0)
        const ax = l.x + l.nx * off
        const ay = l.y + l.ny * off
        let x0: number
        if (l.nx > 0.35) x0 = ax
        else if (l.nx < -0.35) x0 = ax - tw
        else x0 = ax - tw / 2
        let y0: number
        if (l.ny > 0.35) y0 = ay
        else if (l.ny < -0.35) y0 = ay - 13
        else y0 = ay - 6.5
        const x1 = x0 + tw
        const y1 = y0 + 13
        if (x0 < 4 || x1 > this.w - 4 || y0 < 4 || y1 > this.h - 52) continue
        if (this.collides(x0 - 3, y0 - 2, x1 + 3, y1 + 2)) continue
        P.push(x0 - 3, y0 - 2, x1 + 3, y1 + 2)
        ctx.textAlign = 'left'
        ctx.fillStyle = l.gold ? 'rgba(246,198,103,0.9)' : 'rgba(248,245,241,0.6)'
        ctx.fillText(l.text, x0, y0)
      }
    }
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
  }
}
