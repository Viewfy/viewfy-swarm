// Drives the faux browser: mirrors the engine's computer-use state while it's active (ACT phase),
// otherwise runs a local loop over the drafts so the scene is always alive.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSwarm } from '../../engine/store'
import type { SquadId } from '../../engine/types'
import { communityPost, targetInfo, useTypewriter, type VoiceData } from '../voice/shared'

export type FieldKey = 'subject' | 'body' | 'send' | 'rest'

export interface Job {
  id: string
  app: 'x' | 'gmail'
  to: string // "@jes***" or "maya@techcrunch.com"
  toName?: string // "Maya Chen"
  toSub?: string // "TechCrunch · AI"
  subject?: string
  context?: string // the X post being replied to
  contextLikes?: number
  text: string
  voiceMatch?: number
}

export interface LogItem {
  id: string
  at: number
  squad: SquadId | 'brain'
  text: string
  tone: 'info' | 'act' | 'success' | 'learn' | 'warn'
}

export interface OperatorView {
  job: Job
  source: 'engine' | 'local'
  subjectN: number
  bodyN: number
  focus: 'subject' | 'body' | null
  aim: FieldKey
  clickSeq: number
  sent: boolean
  log: LogItem[]
}

function buildJobs(d: VoiceData): Job[] {
  const x: Job[] = d.drafts.drafts
    .filter((r) => r.channel === 'x_reply')
    .map((r) => {
      const post = communityPost(d.targets, r.targetId)
      return {
        id: `x-${r.targetId}`,
        app: 'x' as const,
        to: post?.handle ?? '@founder***',
        context: post?.text ?? 'how did you get your first 100 users?',
        contextLikes: post?.likes,
        text: r.text,
        voiceMatch: r.voiceMatch,
      }
    })
  const g: Job[] = d.drafts.drafts
    .filter((r) => r.channel === 'gmail')
    .map((r) => {
      const t = targetInfo(d.targets, r.targetId)
      return {
        id: `g-${r.targetId}`,
        app: 'gmail' as const,
        to: t.email ?? 'editor@example.com',
        toName: t.label,
        toSub: t.sub,
        subject: r.subject ?? 'quick one',
        text: r.text,
        voiceMatch: r.voiceMatch,
      }
    })
  const out: Job[] = []
  for (let i = 0; i < Math.max(x.length, g.length); i++) {
    if (x[i]) out.push(x[i])
    if (g[i]) out.push(g[i])
  }
  return out
}

const X_CPS = 34
const SUBJ_CPS = 30
const MAIL_CPS = 58

