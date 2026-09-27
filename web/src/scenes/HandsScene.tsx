// Scene 4 — "It uses your computer like you do." The Operator squad drives X and Gmail through a
// faux Chrome window with a visible agent cursor (Cua driver).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { setCamera } from '../engine/store'
import { MASCOTS, SQUADS, cameraOnSquad } from '../engine/layout'
import { Stage, useVoiceData } from './voice/shared'
import { useOperator, type FieldKey, type LogItem } from './hands/useOperator'
import { BrowserWindow, GmailApp, XApp } from './hands/Apps'
import AgentCursor from './hands/AgentCursor'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
})

export default function HandsScene() {
  useEffect(() => {
    setCamera(cameraOnSquad('operator', 2.2, 0.16, 0.55, 0.35))
  }, [])
  return (
    <Stage>
      <HandsLayout />
    </Stage>
  )
}

const WIN = { left: 470, top: 208, w: 1000, h: 660 }

function HandsLayout() {
  const data = useVoiceData()
  const v = useOperator(data)

  // --- measure field positions so the cursor lands on real elements ---
  const wrap = useRef<HTMLDivElement>(null)
  const els = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({})
  const reg = useCallback((k: FieldKey) => (el: HTMLElement | null) => {
    els.current[k] = el
  }, [])
  const [pos, setPos] = useState({ x: -120, y: WIN.h * 0.6 })
  useLayoutEffect(() => {
    const measure = () => {
      const c = wrap.current
      const el = els.current[v.aim]
      if (!c || !el) return
      const cr = c.getBoundingClientRect()
      const s = cr.width / c.offsetWidth || 1
      const r = el.getBoundingClientRect()
      const x = (r.left - cr.left) / s
      const y = (r.top - cr.top) / s
      const w = r.width / s
      const h = r.height / s
      if (v.aim === 'send') setPos({ x: x + w * 0.42, y: y + h * 0.55 })
      // while typing, step the cursor out of the way (just under the field) so the text stays readable
      else if (v.focus === v.aim) setPos({ x: x + Math.min(w * 0.7, 420), y: y + h + 10 })
      else setPos({ x: x + Math.min(90, w * 0.25), y: y + Math.min(h / 2, 22) })
    }
    // wait a frame for app swaps / layout to settle
    const id = requestAnimationFrame(measure)
    const id2 = setTimeout(measure, 350)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(id2)
    }
  }, [v.aim, v.job.id, v.sent, v.focus])

  return (
    <div className="absolute inset-0 font-sans">
      {/* headline */}
      <div className="absolute" style={{ left: 80, top: 54 }}>
        <motion.h1 {...rise(0)} className="text-[72px] leading-[0.95] font-black tracking-tight whitespace-nowrap text-cream">
          It uses your computer <span className="text-pink" style={{ textShadow: '0 0 40px rgb(244 114 182 / 0.5)' }}>like you do</span>.
        </motion.h1>
        <motion.div {...rise(0.2)} className="mt-5 flex items-center gap-3">
          <Chip dot={SQUADS.operator.color}>
            computer use · <b className="font-bold text-cream">Cua driver</b>
          </Chip>
          <Chip dot="#f6c667">
            QM policy: <b className="font-bold text-cream">press pitches need your OK</b>
          </Chip>
          {v.source === 'engine' && (
            <span className="flex items-center gap-1.5 rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-black tracking-[0.14em] text-coral uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-coral" /> Live · Act phase
            </span>
          )}
        </motion.div>
      </div>

      {/* hand-written note pointing from the squad to the window */}
      <motion.div
        className="absolute font-hand text-[34px] leading-none font-bold text-pink"
        style={{ left: 150, top: 330, rotate: -6 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        real clicks, real keys →
      </motion.div>

      {/* the browser window */}
      <motion.div
        ref={wrap}
        className="absolute"
        style={{ left: WIN.left, top: WIN.top, width: WIN.w, height: WIN.h }}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 20, delay: 0.25 }}
      >
        <div
          className="absolute inset-0 rounded-[14px]"
          style={{ boxShadow: '0 50px 120px -30px rgb(0 0 0 / 0.85), 0 0 90px -30px rgb(244 114 182 / 0.55)' }}
        />
        <BrowserWindow app={v.job.app}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={v.job.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {v.job.app === 'x' ? <XApp v={v} reg={reg} /> : <GmailApp v={v} reg={reg} />}
            </motion.div>
          </AnimatePresence>
        </BrowserWindow>
        <AgentCursor x={pos.x} y={pos.y} clickSeq={v.clickSeq} />
      </motion.div>

      {/* operator log */}
      <motion.div {...rise(0.45)} className="glass absolute flex flex-col p-5" style={{ left: WIN.left + WIN.w + 36, top: WIN.top, right: 48 }}>
        <div className="flex items-center gap-3">
          <motion.img
            src={MASCOTS.chrome}
            alt=""
            className="h-14 w-14 object-contain"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div>
            <div className="text-[18px] font-black tracking-tight text-cream">Activity log</div>
            <div className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">X · Gmail · Chrome</div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {v.log.slice(0, 6).map((l) => (
              <LogRow key={l.id} item={l} />
            ))}
          </AnimatePresence>
          {v.log.length === 0 && <div className="text-[14px] text-cream/40">Opening the browser…</div>}
        </div>
        <div className="mt-4 border-t border-white/[0.07] pt-3 text-[13px] leading-snug text-cream/55">
          Every pitch waits in your queue. You tap <b className="text-gold">approve</b>, the browser agent does the clicking.
        </div>
      </motion.div>
    </div>
  )
}

function LogRow({ item }: { item: LogItem }) {
  const color = item.squad === 'brain' ? '#88c8f8' : SQUADS[item.squad].color
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const ago = Math.max(0, Math.round((Date.now() - item.at) / 1000))
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex items-start gap-2.5 overflow-hidden rounded-xl bg-white/[0.03] px-3 py-2.5"
    >
      <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <div className="min-w-0 flex-1">
        <div className={`text-[14px] leading-snug ${item.tone === 'success' ? 'text-cream' : 'text-cream/75'}`}>
          {item.text}
          {item.tone === 'success' && <span className="ml-1 text-mint">✓</span>}
        </div>
        <div className="tabular mt-0.5 text-[11px] text-cream/40">{ago < 5 ? 'just now' : ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`}</div>
      </div>
    </motion.div>
  )
}

function Chip({ children, dot }: { children: React.ReactNode; dot: string }) {
  return (
    <div className="glass flex items-center gap-2 rounded-full! px-4 py-2 text-[15px] text-cream/70">
      <span className="h-2 w-2 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      {children}
    </div>
  )
}
