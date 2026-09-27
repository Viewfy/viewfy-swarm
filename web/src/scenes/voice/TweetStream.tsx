// Real @viewfy_ai posts drift right→left and get "absorbed" into the Voice squad (training).
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Tweet } from '../../data/types'
import { stripUrls, useStage } from './shared'

interface Flying {
  key: number
  tweet: Tweet
  lane: number
}

const CARD_W = 300
const SPAWN_MS = 1500
const TRAVEL_S = 11

export default function TweetStream({ tweets, handle, bandY, absorbAt }: {
  tweets: Tweet[]
  handle: string
  bandY: number
  absorbAt: { x: number; y: number }
}) {
  const { W } = useStage()
  const pool = useMemo(() => {
    const good = tweets
      .map((t) => ({ ...t, text: stripUrls(t.text) }))
      .filter((t) => t.text.length >= 48 && !t.text.startsWith('@'))
    const list = good.length >= 6 ? good : tweets.map((t) => ({ ...t, text: stripUrls(t.text) })).filter((t) => t.text)
    // interleave long & short so the band has rhythm
    return list.slice(0, 60)
  }, [tweets])

  const [cards, setCards] = useState<Flying[]>([])
  const seq = useRef(0)
  useEffect(() => {
    if (!pool.length) return
    const spawn = () => {
      const k = seq.current++
      const tweet = pool[(k * 7) % pool.length]
      setCards((cs) => [...cs.filter((c) => k - c.key < 12), { key: k, tweet, lane: k % 2 }])
    }
    // pre-seed a few so the band isn't empty on entry
    for (let i = 0; i < 3; i++) spawn()
    const id = setInterval(spawn, SPAWN_MS)
    return () => clearInterval(id)
  }, [pool])

  const turnX = 600
  return (
    <div className="absolute inset-0">
      {/* absorb glow at the voice squad */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: absorbAt.x - 90,
          top: absorbAt.y - 90,
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgb(167 139 250 / 0.35), rgb(167 139 250 / 0) 65%)',
        }}
        animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: SPAWN_MS / 1000, repeat: Infinity, ease: 'easeInOut' }}
      />
      {cards.map((c) => {
        const seeded = c.key < 3
        const y0 = bandY + (c.lane ? 18 : -18)
        const startX = seeded ? W - 360 - c.key * 420 : W + 40
        return (
          <motion.div
            key={c.key}
            className="glass absolute top-0 left-0 flex gap-2.5 px-3.5 py-2.5"
            style={{ width: CARD_W, borderRadius: 14, transformOrigin: '0% 50%' }}
            initial={{ x: startX, y: y0, opacity: 0, scale: 1, filter: 'blur(0px)' }}
            animate={{
              x: [startX, turnX, absorbAt.x - 20],
              y: [y0, y0, absorbAt.y - 30],
              scale: [1, 0.96, 0.12],
              opacity: [0, 1, 1, 0],
              filter: ['blur(0px)', 'blur(0px)', 'blur(6px)'],
            }}
            transition={{
              duration: seeded ? TRAVEL_S * ((startX - turnX) / (W + 40 - turnX)) + 2.2 : TRAVEL_S,
              times: [0, 0.8, 1],
              ease: ['linear', 'easeIn'],
              opacity: { duration: seeded ? 4 : TRAVEL_S, times: [0, 0.08, 0.86, 1], ease: 'linear' },
            }}
          >
            <img src="/brand/viewfy-mark.png" alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-night-800 object-contain p-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] leading-none text-cream/45">
                <span className="font-bold text-cream/80">viewfy</span>
                <span>{handle}</span>
                {c.tweet.likes > 0 && <span className="tabular ml-auto text-pink/70">♥ {c.tweet.likes}</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-[1.3] text-cream/85">{c.tweet.text}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
