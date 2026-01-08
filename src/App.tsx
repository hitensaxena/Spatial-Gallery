import { useEffect, useMemo, useState } from 'react'
import { useProgress } from '@react-three/drei'

import { MainScene } from './scene/MainScene'
import { audioContextManager } from './audio/spatial'
import soundWavUrl from './assets/sound.wav?url'
import './App.css'

function App() {
  const { active, progress } = useProgress()
  const [seenThreeLoading, setSeenThreeLoading] = useState(false)

  useEffect(() => {
    if (active) setSeenThreeLoading(true)
  }, [active])

  const threeReady = seenThreeLoading ? (!active && progress >= 100) : true

  const [wavReady, setWavReady] = useState(false)
  const [audioReady, setAudioReady] = useState(audioContextManager.isStarted())

  const readyToReveal = threeReady && wavReady

  const status = useMemo(() => {
    if (!readyToReveal) return 'loading'
    if (!audioReady) return 'tap'
    return 'ready'
  }, [audioReady, readyToReveal])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(soundWavUrl)
        await res.arrayBuffer()
        if (!cancelled) setWavReady(true)
      } catch {
        if (!cancelled) setWavReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setAudioReady(audioContextManager.isStarted())
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  const handleUnlock = async () => {
    try {
      await audioContextManager.start()
    } finally {
      setAudioReady(audioContextManager.isStarted())
    }
  }

  return (
    <div className="app">
      <div className="scene" aria-hidden>
        <div className={readyToReveal ? 'scene-ready' : 'scene-hidden'}>
          <MainScene />
        </div>
      </div>
      {status !== 'ready' ? (
        <div
          className="overlay"
          role="button"
          tabIndex={0}
          onPointerDown={status === 'tap' ? handleUnlock : undefined}
          onKeyDown={status === 'tap' ? handleUnlock : undefined}
        >
          <div className="overlay-inner">
            {status === 'loading' ? (
              <>
                <div className="overlay-title">Loading</div>
                <div className="overlay-subtitle">
                  Preparing space and audio{active ? '…' : ''}
                </div>
              </>
            ) : (
              <>
                <div className="overlay-title">Tap once to enable audio</div>
                <div className="overlay-subtitle">Use earphones for spatial depth</div>
              </>
            )}
          </div>
        </div>
      ) : null}
      <div className="scroll-space" aria-hidden />
    </div>
  )
}

export default App
