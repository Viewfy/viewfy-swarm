// Image preloading + pre-rendered glow / shape textures for the swarm canvas.
// Everything here is cached: call freely from the render loop.

const imgCache = new Map<string, HTMLImageElement>()

/** Returns a (possibly still loading) image. Draw it only when `ok(img)` is true. */
export function img(src: string): HTMLImageElement {
  let im = imgCache.get(src)
  if (!im) {
    im = new Image()
    im.decoding = 'async'
    im.src = src
    imgCache.set(src, im)
  }
  return im
}

export function ok(im: HTMLImageElement): boolean {
  return im.complete && im.naturalWidth > 0
}

export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!]
}

export type GlowProfile = 'soft' | 'core' | 'nebula'
const glowCache = new Map<string, HTMLCanvasElement>()

/** Radial glow texture. Draw with 'lighter' composite. Texture radius == half its drawn size. */
export function glow(color: string, profile: GlowProfile = 'soft'): HTMLCanvasElement {
  const key = color + profile
  let c = glowCache.get(key)
  if (c) return c
  const S = profile === 'nebula' ? 256 : 64
  const [cv, g] = canvas(S)
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  const col = (a: number) => rgba(color, a)
  if (profile === 'core') {
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.14, col(1))
    grad.addColorStop(0.36, col(0.32))
    grad.addColorStop(0.7, col(0.06))
    grad.addColorStop(1, col(0))
  } else if (profile === 'nebula') {
    grad.addColorStop(0, col(1))
    grad.addColorStop(0.3, col(0.6))
    grad.addColorStop(0.62, col(0.18))
    grad.addColorStop(1, col(0))
  } else {
    grad.addColorStop(0, col(1))
    grad.addColorStop(0.18, col(0.62))
    grad.addColorStop(0.45, col(0.17))
    grad.addColorStop(1, col(0))
  }
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  c = cv
  glowCache.set(key, c)
  return c
}

const shapeCache = new Map<string, HTMLCanvasElement>()

/** A chubby rounded 5-point star (like the mascot), filled with `color`. 64px texture. */
export function starShape(color: string): HTMLCanvasElement {
  const key = 'star' + color
  let c = shapeCache.get(key)
  if (c) return c
  const S = 64
  const [cv, g] = canvas(S)
  g.translate(S / 2, S / 2 + 2)
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? 24 : 12
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.lineJoin = 'round'
  g.lineWidth = 7
  g.strokeStyle = color
  g.fillStyle = color
  g.stroke()
  g.fill()
  // soft highlight
  const hl = g.createRadialGradient(-5, -7, 0, -5, -7, 18)
  hl.addColorStop(0, 'rgba(255,255,255,0.55)')
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = hl
  g.fill()
  c = cv
  shapeCache.set(key, c)
  return c
}

/** 4-point twinkle glint (cross flare + hot center). Draw additive. 64px texture. */
export function sparkle(color: string): HTMLCanvasElement {
  const key = 'spk' + color
  let c = shapeCache.get(key)
  if (c) return c
  const S = 64
  const [cv, g] = canvas(S)
  const m = S / 2
  const ray = (w: number, len: number, rot: number) => {
    g.save()
    g.translate(m, m)
    g.rotate(rot)
    const grad = g.createLinearGradient(0, -len, 0, len)
    grad.addColorStop(0, rgba(color, 0))
    grad.addColorStop(0.5, rgba(color, 1))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(0, -len)
    g.lineTo(w / 2, 0)
    g.lineTo(0, len)
    g.lineTo(-w / 2, 0)
    g.closePath()
    g.fill()
    g.restore()
  }
  ray(7, 31, 0)
  ray(7, 31, Math.PI / 2)
  ray(4, 16, Math.PI / 4)
  ray(4, 16, -Math.PI / 4)
  const core = g.createRadialGradient(m, m, 0, m, m, 10)
  core.addColorStop(0, 'rgba(255,255,255,1)')
  core.addColorStop(0.4, rgba(color, 0.8))
  core.addColorStop(1, rgba(color, 0))
  g.fillStyle = core
  g.fillRect(0, 0, S, S)
  c = cv
  shapeCache.set(key, c)
  return c
}
