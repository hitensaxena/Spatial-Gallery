export type AudioDriveState = {
  focusAmount: number
  nearestProjectId: string | null
  nearestProjectFactor: number
  portalGravity: number
}

export class AudioState {
  private mixAmbient = 0
  private mixMaster = 0

  update(state: AudioDriveState) {
    const focus = clamp01(state.focusAmount)
    const focusEase = smoothStep(focus)

    const project = clamp01(state.nearestProjectFactor)
    const portal = clamp01(state.portalGravity)

    const master = 0.65
    const ambient = 0.22 + (1 - focusEase) * 0.06

    const duck = clamp01(project * 0.25 + focusEase * 0.45 + portal * 0.1)

    this.mixMaster = clamp01(master)
    this.mixAmbient = clamp01(ambient * (1 - duck))

    return {
      master: this.mixMaster,
      ambient: this.mixAmbient,
      projectDuck: duck,
    }
  }
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

function smoothStep(x: number) {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
