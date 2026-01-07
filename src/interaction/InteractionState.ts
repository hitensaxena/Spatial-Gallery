type Listener = () => void

export type JourneyMode = 'journey' | 'focus'

export type FocusState = {
  mode: JourneyMode
  focusedProjectId: string | null
  journeyProgress: number
  focusAmount: number
  focusTarget: number
}

export class InteractionState {
  private listeners = new Set<Listener>()

  private state: FocusState = {
    mode: 'journey',
    focusedProjectId: null,
    journeyProgress: 0,
    focusAmount: 0,
    focusTarget: 0,
  }

  getState() {
    return this.state
  }

  setJourneyProgress(progress: number) {
    if (this.state.mode !== 'journey') return
    const clamped = Math.min(1, Math.max(0, progress))
    if (clamped === this.state.journeyProgress) return
    this.state = { ...this.state, journeyProgress: clamped }
    this.emit()
  }

  update(dt: number) {
    const k = 4.2
    const current = this.state.focusAmount
    const target = this.state.focusTarget
    let next = current + (target - current) * (1 - Math.exp(-k * dt))

    if (Math.abs(target - next) < 1e-4) next = target

    let changed = Math.abs(next - current) > 0

    if (changed) {
      this.state = { ...this.state, focusAmount: next }
    }

    if (this.state.mode === 'focus' && this.state.focusTarget === 0 && this.state.focusAmount <= 0.001) {
      this.state = { ...this.state, mode: 'journey', focusedProjectId: null, focusAmount: 0, focusTarget: 0 }
      changed = true
    }

    if (changed) this.emit()
  }

  focusProject(projectId: string, journeyProgress: number) {
    this.state = {
      mode: 'focus',
      focusedProjectId: projectId,
      journeyProgress: Math.min(1, Math.max(0, journeyProgress)),
      focusAmount: this.state.focusAmount,
      focusTarget: 1,
    }
    this.emit()
  }

  exitFocus() {
    if (this.state.mode !== 'focus') return
    this.state = {
      ...this.state,
      focusTarget: 0,
    }
    this.emit()
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const l of this.listeners) l()
  }
}

export const interactionState = new InteractionState()
