export class AudioManager {
  private ctx: AudioContext | null = null

  private globalMix = 1
  private projectMix = 0
  private ambientMix = 1

  private projectLevels = new Map<string, number>()

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

  setAmbientMix(value: number) {
    this.ambientMix = Math.min(1, Math.max(0, value))
  }

  setProjectLevel(projectId: string, value: number) {
    this.projectLevels.set(projectId, Math.min(1, Math.max(0, value)))
  }

  getProjectLevel(projectId: string) {
    return this.projectLevels.get(projectId) ?? 0
  }

  getMaxProjectLevel() {
    let best = 0
    for (const v of this.projectLevels.values()) best = Math.max(best, v)
    return best
  }

  getMix() {
    return {
      globalMix: this.globalMix,
      ambientMix: this.ambientMix,
      projectMix: this.projectMix,
    }
  }
}

export const audioManager = new AudioManager()
