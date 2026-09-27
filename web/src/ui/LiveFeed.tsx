// Right rail: live feed of what the swarm is doing (newest on top, animated inserts).
import { AnimatePresence, motion } from 'motion/react'
import { useSwarm } from '../engine/store'
import { SPRITES } from '../engine/layout'
import type { FeedItem } from '../engine/types'
import { PulseDot, useNow } from './bits'
import { TONE_COLOR, colorOf, relTime, rgba } from './format'

const VISIBLE = 10

function FeedRow({ item, now }: { item: FeedItem; now: number }) {
  const c = colorOf(item.squad)
  const toneColor = TONE_COLOR[item.tone] ?? TONE_COLOR.info
  const sprite = item.squad === 'brain' ? SPRITES.brain : SPRITES.mini(item.squad)

  return (
    <motion.li
      layout
      className="flex gap-3 rounded-2xl px-2.5 py-2"
      initial={{ opacity: 0, y: -18, scale: 0.97, backgroundColor: rgba(c, 0.16) }}
      animate={{ opacity: 1, y: 0, scale: 1, backgroundColor: rgba(c, 0) }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: 'spring', stiffness: 380, damping: 34 },
        opacity: { duration: 0.35 },
        y: { type: 'spring', stiffness: 320, damping: 26 },
        scale: { duration: 0.35 },
        backgroundColor: { duration: 1.8, ease: 'easeOut' },
      }}
    >
      <div
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(c, 0.32)}, ${rgba(c, 0.06)} 70%)` }}
      >
        <img src={sprite} alt="" className="h-6 w-6 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[14px] leading-snug font-bold" style={{ color: toneColor }}>
          {item.text}
        </div>
        {item.detail && (
          <div className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-cream/50 italic">
            “{item.detail.trim().replace(/^["“”']+|["“”']+$/g, '')}”
          </div>
        )}
      </div>
      <span className="tabular shrink-0 pt-0.5 text-[11px] text-cream/35">{relTime(item.at, now)}</span>
    </motion.li>
  )
}

function Empty() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 text-[14px] text-cream/45">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-star"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
      Swarm warming up — first signals incoming
    </div>
  )
}

export default function LiveFeed() {
  const feed = useSwarm((s) => s.feed)
  const loop = useSwarm((s) => s.loop)
  const now = useNow(1000)
  const items = (feed ?? []).slice(0, VISIBLE)

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 pt-4 pb-3">
        <PulseDot color="#6ee7b7" size={7} />
        <span className="text-[12px] font-bold tracking-[0.2em] text-cream/75 uppercase">Live feed</span>
        <span className="tabular ml-auto text-[11px] tracking-[0.2em] text-cream/40 uppercase">Run #{loop}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_62%,transparent_98%)]">
        {items.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-0.5 px-2.5 pt-2">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((item) => (
                <FeedRow key={item.id} item={item} now={now} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
