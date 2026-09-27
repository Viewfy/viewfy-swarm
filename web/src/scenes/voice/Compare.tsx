// Hero moment: "Generic AI" vs "Your voice · River", cycling through founder / company voices.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import type { Draft, Drafts, Targets } from '../../data/types'
import { Caret, targetInfo, typeSchedule, useTypewriter } from './shared'

const BUZZ =
  /(I hope this (?:email|message) finds you well!?|Dear Journalist,?|Great question!|Exciting news!|thrilled|excited|cutting-edge|state-of-the-art|AI-powered|AI-driven|leverag\w*|revolutioni[sz]e|fast-paced digital landscape|innovative|unlock\w*|supercharge|synerg\w*|at your earliest convenience|best-in-class|game-changing|empowers?|maximize ROI|drive engagement|mutually beneficial|take your marketing to the next level|Stay tuned for more!|leading|#\w+|🚀)/gi

interface Pair {
  generic: string
  draft: Draft
}

const CPS = 72

export default function Compare({ drafts, targets }: { drafts: Drafts; targets: Targets }) {
  const pairs = useMemo<Pair[]>(() => {
    const all = drafts.generic
      .map((g) => ({ generic: g.text, draft: drafts.drafts.find((d) => d.targetId === g.targetId) }))
      .filter((p): p is Pair => !!p.draft)
    const f = all.filter((p) => p.draft.voice === 'founder')
    const c = all.filter((p) => p.draft.voice === 'company')
    // alternate founder / company so the two voice chips alternate
    const out: Pair[] = []
    for (let i = 0; i < Math.max(f.length, c.length); i++) {
      if (f[i]) out.push(f[i])
      if (c[i]) out.push(c[i])
    }
    return out
  }, [drafts])

  const [idx, setIdx] = useState(0)
  const pair = pairs.length ? pairs[idx % pairs.length] : undefined
  useEffect(() => {
    if (!pair) return
    const full = (pair.draft.subject ? pair.draft.subject.length / 1.4 : 0) + pair.draft.text.length
    const sched = typeSchedule(pair.draft.text, CPS)
    const typingMs = (sched[sched.length - 1] ?? 0) + (full - pair.draft.text.length) * (1000 / CPS)
    const hold = Math.max(6200, typingMs + 3400)
    const t = setTimeout(() => setIdx((i) => i + 1), hold)
    return () => clearTimeout(t)
  }, [pair, idx])

  if (!pair) return null
  const voice = pair.draft.voice
  const info = targetInfo(targets, pair.draft.targetId)
  const isMail = pair.draft.channel === 'gmail'

  return (
    <div className="flex h-full flex-col">
      {/* two voices */}
      <div className="flex items-center gap-3">
        <span className="mr-1 text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">Two voices</span>
        {(
          [
            ['founder', 'Founder voice', 'journalists, X community'],
            ['company', 'Company voice', 'publishers, launches'],
          ] as const
        ).map(([id, name, to]) => (
          <div key={id} className="relative rounded-full px-4 py-2 text-[15px]">
            {voice === id && (
              <motion.div
                layoutId="voice-pill"
                className="absolute inset-0 rounded-full border border-violet/50 bg-violet/20"
                style={{ boxShadow: '0 0 30px -8px #a78bfa' }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              />
            )}
            <span className={clsx('relative transition-colors duration-500', voice === id ? 'text-cream' : 'text-cream/40')}>
              <b className="font-bold">{name}</b> <span className="text-violet">→</span> {to}
            </span>
          </div>
        ))}
      </div>

      {/* recipient */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`to-${idx}`}
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          <span className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">To</span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-black text-night-950"
            style={{ background: info.kind === 'journalist' ? '#ff8a70' : info.kind === 'publisher' ? '#f6c667' : '#7cc4fa' }}
          >
            {info.kind === 'community' || info.kind === 'self' ? '𝕏' : info.label[0]}
          </span>
          <span className="text-[22px] font-black tracking-tight text-cream">{info.label}</span>
          <span className="text-[16px] text-cream/55">{info.sub}</span>
          <span className="ml-auto rounded-full bg-white/[0.06] px-3 py-1 text-[12px] font-bold tracking-[0.14em] text-cream/60 uppercase">
            {isMail ? 'Gmail' : pair.draft.channel === 'x_reply' ? 'X reply' : 'X post'}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* the two cards */}
      <div className="relative mt-4 grid max-h-[660px] min-h-0 flex-1 grid-cols-2 gap-6">
        <div className="relative min-h-0">
          <AnimatePresence initial={false}>
            <GenericCard key={`g-${idx}`} text={pair.generic} isMail={isMail} />
          </AnimatePresence>
        </div>
        <div className="relative min-h-0">
          <AnimatePresence initial={false}>
            <VoiceCard key={`v-${idx}`} draft={pair.draft} runKey={String(idx)} />
          </AnimatePresence>
        </div>
        <div className="absolute top-1/2 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-night-900 text-[13px] font-black text-cream/60">
          vs
        </div>
      </div>
    </div>
  )
}

function Card({ children, className, style, delay = 0 }: { children: ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  return (
    <motion.div
      className={clsx('absolute inset-0 flex min-h-0 flex-col rounded-[20px] p-6', className)}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 140, damping: 20, delay }}
    >
      {children}
    </motion.div>
  )
}

