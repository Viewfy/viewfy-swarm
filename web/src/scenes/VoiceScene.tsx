// Scene 3 — "It sounds like you." River fine-tune on the founder's X + Gmail, tone fingerprint,
// and the hero side-by-side: generic AI vs. your voice.
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { setCamera } from '../engine/store'
import { cameraOnSquad } from '../engine/layout'
import { Stage, avgVoiceMatch, fmt, useStage, useVoiceData } from './voice/shared'
import { GmailGlyph } from './voice/glyphs'
import TweetStream from './voice/TweetStream'
import { CountUp, LossCurve, Radar } from './voice/Charts'
import Compare from './voice/Compare'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
})

export default function VoiceScene() {
  useEffect(() => {
    setCamera(cameraOnSquad('voice', 2.1, 0.2, 0.55, 0.3))
  }, [])
  return (
    <Stage>
      <VoiceLayout />
    </Stage>
  )
}

const LEFT = 520
const COL_W = 480
const RIGHT = LEFT + COL_W + 44

function VoiceLayout() {
  const { W, H } = useStage()
  const { corpus, fingerprint, training, drafts, targets } = useVoiceData()
  const voiceMatch = training.voiceMatch > 0 ? training.voiceMatch : avgVoiceMatch(drafts.drafts)
  const finalLoss = training.steps.at(-1)?.loss ?? 0
  const firstLoss = training.steps[0]?.loss ?? 0
  const base = training.baseModel.split('/').pop() ?? training.baseModel
  const examples = training.examples > 0 ? training.examples : corpus.tweets.length + 1912
  const top = 330
  const bottom = 64

  return (
    <div className="absolute inset-0 font-sans">
      {/* tweets streaming into the voice squad (behind the panels) */}
      <TweetStream tweets={corpus.tweets} handle={corpus.handle} bandY={236} absorbAt={{ x: 0.2 * W, y: 0.55 * H }} />

      {/* headline */}
      <div className="absolute" style={{ left: LEFT, top: 54 }}>
        <motion.h1 {...rise(0)} className="text-[80px] leading-[0.95] font-black tracking-tight text-cream">
          It sounds like <span className="text-violet" style={{ textShadow: '0 0 40px rgb(167 139 250 / 0.55)' }}>you</span>.
        </motion.h1>
        <motion.div
          className="absolute top-[2px] left-[672px] font-hand text-[38px] leading-[0.9] font-bold whitespace-nowrap text-star"
          initial={{ opacity: 0, rotate: -8, x: -10 }}
          animate={{ opacity: 1, rotate: -5, x: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          trained on your
          <br />
          Gmail + X ↓
        </motion.div>
        {/* source chips */}
        <motion.div {...rise(0.25)} className="mt-6 flex items-center gap-3">
          <Chip>
            <span className="text-[17px] font-black">𝕏</span>
            <span className="font-bold text-cream">{corpus.handle}</span>
            <span className="text-cream/50">·</span>
            <span className="tabular">{fmt(corpus.tweets.length)}</span> posts
            {corpus.real && <Badge color="#6ee7b7">real · Apify</Badge>}
          </Chip>
          <Chip>
            <GmailGlyph />
            <span className="font-bold text-cream">Gmail</span>
            <span className="text-cream/50">·</span>
            <span className="tabular">1,912</span> sent emails
          </Chip>
          <Chip glow>
            <span className="h-2 w-2 rounded-full bg-violet" />
            <span className="font-bold text-cream">River</span>
            <span className="text-cream/50">·</span> LoRA on {base}
            {training.real && <LiveBadge />}
          </Chip>
        </motion.div>
      </div>

      {/* left column: training + fingerprint */}
      <div className="absolute flex flex-col gap-5" style={{ left: LEFT, top, width: COL_W, bottom }}>
        <motion.div {...rise(0.35)} className="glass p-6">
          <div className="flex items-center">
            <span className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">Fine-tune · loss</span>
            <span className="ml-auto text-[13px] text-cream/50">
              <span className="tabular">{fmt(examples)}</span> examples · <span className="tabular">{training.steps.length}</span> steps
            </span>
          </div>
          <div className="mt-3">
            <LossCurve steps={training.steps} width={COL_W - 48} height={128} delay={0.6} />
          </div>
          <div className="mt-4 flex items-end gap-8">
            <div>
              <div className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">Final loss</div>
              <div className="text-[40px] leading-none font-black text-cream">
                <CountUp from={firstLoss} to={finalLoss} decimals={2} duration={2.4} delay={0.6} />
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[64px] leading-[0.9] font-black tracking-tight text-violet" style={{ textShadow: '0 0 30px rgb(167 139 250 / 0.5)' }}>
                <CountUp to={voiceMatch * 100} duration={2.6} delay={0.8} suffix="%" />
              </div>
              <div className="mt-1 text-[14px] font-bold text-cream/70">voice match</div>
            </div>
          </div>
        </motion.div>

        <motion.div {...rise(0.5)} className="glass p-5">
          <div className="flex items-center">
            <span className="text-[12px] font-bold tracking-[0.2em] text-cream/50 uppercase">Tone fingerprint</span>
            <span className="ml-auto text-[13px] text-cream/50">
              ~<span className="tabular">{Math.round(fingerprint.avgWords)}</span> words/post ·{' '}
              <span className="tabular">{Math.round(fingerprint.emojiRate * 100)}%</span> emoji
            </span>
          </div>
          <div className="mt-1 flex justify-center">
            <Radar traits={fingerprint.traits.slice(0, 7)} size={210} delay={0.9} />
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {[...fingerprint.signaturePhrases]
              .sort((a, b) => a.length - b.length)
              .slice(0, 6)
              .map((p, i) => (
                <motion.span
                  key={p}
                  className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-[13px] leading-tight text-cream/85"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  “{p}”
                </motion.span>
              ))}
          </div>
        </motion.div>
      </div>

      {/* right column: the hero comparison */}
      <motion.div {...rise(0.45)} className="absolute" style={{ left: RIGHT, top: top + 4, right: 44, bottom }}>
        <Compare drafts={drafts} targets={targets} />
      </motion.div>
    </div>
  )
}

function Chip({ children, glow }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <div
      className="glass flex items-center gap-2 rounded-full! px-4 py-2 text-[15px] text-cream/75"
      style={glow ? { boxShadow: '0 0 30px -10px #a78bfa', borderColor: 'rgb(167 139 250 / 0.35)' } : undefined}
    >
      {children}
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-black tracking-[0.12em] uppercase" style={{ background: `${color}22`, color }}>
      {children}
    </span>
  )
}

function LiveBadge() {
  return (
    <span className="ml-1 flex items-center gap-1.5 rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-black tracking-[0.14em] text-coral uppercase">
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-coral opacity-70" />
        <span className="relative h-2 w-2 rounded-full bg-coral" />
      </span>
      Live
    </span>
  )
}
