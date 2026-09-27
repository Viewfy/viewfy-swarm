// Day 1 → 90: the mascot grows up as the swarm learns; reply rate climbs along a glowing dashed path.
import { motion } from 'motion/react'
import { MASCOTS } from '../../engine/layout'
import { AnimatedNumber } from './shared'

const GOLD = '#f6c667'

const STEPS = [
  { img: MASCOTS.learn1, day: 1, label: 'reads your Gmail + X', rate: 3, h: 42 },
  { img: MASCOTS.learn7, day: 7, label: 'learns what gets replies', rate: 7, h: 48 },
  { img: MASCOTS.learn30, day: 30, label: '1,000+ memories', rate: 12, h: 58 },
  { img: MASCOTS.learn90, day: 90, label: 'owns your GTM playbook', rate: 18, h: 68 },
]

const MASCOT_BOX = 70 // px, mascots are bottom-aligned in this box
const PAD_TOP = 12
const LINE_Y = PAD_TOP + MASCOT_BOX / 2 + 6 // the path runs through the mascots' bellies

// traveling glow timing (shared so each mascot lights up as the glow passes)
const ENTER = 1.5 // s — glow starts after the mascots have landed
const TRAVEL = 3.6
const REST = 1.1
const PERIOD = TRAVEL + REST

export default function DayStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: 0.7 }}
      className="relative shrink-0 overflow-hidden rounded-[20px] border border-white/[0.06] bg-night-900/45 backdrop-blur-md"
      style={{ height: 146 }}
    >
      <div className="absolute top-3 left-4 font-sans text-[11px] font-bold tracking-[0.2em] text-cream/50 uppercase">
        Day 1 → 90 <span className="text-gold/80">· reply rate</span>
      </div>

      {/* dashed path + traveling glow, from mascot 1 to mascot 4 (column centers 12.5% → 87.5%) */}
      <div className="absolute right-[12.5%] left-[12.5%]" style={{ top: LINE_Y }}>
        <svg className="absolute -top-px left-0 h-[2px] w-full overflow-visible">
          <motion.line
            x1="0"
            x2="100%"
            y1="1"
            y2="1"
            stroke={GOLD}
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="5 8"
            strokeLinecap="round"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -26 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
        <motion.div
          className="absolute -top-[5px] h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-gold"
          style={{ boxShadow: `0 0 14px 5px ${GOLD}aa, -26px 0 22px 2px ${GOLD}33` }}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{
            left: { duration: TRAVEL, ease: 'linear', repeat: Infinity, repeatDelay: REST, delay: ENTER },
            opacity: { duration: TRAVEL, times: [0, 0.08, 0.9, 1], repeat: Infinity, repeatDelay: REST, delay: ENTER },
          }}
        />
      </div>

      <div className="relative grid h-full grid-cols-4" style={{ paddingTop: PAD_TOP }}>
        {STEPS.map((s, i) => {
          const arrive = ENTER + (i / (STEPS.length - 1)) * TRAVEL
          return (
            <div key={s.day} className="flex min-w-0 flex-col items-center px-2 text-center">
              <div className="relative flex w-full items-end justify-center" style={{ height: MASCOT_BOX }}>
                {/* halo that flares as the glow passes through */}
                <motion.div
                  className="absolute rounded-full blur-xl"
                  style={{
                    width: s.h * 1.5,
                    height: s.h * 1.5,
                    bottom: -s.h * 0.2,
                    background: `radial-gradient(circle, ${GOLD}88, transparent 65%)`,
                  }}
                  initial={{ opacity: 0.12 }}
                  animate={{ opacity: [0.12, 0.85, 0.12] }}
                  transition={{
                    duration: 0.9,
                    times: [0, 0.35, 1],
                    repeat: Infinity,
                    repeatDelay: PERIOD - 0.9,
                    delay: Math.max(0, arrive - 0.3),
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: 22, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 13, delay: 0.85 + i * 0.14 }}
                  className="relative"
                >
                  <motion.img
                    src={s.img}
                    alt=""
                    draggable={false}
                    className="relative w-auto drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
                    style={{ height: s.h }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.8 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                  />
                  {/* reply-rate bubble */}
                  <motion.div
                    className="absolute -top-2 left-[78%] flex items-baseline rounded-full border border-gold/30 bg-night-900/85 px-2 py-0.5 whitespace-nowrap"
                    style={{ boxShadow: `0 0 18px -6px ${GOLD}` }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.05 + i * 0.14 }}
                  >
                    <AnimatedNumber
                      value={s.rate}
                      delay={1.1 + i * 0.14}
                      format={(v) => `${Math.round(v)}`}
                      className="text-[19px] leading-6 font-black text-gold"
                    />
                    <span className="text-[13px] font-black text-gold">%</span>
                  </motion.div>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + i * 0.14 }}
                className="mt-2 min-w-0"
              >
                <div className={`text-[16px] leading-5 font-black ${i === 3 ? 'text-gold' : 'text-cream'}`}>Day {s.day}</div>
                <div className="mt-0.5 text-[14px] leading-[18px] text-cream/65">{s.label}</div>
              </motion.div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
