import * as THREE from 'three'
import * as Tone from 'tone'

export class AudioContextManager {
  private listener: THREE.AudioListener | null = null
  private toneReady = false
  private started = false

  initWithListener(listener: THREE.AudioListener) {
    this.listener = listener

    if (!this.toneReady) {
      const ctx = listener.context as unknown as AudioContext
      const toneCtx = new Tone.Context({ context: ctx })
      Tone.setContext(toneCtx)
      this.toneReady = true
    }
  }

  async start() {
    if (this.started) return
    if (!this.listener) return

    const ctx = this.listener.context as unknown as AudioContext
    if (ctx.state !== 'running') {
      try {
        await ctx.resume()
      } catch {
        // ignore
      }
    }

    try {
      await Tone.start()
    } catch {
      // ignore
    }

    this.started = true
  }

  installUnlockHandlers(target: Window | HTMLElement = window) {
    const handler = () => {
      void this.start()
    }

    target.addEventListener('pointerdown', handler, { passive: true })
    target.addEventListener('keydown', handler)

    return () => {
      target.removeEventListener('pointerdown', handler)
      target.removeEventListener('keydown', handler)
    }
  }
}

export const audioContextManager = new AudioContextManager()
