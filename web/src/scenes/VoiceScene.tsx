// STUB — replaced by a scene agent.
import { useEffect } from 'react'
import { setCamera } from '../engine/store'
import { CAMERA } from '../engine/layout'

export default function VoiceScene() {
  useEffect(() => {
    setCamera(CAMERA.floor)
  }, [])
  return (
    <div className="absolute top-10 left-10 text-5xl font-black tracking-tight">Voice</div>
  )
}
