import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import SwarmCanvas from './swarm/SwarmCanvas'
import { initEngine, runLoopNow } from './engine/engine'
import HeroScene from './scenes/HeroScene'
import FloorScene from './scenes/FloorScene'
import VoiceScene from './scenes/VoiceScene'
import HandsScene from './scenes/HandsScene'
import MemoryScene from './scenes/MemoryScene'
import CloseScene from './scenes/CloseScene'
import { LoopPill } from './ui/FloorHud'

const SCENES = [
  { id: 'hero', label: 'Viewfy Swarm', C: HeroScene },
  { id: 'floor', label: 'The floor', C: FloorScene },
  { id: 'voice', label: 'Your voice', C: VoiceScene },
  { id: 'hands', label: 'Hands', C: HandsScene },
  { id: 'memory', label: 'Memory', C: MemoryScene },
  { id: 'close', label: 'Own it', C: CloseScene },
] as const

function sceneFromHash(): number {
  const id = window.location.hash.replace('#', '')
  const i = SCENES.findIndex((s) => s.id === id)
  return i >= 0 ? i : 0
}

export default function App() {
  const [index, setIndex] = useState(sceneFromHash)
  const scene = SCENES[index]

  useEffect(() => {
    void initEngine()
  }, [])

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(SCENES.length - 1, i))
    setIndex(next)
    history.replaceState(null, '', `#${SCENES[next].id}`)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(index - 1)
      } else if (e.key >= '1' && e.key <= String(SCENES.length)) {
        go(Number(e.key) - 1)
      } else if (e.key === 'r' || e.key === 'R') {
        runLoopNow()
      } else if (e.key === 'f' || e.key === 'F') {
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  const showPill = scene.id !== 'hero' && scene.id !== 'close' && scene.id !== 'floor'

  return (
    <div className="relative h-full w-full overflow-hidden bg-night-950 select-none">
      <SwarmCanvas />

      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <scene.C />
        </motion.div>
      </AnimatePresence>

      {showPill && (
        <div className="pointer-events-none absolute top-5 right-6 z-30">
          <LoopPill />
        </div>
      )}

      {/* scene dots */}
      <nav className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            title={`${i + 1}. ${s.label}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index ? 'w-8 bg-star' : 'w-1.5 bg-white/25 hover:bg-white/50'
            }`}
          />
        ))}
      </nav>
    </div>
  )
}
