// Scene 6 — the close. Centered over the dimmed swarm: the wizard team, "Own your GTM intelligence.",
// the four ownership lines, a live recap, the CTA and the sponsor constellation.
import { Fragment, useEffect } from 'react'
import { motion } from 'motion/react'
import { setCamera, useSwarm } from '../engine/store'
import { CAMERA, LOGO_MASCOTS } from '../engine/layout'
import { CountUp, Words } from './hero/fx'
import TeamOrbit from './hero/TeamOrbit'

const OWN = [
  { mine: 'Your voice', by: 'River', color: '#a78bfa' },
  { mine: 'Your memory', by: 'gbrain', color: '#88c8f8' },
  { mine: 'Your playbooks', by: 'Memorable', color: '#f6c667' },
  { mine: 'Your floor', by: 'QM', color: '#6ee7b7' },
]

// Each sponsor as a Viewfy star holding its logo (logo = key in LOGO_MASCOTS; no logo → plain text chip).
// `h` = image height in px; the two with the logo held overhead get a little taller so the stars match.
const SPONSORS: { name: string; logo?: string; h?: number }[] = [
  { name: 'River AI', logo: 'river' },
  { name: 'GBrain', logo: 'gbrain' },
  { name: 'Memorable', logo: 'memorable' },
  { name: 'QM', logo: 'qm' },
  { name: 'Apify', logo: 'apify', h: 84 },
  { name: 'Superset', logo: 'superset' },
  { name: 'UFO', logo: 'ufo', h: 80 },
]

const T = {
  team: 0.1,
  h1: 0.55,
  own: 1.1,
  stats: 1.75,
  cta: 2.6,
  sponsors: 3.0,
}

function Stat({ label, value, color, i }: { label: string; value: number; color: string; i: number }) {
  return (
    <div className="flex min-w-[clamp(120px,8.5vw,168px)] flex-col items-center px-[clamp(14px,1.4vw,28px)]">
      <span style={{ color, textShadow: `0 0 22px ${color}40` }}>
        <CountUp
          value={value}
          delay={T.stats + 0.15 + i * 0.09}
          className="text-[clamp(38px,2.7vw,54px)] leading-none font-black tracking-tight"
        />
      </span>
      <div className="mt-2.5 flex items-center gap-2 text-[12px] font-bold tracking-[0.2em] whitespace-nowrap text-cream/55 uppercase">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        {label}
      </div>
    </div>
  )
}

