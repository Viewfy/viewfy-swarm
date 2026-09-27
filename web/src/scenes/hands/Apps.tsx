// Faux macOS Chrome window + the two apps the Operator drives: X (dark) and Gmail compose (dark).
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { GmailGlyph } from '../voice/glyphs'
import type { FieldKey, OperatorView } from './useOperator'

export type Reg = (k: FieldKey) => (el: HTMLElement | null) => void

const XBLUE = '#1d9bf0'

// ------------------------------------------------------------------ window chrome
export function BrowserWindow({ app, children }: { app: 'x' | 'gmail'; children: ReactNode }) {
  const url = app === 'x' ? 'x.com/i/status/2104271697042182383' : 'mail.google.com/mail/u/0/#inbox?compose=new'
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-[#1e1f22]">
      {/* tab strip */}
      <div className="flex h-[42px] shrink-0 items-end gap-2 bg-[#141518] pr-3 pl-4">
        <div className="mb-[14px] flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-4 flex items-end gap-1">
          <Tab active={app === 'x'} icon={<XLogo size={12} />} title="Mike on X: “distribution…” / X" />
          <Tab active={app === 'gmail'} icon={<GmailGlyph size={14} />} title="Inbox (3) - Gmail" />
          <span className="mb-2 ml-1 text-[16px] text-white/30">+</span>
        </div>
      </div>
      {/* toolbar */}
      <div className="flex h-[42px] shrink-0 items-center gap-3 border-b border-black/40 bg-[#1e1f22] px-3 text-white/45">
        <span className="text-[15px]">←</span>
        <span className="text-[15px] text-white/20">→</span>
        <span className="text-[14px]">↻</span>
        <div className="flex h-[30px] flex-1 items-center gap-2 rounded-full bg-[#2a2b2f] px-4 text-[13.5px]">
          <svg width="11" height="13" viewBox="0 0 11 13" className="opacity-60">
            <rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="currentColor" />
            <path d="M3 5.5V4a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
          <AnimatePresence mode="wait">
            <motion.span key={url} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="truncate">
              <span className="text-white/85">{url.split('/')[0]}</span>
              <span>/{url.split('/').slice(1).join('/')}</span>
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-pink/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-pink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pink" /> Cua driving
        </span>
        <img src="/brand/viewfy-favicon-face.png" alt="" className="h-6 w-6 rounded-full bg-[#88c8f8]/20 object-contain" />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}

function Tab({ active, icon, title }: { active: boolean; icon: ReactNode; title: string }) {
  return (
    <div
      className={clsx(
        'flex h-[32px] w-[200px] items-center gap-2 rounded-t-[10px] px-3 text-[12.5px] transition-colors duration-300',
        active ? 'bg-[#1e1f22] text-white/85' : 'text-white/40',
      )}
    >
      <span className="flex w-4 justify-center">{icon}</span>
      <span className="truncate">{title}</span>
      <span className="ml-auto text-[11px] opacity-50">✕</span>
    </div>
  )
}

export function XLogo({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TypedText({ text, n, caret, color = XBLUE }: { text: string; n: number; caret: boolean; color?: string }) {
  return (
    <>
      {text.slice(0, n)}
      {caret && <span className="ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.2em] animate-pulse" style={{ background: color }} />}
    </>
  )
}

function Ripple({ seq, color }: { seq: number; color: string }) {
  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={seq}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: `0 0 0 3px ${color}` }}
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 1.18 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </AnimatePresence>
  )
}