export function useOperator(data: VoiceData): OperatorView {
  const computer = useSwarm((s) => s.computer)
  const feed = useSwarm((s) => s.feed)
  const jobs = useMemo(() => buildJobs(data), [data])
  const engineOn = computer.active && !!computer.text

  // ---------------- local loop ----------------
  const [jobIdx, setJobIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const [clickSeq, setClickSeq] = useState(0)
  const [localLog, setLocalLog] = useState<LogItem[]>([])
  const localJob = jobs[jobIdx % Math.max(1, jobs.length)]
  const fields: ('subject' | 'body')[] = localJob?.app === 'gmail' ? ['subject', 'body'] : ['body']
  const sendPhase = fields.length * 2
  const runKey = `${localJob?.id}-${jobIdx}`

  // after the engine finishes an ACT, linger on its final frame ("Sent ✓") before resuming locally
  const [linger, setLinger] = useState(false)
  const paused = engineOn || linger
  const subjActive = !paused && localJob?.app === 'gmail' && phase >= 1
  const bodyActive = !paused && phase >= (localJob?.app === 'gmail' ? 3 : 1)
  const subjN = useTypewriter(localJob?.subject ?? '', { cps: SUBJ_CPS, active: subjActive, runKey })
  const bodyN = useTypewriter(localJob?.text ?? '', { cps: localJob?.app === 'gmail' ? MAIL_CPS : X_CPS, active: bodyActive, runKey })

  const logged = useRef(new Set<string>())
  const push = (text: string, tone: LogItem['tone'], squad: LogItem['squad'] = 'operator') => {
    const k = `${runKey}-${phase}`
    if (logged.current.has(k)) return
    logged.current.add(k)
    setLocalLog((l) => [{ id: `${Date.now()}-${Math.random()}`, at: Date.now(), squad, text, tone }, ...l].slice(0, 8))
  }

  // reset the local loop whenever the engine hands control back
  const wasEngine = useRef(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (wasEngine.current && !engineOn) {
      setLinger(true)
      t = setTimeout(() => {
        setLinger(false)
        setJobIdx((i) => i + 1)
        setPhase(0)
      }, 2600)
    }
    if (engineOn) setLinger(false)
    wasEngine.current = engineOn
    return () => {
      if (t) clearTimeout(t)
    }
  }, [engineOn])

  // phase machine
  useEffect(() => {
    if (paused || !localJob) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
    const isAim = phase < sendPhase && phase % 2 === 0
    const isType = phase < sendPhase && phase % 2 === 1
    if (phase === 0) {
      push(
        localJob.app === 'x' ? `Opened thread by ${localJob.to} on x.com` : `Opened Gmail compose → ${localJob.toName ?? localJob.to}`,
        'info',
      )
    }
    if (isAim) {
      at(phase === 0 ? 1100 : 700, () => {
        setClickSeq((c) => c + 1)
        setPhase((p) => p + 1)
      })
    } else if (isType) {
      const f = fields[(phase - 1) / 2]
      const done = f === 'subject' ? subjN >= (localJob.subject ?? '').length : bodyN >= localJob.text.length
      if (done) at(f === 'subject' ? 300 : 450, () => setPhase((p) => p + 1))
    } else if (phase === sendPhase) {
      at(850, () => {
        setClickSeq((c) => c + 1)
        setPhase((p) => p + 1)
      })
    } else if (phase === sendPhase + 1) {
      push(
        localJob.app === 'x'
          ? `Posted reply to ${localJob.to} · founder voice`
          : `Sent pitch to ${localJob.toName ?? localJob.to}${localJob.toSub ? ` (${localJob.toSub.split(' · ')[0]})` : ''}`,
        'success',
        localJob.app === 'x' ? 'community' : 'press',
      )
      at(3400, () => {
        setJobIdx((i) => i + 1)
        setPhase(0)
      })
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, localJob, subjN >= (localJob?.subject ?? '').length, bodyN >= (localJob?.text.length ?? 0)])

  // ---------------- engine mirror ----------------
  const engineJob = useMemo<Job>(() => {
    if (computer.app === 'gmail') {
      const j = data.targets.journalists.find((x) => computer.to.toLowerCase().startsWith(x.name.split(' ')[0].toLowerCase()))
      return {
        id: `e-${computer.to}-${computer.text.length}`,
        app: 'gmail',
        to: computer.to,
        toName: j?.name,
        toSub: j ? `${j.outlet} · ${j.beat}` : undefined,
        subject: computer.subject,
        text: computer.text,
      }
    }
    return { id: `e-${computer.to}-${computer.text.length}`, app: 'x', to: computer.to, context: computer.context, text: computer.text }
  }, [computer.app, computer.to, computer.subject, computer.context, computer.text, data.targets.journalists])

  const engSent = computer.status === 'sent'
  const engDone = computer.typed >= computer.text.length
  const engAim: FieldKey = engSent || engDone ? 'send' : 'body'
  const [engClicks, setEngClicks] = useState(0)
  const prevEng = useRef<{ aim: FieldKey; sent: boolean; on: boolean }>({ aim: 'rest', sent: false, on: false })
  useEffect(() => {
    const p = prevEng.current
    if (engineOn && (!p.on || p.aim !== engAim || (engSent && !p.sent))) setEngClicks((c) => c + 1)
    prevEng.current = { aim: engAim, sent: engSent, on: engineOn }
  }, [engineOn, engAim, engSent])

  // ---------------- log ----------------
  const log = useMemo(() => {
    const fromFeed: LogItem[] = feed
      .filter((f) => f.squad === 'operator' || f.squad === 'press' || f.squad === 'community')
      .slice(0, 6)
      .map((f) => ({ id: f.id, at: f.at, squad: f.squad, text: f.text, tone: f.tone }))
    return [...fromFeed, ...localLog].sort((a, b) => b.at - a.at).slice(0, 6)
  }, [feed, localLog])

  if (engineOn || (linger && computer.text)) {
    return {
      job: engineJob,
      source: 'engine',
      subjectN: engineJob.subject?.length ?? 0,
      bodyN: Math.min(computer.typed, computer.text.length),
      focus: engSent ? null : 'body',
      aim: engAim,
      clickSeq: engClicks + clickSeq,
      sent: engSent,
      log,
    }
  }

  const focusField = phase < sendPhase && phase % 2 === 1 ? fields[(phase - 1) / 2] : null
  const aimField: FieldKey = phase < sendPhase ? fields[Math.floor(phase / 2)] : 'send'
  return {
    job: localJob ?? { id: 'none', app: 'x', to: '@founder***', text: '' },
    source: 'local',
    subjectN: localJob?.app === 'gmail' ? (phase >= 2 ? (localJob.subject ?? '').length : subjN) : 0,
    bodyN,
    focus: focusField,
    aim: aimField,
    clickSeq: clickSeq + engClicks,
    sent: phase > sendPhase,
    log,
  }
}