export default function CloseScene() {
  useEffect(() => {
    setCamera(CAMERA.close)
  }, [])

  const kpis = useSwarm((s) => s.kpis)
  const stats = [
    { label: 'Loops run', value: kpis.loopsRun, color: '#6ee7b7' },
    { label: 'Pitches sent', value: kpis.pitches, color: '#ff8a70' },
    { label: 'Replies', value: kpis.repliesIn, color: '#7cc4fa' },
    { label: 'Meetings booked', value: kpis.meetings, color: '#f6c667' },
    { label: 'Memories', value: kpis.memories, color: '#88c8f8' },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* soft vignette so the composition reads over the swarm */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_46%,rgb(5_8_20/0.72)_0%,rgb(5_8_20/0.35)_60%,transparent_100%)]" />

      <div className="absolute inset-x-0 top-0 bottom-[150px] flex flex-col items-center justify-center text-center">
        <TeamOrbit delay={T.team} />

        <h1 className="relative z-10 mt-[2.2vh] text-[clamp(56px,4.5vw,92px)] leading-[0.98] font-black tracking-[-0.035em] text-cream">
          <Words text="Own your" start={T.h1} /> <Words text="GTM intelligence." start={T.h1 + 0.17} accent />
        </h1>

        {/* the four ownership lines */}
        <div className="mt-[3.2vh] flex flex-wrap items-center justify-center gap-x-[clamp(22px,2.2vw,44px)] gap-y-3">
          {OWN.map((o, i) => (
            <motion.div
              key={o.by}
              className="flex items-center gap-3 text-[clamp(18px,1.2vw,23px)] leading-none"
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: T.own + i * 0.12 }}
            >
              <span className="relative flex h-3 w-3 items-center justify-center">
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: o.color }}
                  animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: T.own + i * 0.3 }}
                />
                <span className="relative h-3 w-3 rounded-full" style={{ background: o.color, boxShadow: `0 0 12px ${o.color}` }} />
              </span>
              <span className="font-bold text-cream/80">{o.mine}</span>
              <span className="text-cream/35">→</span>
              <span className="font-black" style={{ color: o.color, textShadow: `0 0 16px ${o.color}55` }}>
                {o.by}
              </span>
            </motion.div>
          ))}
        </div>

        {/* live recap */}
        <motion.div
          className="glass mt-[4.4vh] flex items-stretch py-[clamp(16px,2vh,24px)]"
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: T.stats }}
        >
          {stats.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <div className="w-px self-stretch bg-white/8" />}
              <Stat {...s} i={i} />
            </Fragment>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="relative mt-[4.4vh]"
          initial={{ opacity: 0, scale: 0.6, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15, delay: T.cta }}
        >
          <motion.div
            className="absolute inset-[-10px] rounded-full bg-star/40 blur-2xl"
            animate={{ opacity: [0.45, 0.95, 0.45], scale: [0.96, 1.05, 0.96] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative overflow-hidden rounded-full bg-[linear-gradient(135deg,#bfe3ff_0%,#88c8f8_52%,#5aa9ec_100%)] px-[clamp(28px,2.2vw,44px)] py-[clamp(14px,1.6vh,20px)] text-[clamp(22px,1.55vw,30px)] leading-none font-black tracking-tight text-night-950 shadow-[0_0_60px_-10px_#88c8f8,inset_0_1px_0_rgb(255_255_255/0.6)]">
            Hire your swarm <span className="mx-1.5 inline-block">→</span> viewfy.ai
            {/* shimmer sweep */}
            <motion.span
              className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.55),transparent)]"
              initial={{ x: '-150%' }}
              animate={{ x: '420%' }}
              transition={{ duration: 1.3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.4, delay: T.cta + 0.6 }}
            />
          </div>
        </motion.div>
      </div>

      {/* sponsor constellation: a row of stars, each holding its sponsor's logo */}
      <div className="absolute inset-x-0 bottom-[54px] flex items-center justify-center gap-[clamp(18px,1.7vw,34px)]">
        {/* dark backdrop so the dimmed swarm behind the row doesn't fight the logos */}
        <div className="absolute -top-10 -bottom-8 left-1/2 w-[min(1200px,94vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_55%,rgb(5_8_20/0.9)_0%,rgb(5_8_20/0.62)_55%,transparent_100%)]" />
        <motion.div
          className="relative flex items-center gap-[clamp(18px,1.7vw,34px)] pb-5 text-[11px] font-bold tracking-[0.2em] whitespace-nowrap text-cream/40 uppercase"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: T.sponsors }}
        >
          Built with
          <span className="h-10 w-px bg-white/15" />
        </motion.div>
        <div className="relative flex items-end gap-[clamp(18px,1.7vw,34px)]">
          <motion.div
            className="absolute top-[46px] right-4 left-4 h-px bg-[linear-gradient(90deg,transparent,rgb(136_200_248/0.35),transparent)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: T.sponsors }}
          />
          {SPONSORS.map(({ name, logo, h = 72 }, i) => {
            const src = logo ? LOGO_MASCOTS[logo] : undefined
            return (
              <motion.div
                key={name}
                className="relative flex flex-col items-center"
                initial={{ opacity: 0, y: 14, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 16,
                  delay: T.sponsors + 0.05 + i * 0.07,
                  opacity: { duration: 0.3, delay: T.sponsors + 0.05 + i * 0.07 },
                }}
              >
                {src ? (
                  <motion.img
                    src={src}
                    alt=""
                    draggable={false}
                    className="w-auto max-w-[88px] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
                    style={{ height: h }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.4 + i * 0.17, repeat: Infinity, ease: 'easeInOut', delay: i * 0.31 }}
                  />
                ) : (
                  <span className="mb-1 flex h-[72px] items-center">
                    <span className="rounded-full border border-white/10 bg-night-900/70 px-3 py-1.5 text-[14px] font-bold whitespace-nowrap text-cream/60 backdrop-blur-sm">
                      {name}
                    </span>
                  </span>
                )}
                <span className="mt-1.5 text-[13px] leading-none font-bold whitespace-nowrap text-cream/65">{name}</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
