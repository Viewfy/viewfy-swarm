// Scene 1 — the opening. Big waving star + orbiting swarm sit on the canvas at ~70% x;
// this overlay owns the left ~55%: lockup, headline, hand-drawn arrow, the floor crew, sponsor chips.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { setCamera } from '../engine/store'
import { CAMERA, SPRITES, WORLD } from '../engine/layout'
import { TechChip, Words } from './hero/fx'
import FloorRow from './hero/FloorRow'
import HandArrow, { type Pt } from './hero/HandArrow'

const CHIPS = [
  { name: 'River', what: 'your voice', color: '#a78bfa' },
  { name: 'gbrain', what: 'memory', color: '#88c8f8' },
  { name: 'Memorable', what: 'playbooks', color: '#f6c667' },
  { name: 'QM', what: 'hourly harness', color: '#6ee7b7' },
]

// timeline (s)
const T = {
  lockup: 0.1,
  h1: 0.35,
  sub: 0.85,
  arrow: 1.45,
  floor: 1.75,
  chips: 2.55,
  hint: 3.2,
}

/** Where the canvas puts the big star for CAMERA.hero (mirrors the camera math: zoom 1 fits WORLD.extent). */
function starOnScreen(w: number, h: number) {
  const cam = CAMERA.hero
  const scale = (Math.min(w, h) / (2 * WORLD.extent)) * cam.zoom
  return { x: cam.anchorX * w, y: cam.anchorY * h, r: WORLD.brainR * scale }
}

export default function HeroScene() {
  useEffect(() => {
    setCamera(CAMERA.hero)
  }, [])

  const rootRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLSpanElement>(null)
  const [arrow, setArrow] = useState<{ from: Pt; to: Pt } | null>(null)

  useEffect(() => {
    const measure = () => {
      const root = rootRef.current
      const end = endRef.current
      if (!root || !end) return
      const R = root.getBoundingClientRect()
      const E = end.getBoundingClientRect()
      const star = starOnScreen(R.width, R.height)
      const from = { x: E.left - R.left + E.height * 0.28, y: E.top - R.top + E.height * 0.42 }
      const to = {
        x: Math.max(from.x + 150, star.x - star.r * 0.76),
        y: star.y - star.r * 0.54,
      }
      setArrow({ from, to })
    }
    measure()
    const t = window.setTimeout(measure, 1200)
    void document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* legibility wash on the left; the right stays open for the star */}
      <div className="absolute inset-y-0 left-0 w-[66%] bg-[linear-gradient(90deg,rgb(5_8_20/0.86)_0%,rgb(5_8_20/0.66)_40%,rgb(5_8_20/0.3)_62%,transparent_100%)]" />

      {/* lockup */}
      <motion.div
        className="absolute top-[4.6vh] left-[5.5vw] flex items-center gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: T.lockup }}
      >
        <motion.img
          src={SPRITES.star}
          alt=""
          className="h-10 w-10 object-contain drop-shadow-[0_0_14px_rgba(136,200,248,0.55)]"
          animate={{ rotate: [0, -10, 8, 0], y: [0, -2, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
        />
        <div className="text-[30px] leading-none font-black tracking-tight">
          Viewfy <span className="text-star">Swarm</span>
        </div>
        <div className="mx-1 h-6 w-px bg-white/15" />
        <div className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">YC · Own your intelligence hackathon</div>
      </motion.div>

      {/* main stack */}
      <div className="absolute top-1/2 left-[5.5vw] w-[50vw] -translate-y-[50%]">
        <h1 className="text-[clamp(64px,5.2vw,108px)] leading-[0.93] font-black tracking-[-0.035em] text-cream">
          <Words text="Your AI" start={T.h1} />
          <br />
          <Words text="sales floor." start={T.h1 + 0.2} accent />
          <span ref={endRef} className="inline-block h-[0.72em] w-0" />
        </h1>

        <p className="mt-[2.4vh] text-[clamp(32px,2.3vw,46px)] leading-[1.1] font-black tracking-[-0.02em] text-cream/85">
          <Words text="Runs GTM every hour —" start={T.sub} step={0.06} />{' '}
          <span className="relative inline-block">
            <Words text="in" start={T.sub + 0.25} step={0.06} /> <Words text="your voice." start={T.sub + 0.31} step={0.06} accent />
            {/* scribbled underline */}
            <svg className="absolute -bottom-[0.28em] left-[1.15em] h-[0.3em] w-[calc(100%-1.1em)] overflow-visible" viewBox="0 0 200 12" preserveAspectRatio="none">
              <motion.path
                d="M2 8 C 40 3, 80 11, 120 6 S 180 4, 198 7"
                fill="none"
                stroke="#88c8f8"
                strokeOpacity={0.7}
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: T.sub + 0.7 }}
              />
            </svg>
          </span>
        </p>

        <div className="mt-[7vh]">
          <FloorRow delay={T.floor} />
        </div>

        <div className="mt-[4vh] flex w-max max-w-[60vw] flex-wrap gap-2.5">
          {CHIPS.map((c, i) => (
            <TechChip key={c.name} {...c} delay={T.chips + i * 0.09} />
          ))}
        </div>
      </div>

      {/* hand-drawn arrow → the star */}
      {arrow && <HandArrow from={arrow.from} to={arrow.to} note="that's your swarm ✦" delay={T.arrow} />}

      {/* hint */}
      <motion.div
        className="absolute bottom-[58px] left-[5.5vw] flex items-center gap-2.5 font-hand text-[clamp(26px,1.6vw,32px)] leading-none font-bold text-star"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: T.hint }}
      >
        <motion.div
          className="flex items-center gap-2.5"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: T.hint + 0.6 }}
        >
          <span>press</span>
          <motion.span
            className="inline-flex h-[1.15em] min-w-[1.5em] items-center justify-center rounded-lg border border-star/50 bg-star/10 px-1.5 text-[0.85em] shadow-[0_0_18px_-6px_#88c8f8]"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: T.hint + 0.6 }}
          >
            →
          </motion.span>
          <span>to watch it work</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