// ------------------------------------------------------------------ X
const Icon = ({ d }: { d: string }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const I = {
  reply: 'M4 5h16v11H9l-5 4z',
  rt: 'M7 7h10v6M17 17H7v-6M4 10l3-3 3 3M20 14l-3 3-3-3',
  like: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  views: 'M5 20V10M10 20V4M15 20v-7M20 20v-11',
  img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  gif: 'M4 6h16v12H4zM9 10H7v4h2v-2M12 10v4M15 14v-4h2.5M15 12h2',
  poll: 'M5 6h8M5 12h14M5 18h10',
  emoji: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 007 0',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20h4',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
}

export function XApp({ v, reg }: { v: OperatorView; reg: Reg }) {
  const { job } = v
  const typing = v.focus === 'body'
  const empty = v.bodyN === 0
  return (
    <div className="absolute inset-0 flex bg-black font-[system-ui,-apple-system,'Segoe_UI',sans-serif] text-[#e7e9ea]">
      {/* nav rail */}
      <div className="flex w-[76px] shrink-0 flex-col items-center gap-6 border-r border-[#2f3336] pt-4 text-[#e7e9ea]/80">
        <XLogo size={26} />
        <Icon d={I.home} />
        <Icon d={I.search} />
        <Icon d={I.bell} />
        <Icon d={I.mail} />
        <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#eff3f4] text-[20px] font-black text-black">+</div>
      </div>
      {/* timeline column */}
      <div className="relative w-[600px] shrink-0 border-r border-[#2f3336]">
        <div className="flex h-[52px] items-center gap-6 border-b border-[#2f3336] px-4 text-[19px] font-bold">
          <span className="text-[18px]">←</span> Post
        </div>
        {/* original post */}
        <div className="border-b border-[#2f3336] px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#f6c667] via-[#ff8a70] to-[#f472b6]" />
            <div className="leading-tight">
              <div className="text-[15px] font-bold">{job.to.replace('@', '').replace(/\*+/, '')}•••</div>
              <div className="text-[14px] text-[#71767b]">{job.to}</div>
            </div>
            <span className="ml-auto rounded-full border border-[#536471] px-3.5 py-1 text-[14px] font-bold">Follow</span>
          </div>
          <p className="mt-3 text-[17px] leading-[1.35]">{job.context ?? '…'}</p>
          <div className="mt-3 text-[14px] text-[#71767b]">
            1:42 PM · Sep 27, 2026 · <b className="tabular text-[#e7e9ea]">{(1.2 + ((job.contextLikes ?? 20) % 9) / 3).toFixed(1)}K</b> Views
          </div>
          <div className="mt-2 flex justify-between border-t border-[#2f3336] px-1 pt-2 text-[13px] text-[#71767b]">
            <span className="flex items-center gap-1.5"><Icon d={I.reply} /> {v.sent ? 13 : 12}</span>
            <span className="flex items-center gap-1.5"><Icon d={I.rt} /> 4</span>
            <span className="flex items-center gap-1.5"><Icon d={I.like} /> <span className="tabular">{job.contextLikes ?? 31}</span></span>
            <span className="flex items-center gap-1.5"><Icon d={I.views} /></span>
          </div>
        </div>
        {/* composer / posted reply */}
        {!v.sent ? (
            <div key="compose" className="border-b border-[#2f3336] px-4 pt-3 pb-3">
              <div className="pl-[52px] text-[14px] text-[#71767b]">
                Replying to <span style={{ color: XBLUE }}>{job.to}</span>
              </div>
              <div className="mt-1.5 flex gap-3">
                <img src="/brand/viewfy-favicon-face.png" alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#88c8f8]/25 object-contain" />
                <div ref={reg('body')} className="min-h-[76px] flex-1 pt-1.5 text-[18px] leading-[1.35]">
                  {empty && !typing ? (
                    <span className="text-[#71767b]">Post your reply</span>
                  ) : (
                    <TypedText text={job.text} n={v.bodyN} caret={typing} />
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3.5 pl-[52px]" style={{ color: XBLUE }}>
                <Icon d={I.img} />
                <Icon d={I.gif} />
                <Icon d={I.poll} />
                <Icon d={I.emoji} />
                <span className="ml-auto text-[13px] text-[#71767b] tabular">{v.bodyN > 0 ? 280 - v.bodyN : ''}</span>
                <motion.button
                  ref={reg('send')}
                  className="relative rounded-full px-5 py-2 text-[15px] font-bold text-black"
                  animate={{ backgroundColor: empty ? '#787a7a' : '#eff3f4' }}
                >
                  Reply
                  {v.aim === 'send' && <Ripple seq={v.clickSeq} color={XBLUE} />}
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.div
              key="posted"
              initial={{ opacity: 0, y: 12, backgroundColor: 'rgba(29,155,240,0.16)' }}
              animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(29,155,240,0)' }}
              transition={{ duration: 1.2 }}
              className="flex gap-3 border-b border-[#2f3336] px-4 py-3"
            >
              <img src="/brand/viewfy-favicon-face.png" alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#88c8f8]/25 object-contain" />
              <div>
                <div className="text-[15px]">
                  <b>Mike · Viewfy</b> <span className="text-[#71767b]">@viewfy_ai · now</span>
                </div>
                <div className="text-[14px] text-[#71767b]">
                  Replying to <span style={{ color: XBLUE }}>{job.to}</span>
                </div>
                <p className="mt-1 text-[16px] leading-[1.35]">{job.text}</p>
              </div>
            </motion.div>
          )}
      </div>
      {/* right rail */}
      <div className="flex-1 space-y-3 overflow-hidden p-4">
        <div className="rounded-full bg-[#202327] px-4 py-2.5 text-[14px] text-[#71767b]">Search</div>
        <div className="rounded-2xl border border-[#2f3336] p-4">
          <div className="text-[18px] font-extrabold">What’s happening</div>
          {['#buildinpublic', 'Show HN', 'AI agents', 'Solo founders'].map((t, i) => (
            <div key={t} className="mt-3">
              <div className="text-[12px] text-[#71767b]">Trending in Tech</div>
              <div className="text-[14px] font-bold">{t}</div>
              <div className="text-[12px] text-[#71767b] tabular">{[4.2, 12.8, 31.1, 2.6][i]}K posts</div>
            </div>
          ))}
        </div>
      </div>
      {/* toast */}
      <AnimatePresence>
        {v.sent && (
          <motion.div
            className="absolute bottom-6 left-[376px] flex -translate-x-1/2 items-center gap-3 rounded-[6px] px-4 py-2.5 text-[15px] font-bold text-white shadow-2xl"
            style={{ background: XBLUE }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.25 }}
          >
            Posted ✓ <span className="font-normal opacity-90">Your reply is live</span>
            <span className="underline underline-offset-2">View</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ------------------------------------------------------------------ Gmail
export function GmailApp({ v, reg }: { v: OperatorView; reg: Reg }) {
  const { job } = v
  const subj = job.subject ?? ''
  return (
    <div className="absolute inset-0 bg-[#111317] font-[system-ui,-apple-system,'Segoe_UI',sans-serif] text-[#e3e3e3]">
      {/* top bar */}
      <div className="flex h-[58px] items-center gap-4 px-4">
        <span className="text-[20px] text-white/60">☰</span>
        <GmailGlyph size={28} />
        <span className="-ml-2 text-[21px] text-white/75">Gmail</span>
        <div className="ml-8 flex h-[42px] w-[440px] items-center gap-3 rounded-full bg-[#2a2d33] px-4 text-[15px] text-white/45">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" />
          </svg>
          Search mail
        </div>
        <img src="/brand/viewfy-favicon-face.png" alt="" className="ml-auto h-8 w-8 rounded-full bg-[#88c8f8]/25 object-contain" />
      </div>
      <div className="flex h-[calc(100%-58px)]">
        {/* left nav */}
        <div className="w-[196px] shrink-0 px-2 pt-1 text-[14px]">
          <div className="mb-3 ml-1 flex h-[52px] w-[136px] items-center gap-3 rounded-2xl bg-[#c2e7ff] px-4 font-bold text-[#001d35]">✎ Compose</div>
          {[
            ['Inbox', '3', true],
            ['Starred', '', false],
            ['Snoozed', '', false],
            ['Sent', '', false],
            ['Drafts', '2', false],
          ].map(([n, c, on]) => (
            <div key={n as string} className={clsx('flex h-8 items-center rounded-r-full pr-3 pl-6', on ? 'bg-[#3a4152] font-bold text-white' : 'text-white/70')}>
              {n}
              <span className="ml-auto tabular">{c}</span>
            </div>
          ))}
        </div>
        {/* inbox list (background) */}
        <div className="flex-1 overflow-hidden rounded-tl-2xl bg-[#1b1d22] pt-2">
          {[
            ['Maya Chen', 'Re: solo founders are handing GTM to agents', 'sure — send the numbers, I’m writing…'],
            ["Lenny's Newsletter", 'Re: guest post idea', 'Love this angle. Can you do 1,500 words…'],
            ['Stripe', 'Payment received: $1,000.00', 'Invoice #0042 was paid'],
            ['Dan Reyes', 'Re: $1k invoice in 8 hours', 'Following up on this — free Thursday?'],
            ['Indie Hackers', 'Your post is trending', '312 upvotes on “distribution is a product”'],
            ['Vercel', 'Deployment ready', 'viewfy-web · production'],
            ['Priya Nair', 'Re: Reddit’s AI mod', 'Interesting. Who else is seeing this?'],
          ].map(([from, s, p], i) => (
            <div key={i} className={clsx('flex h-[40px] items-center gap-4 border-b border-white/[0.04] px-5 text-[14px]', i < 3 ? 'text-white' : 'text-white/55')}>
              <span className="w-[150px] truncate font-bold">{from}</span>
              <span className="truncate">
                <span className={i < 3 ? 'font-bold' : ''}>{s}</span> <span className="text-white/40">– {p}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* compose dialog */}
      <motion.div
        className="absolute right-5 bottom-0 flex h-[486px] w-[600px] flex-col overflow-hidden rounded-t-[12px] bg-[#1f2228] shadow-[0_10px_60px_rgba(0,0,0,0.7)]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <div className="flex h-[40px] items-center bg-[#2c3038] px-4 text-[14px] font-bold">
          New Message
          <span className="ml-auto flex gap-4 text-[13px] font-normal text-white/60">
            <span>—</span>
            <span>⤢</span>
            <span>✕</span>
          </span>
        </div>
        <div className="flex h-[38px] items-center gap-2 border-b border-white/[0.07] px-4 text-[14px]">
          <span className="text-white/50">To</span>
          <span className="flex items-center gap-2 rounded-full bg-[#3a3f4a] py-0.5 pr-3 pl-0.5 text-[13.5px]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral text-[12px] font-black text-night-950">
              {(job.toName ?? job.to)[0].toUpperCase()}
            </span>
            {job.toName ? (
              <>
                {job.toName} <span className="text-white/50">&lt;{job.to}&gt;</span>
              </>
            ) : (
              job.to
            )}
          </span>
          <span className="ml-auto rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint">✓ approved by you</span>
        </div>
        <div ref={reg('subject')} className="flex h-[40px] items-center border-b border-white/[0.07] px-4 text-[15px]">
          {v.subjectN === 0 && v.focus !== 'subject' ? (
            <span className="text-white/40">Subject</span>
          ) : (
            <span className="truncate">
              <TypedText text={subj} n={v.subjectN} caret={v.focus === 'subject'} color="#a8c7fa" />
            </span>
          )}
        </div>
        <div ref={reg('body')} className="min-h-0 flex-1 overflow-hidden px-4 pt-3 text-[15px] leading-[1.5] whitespace-pre-line">
          <TypedText text={job.text} n={v.bodyN} caret={v.focus === 'body'} color="#a8c7fa" />
        </div>
        <div className="flex h-[58px] items-center gap-4 px-4">
          <motion.div ref={reg('send')} className="relative flex h-[38px] items-center overflow-hidden rounded-full bg-[#a8c7fa] text-[14px] font-bold text-[#062e6f]">
            <span className="px-5">Send</span>
            <span className="h-full border-l border-[#062e6f]/25 px-2.5 leading-[38px]">▾</span>
            {v.aim === 'send' && <Ripple seq={v.clickSeq} color="#a8c7fa" />}
          </motion.div>
          <span className="text-[15px] text-white/45">A</span>
          <span className="text-[15px] text-white/45">📎</span>
          <span className="text-[15px] text-white/45">🔗</span>
          <span className="text-[15px] text-white/45">☺</span>
          <span className="ml-auto text-[15px] text-white/45">🗑</span>
        </div>
        {/* sent overlay */}
        <AnimatePresence>
          {v.sent && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1f2228]/92 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-[34px] font-black text-night-950"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.3 }}
              >
                ✓
              </motion.div>
              <div className="text-[26px] font-black tracking-tight text-cream">Sent ✓</div>
              <div className="text-[14px] text-white/55">to {job.toName ?? job.to}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* gmail toast */}
      <AnimatePresence>
        {v.sent && (
          <motion.div
            className="absolute bottom-5 left-5 flex items-center gap-5 rounded-[6px] bg-[#e3e3e3] px-5 py-3 text-[14px] text-[#1f1f1f] shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.35 }}
          >
            Message sent.
            <span className="font-bold text-[#0b57d0]">Undo</span>
            <span className="font-bold text-[#0b57d0]">View message</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