function GenericCard({ text: raw, isMail }: { text: string; isMail: boolean }) {
  const m = raw.match(/^\s*Subject:\s*(.+)\n+/i)
  const subject = m ? m[1] : 'Exciting Partnership Opportunity 🚀'
  const text = m ? raw.slice(m[0].length) : raw
  const parts = useMemo(() => text.split(BUZZ), [text])
  const nBuzz = Math.floor(parts.length / 2)
  const [struck, setStruck] = useState(0)
  useEffect(() => {
    setStruck(0)
    let k = 0
    const start = setTimeout(() => {
      const id = setInterval(() => {
        k++
        setStruck(k)
        if (k >= nBuzz) clearInterval(id)
      }, 260)
      cleanup = () => clearInterval(id)
    }, 900)
    let cleanup = () => {}
    return () => {
      clearTimeout(start)
      cleanup()
    }
  }, [text, nBuzz])

  let bi = 0
  return (
    <Card className="border border-white/[0.07] bg-[#161a24]/90" style={{ filter: 'saturate(0.4)' }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] text-[15px] text-cream/50">✦</span>
        <div>
          <div className="text-[16px] font-bold text-cream/60">Generic AI</div>
          <div className="text-[12px] text-cream/35">default assistant, no training</div>
        </div>
        <span className="ml-auto rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-bold text-cream/40">
          <span className="tabular">{nBuzz}</span> clichés
        </span>
      </div>
      {isMail && <div className="mt-4 truncate border-b border-white/[0.06] pb-2 text-[14px] text-cream/40">Subject: {subject}</div>}
      <p
        className="mt-4 min-h-0 flex-1 overflow-hidden text-[16px] leading-[1.55] whitespace-pre-line text-cream/50"
        style={{ maskImage: 'linear-gradient(to bottom, black 78%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 78%, transparent)' }}
      >
        {parts.map((p, i) => {
          if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
          const on = bi++ < struck
          return (
            <span
              key={i}
              className="rounded-[3px] transition-[background-size,color] duration-300 ease-out"
              style={{
                color: on ? '#ff8a70' : undefined,
                backgroundImage: 'linear-gradient(#ff8a70, #ff8a70), linear-gradient(rgb(255 138 112 / 0.16), rgb(255 138 112 / 0.16))',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '0 58%, 0 0',
                backgroundSize: on ? '100% 2px, 100% 100%' : '0% 2px, 0% 100%',
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {p}
            </span>
          )
        })}
      </p>
    </Card>
  )
}

function VoiceCard({ draft, runKey }: { draft: Draft; runKey: string }) {
  const subj = draft.subject ?? ''
  const subN = useTypewriter(subj, { cps: CPS * 1.4, delay: 500, runKey })
  const subjMs = subj ? typeSchedule(subj, CPS * 1.4).at(-1) ?? 0 : 0
  const n = useTypewriter(draft.text, { cps: CPS, delay: 600 + subjMs + (subj ? 250 : 0), runKey })
  const done = n >= draft.text.length
  return (
    <Card
      className="border border-violet/40 bg-[#1a1438]/85"
      style={{ boxShadow: '0 0 60px -12px rgb(167 139 250 / 0.75), 0 0 0 1px rgb(167 139 250 / 0.15) inset' }}
      delay={0.08}
    >
      <div className="flex items-center gap-2.5">
        <img src="/brand/sprites/voice-64.png" alt="" className="h-9 w-9 object-contain" />
        <div>
          <div className="text-[16px] font-bold text-cream">
            Your voice <span className="text-violet">· River</span>
          </div>
          <div className="text-[12px] text-cream/50">{draft.voice === 'founder' ? 'founder voice · Mike' : 'company voice · Viewfy'}</div>
        </div>
        <motion.span
          className="ml-auto rounded-full bg-violet px-3 py-1 text-[13px] font-black text-night-950"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: done ? [1, 1.12, 1] : 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="tabular">{Math.round(draft.voiceMatch * 100)}%</span> voice match
        </motion.span>
      </div>
      {subj && (
        <div className="mt-4 border-b border-violet/15 pb-2 text-[14px] text-cream/60">
          Subject: <span className="text-cream">{subj.slice(0, subN)}</span>
          {subN < subj.length && subN > 0 && <Caret />}
        </div>
      )}
      <p className="mt-4 min-h-0 flex-1 overflow-hidden text-[16px] leading-[1.55] whitespace-pre-line text-cream">
        {draft.text.slice(0, n)}
        {(!subj || subN >= subj.length) && <Caret className={done ? 'opacity-60' : ''} />}
      </p>
    </Card>
  )
}
