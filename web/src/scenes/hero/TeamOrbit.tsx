// The wizard team floating in a star-blue glow, with the six squad minis orbiting its magic circle.
import { motion, useTime, useTransform } from 'motion/react'
import { MASCOTS, SPRITES, SQUAD_ORDER, SQUADS } from '../../engine/layout'
import type { SquadId } from '../../engine/types'
import { Twinkle } from './fx'

const PERIOD = 16_000 // ms per orbit

function Mini({ id, i, delay }: { id: SquadId; i: number; delay: number }) {
  const time = useTime()
  const phase = (i / SQUAD_ORDER.length) * Math.PI * 2
  const theta = useTransform(time, (t) => (t / PERIOD) * Math.PI * 2 + phase)
  // flat ellipse around the feet; z from sin(θ): front half passes over the mascot
  const left = useTransform(theta, (a) => `${50 + Math.cos(a) * 62}%`)
  const top = useTransform(theta, (a) => `${80 + Math.sin(a) * 13}%`)
  const s = useTransform(theta, (a) => 0.8 + 0.24 * Math.sin(a))
  const z = useTransform(theta, (a) => (Math.sin(a) > 0 ? 3 : 1))
  const o = useTransform(theta, (a) => 0.72 + 0.28 * Math.sin(a))
  const color = SQUADS[id].color

  return (
    <motion.div className="absolute h-0 w-0" style={{ left, top, zIndex: z }}>
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: delay + i * 0.07 }}
      >
        <motion.img
          src={SPRITES.mini(id)}
          alt=""
          draggable={false}
          className="h-[clamp(32px,4.2vh,48px)] w-[clamp(32px,4.2vh,48px)] max-w-none object-contain"
          style={{ scale: s, opacity: o, filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </motion.div>
    </motion.div>
  )
}

export default function TeamOrbit({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative aspect-square h-[28vh]">
      {/* glow */}
      <motion.div
        className="absolute inset-[-45%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(136 200 248 / 0.42) 0%, rgb(136 200 248 / 0.16) 32%, rgb(74 159 232 / 0.06) 52%, transparent 68%)',
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.07, 1] }}
        transition={{
          opacity: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay },
          scale: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay },
        }}
      />
      {/* orbit ring hint */}
      <motion.div
        className="absolute top-[80%] left-1/2 h-[26%] w-[124%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-star/20"
        style={{ boxShadow: '0 0 30px -8px rgb(136 200 248 / 0.4)' }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: delay + 0.3 }}
      />

      {SQUAD_ORDER.map((id, i) => (
        <Mini key={id} id={id} i={i} delay={delay + 0.5} />
      ))}

      {/* the team */}
      <motion.div
        className="absolute inset-0 z-[2]"
        initial={{ opacity: 0, scale: 0.55, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, delay, opacity: { duration: 0.4, delay } }}
      >
        <motion.img
          src={MASCOTS.team}
          alt="Your swarm"
          draggable={false}
          className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          animate={{ y: [0, -12, 0], rotate: [0, -1, 0, 1, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <Twinkle className="top-[4%] left-[6%]" delay={delay + 0.6} size={16} />
      <Twinkle className="top-[18%] right-[-4%]" delay={delay + 1.5} size={12} color="#f6c667" />
      <Twinkle className="top-[46%] left-[-10%]" delay={delay + 2.3} size={10} />
      <Twinkle className="top-[-6%] right-[22%]" delay={delay + 1.1} size={11} color="#a78bfa" />
    </div>
  )
}
