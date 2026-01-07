export class AudioManager {
  private ctx: AudioContext | null = null

  private globalMix = 1
  private projectMix = 0

  ensureContext() {
    if (this.ctx) return this.ctx
    this.ctx = new AudioContext()
    return this.ctx
  }

  suspend() {
    if (!this.ctx) return
    void this.ctx.suspend()
  }

  resume() {
    if (!this.ctx) return
    void this.ctx.resume()
  }

  setGlobalMix(value: number) {
    this.globalMix = Math.min(1, Math.max(0, value))
  }

  setProjectMix(value: number) {
    this.projectMix = Math.min(1, Math.max(0, value))
  }

  getMix() {
    return { globalMix: this.globalMix, projectMix: this.projectMix }
  }
}

export const audioManager = new AudioManager()
