import { projects } from '../data/projects'
import { projectUFromIndex } from '../scene/CameraPath'
import { interactionState } from './InteractionState'

type Listener = () => void

type ScrollControllerOptions = {
  smoothing?: number
}

export type ArrivalState = {
  projectId: string | null
  factor: number
}

export class ScrollController {
  private listeners = new Set<Listener>()

  private target = 0
  private value = 0
  private velocity = 0

  private smoothing: number

  private lastRaw = 0
  private lastInputAt = 0

  private portalU = 0.06
  private portalGravity = 0

  private warpXs: number[] = []
  private warpYs: number[] = []

  constructor(options: ScrollControllerOptions = {}) {
    this.smoothing = options.smoothing ?? 12
  }

  getProgress() {
    return this.value
  }

  getTargetProgress() {
    return this.target
  }

  setPortalU(u: number) {
    this.portalU = Math.min(1, Math.max(0, u))
  }

  getPortalGravity() {
    return this.portalGravity
  }

  setTargetProgress(p: number) {
    const clamped = Math.min(1, Math.max(0, p))
    if (clamped === this.target) return
    this.target = clamped
    this.emit()
  }

  setProgressInstant(p: number) {
    const clamped = Math.min(1, Math.max(0, p))
    this.target = clamped
    this.value = clamped
    this.velocity = 0
    this.emit()
  }

  update(dt: number) {
    const state = interactionState.getState()

    if (state.mode === 'journey') {
      const radius = 0.18
      const d = Math.abs(this.value - this.portalU)
      const t = Math.min(1, Math.max(0, 1 - d / radius))
      const s = t * t * (3 - 2 * t)
      this.portalGravity = s

      const now = performance.now()
      const since = (now - this.lastInputAt) / 1000
      const idle = Math.min(1, Math.max(0, (since - 0.12) / 0.55))

      if (idle > 0 && this.target < this.portalU) {
        const maxSpeed = 0.01
        const step = maxSpeed * this.portalGravity * idle * dt
        this.target = Math.min(this.portalU, this.target + step)
      }
    } else {
      this.portalGravity = 0
    }

    const k = this.smoothing
    const x = this.value
    const v = this.velocity
    const xTarget = this.target

    const a = (xTarget - x) * k - v * (k * 0.9)
    const nextV = v + a * dt
    const nextX = x + nextV * dt

    this.velocity = nextV
    this.value = Math.min(1, Math.max(0, nextX))
  }

  private projectUs = projects.map((_, i) => projectUFromIndex(i, projects.length))

  private buildWarpTable() {
    const samples = 512
    const radius = 0.12
    const strength = 0.78
    const gamma = 2.2

    const w: number[] = new Array(samples + 1)
    let sum = 0

    for (let i = 0; i <= samples; i++) {
      const x = i / samples

      let influence = 0
      for (let j = 0; j < this.projectUs.length; j++) {
        const du = Math.abs(x - this.projectUs[j]!)
        if (du >= radius) continue
        const t = 1 - du / radius
        const s = t * t * (3 - 2 * t)
        influence = Math.max(influence, Math.pow(s, gamma))
      }

      const weight = 1 - strength * influence
      w[i] = weight
      sum += weight
    }

    this.warpXs = new Array(samples + 1)
    this.warpYs = new Array(samples + 1)

    let acc = 0
    for (let i = 0; i <= samples; i++) {
      const x = i / samples
      acc += w[i]!
      this.warpXs[i] = x
      this.warpYs[i] = sum > 0 ? acc / sum : x
    }
  }

  private warpRawToProgress(raw: number) {
    const x = Math.min(1, Math.max(0, raw))
    if (this.warpXs.length === 0) this.buildWarpTable()

    const n = this.warpXs.length - 1
    const f = x * n
    const i = Math.max(0, Math.min(n - 1, Math.floor(f)))
    const t = f - i

    const y0 = this.warpYs[i]!
    const y1 = this.warpYs[i + 1]!
    return y0 + (y1 - y0) * t
  }

  private nearestProjectU(u: number) {
    let bestU = 0.5
    let bestD = Infinity
    for (let i = 0; i < this.projectUs.length; i++) {
      const pu = this.projectUs[i]!
      const d = Math.abs(u - pu)
      if (d < bestD) {
        bestD = d
        bestU = pu
      }
    }
    return { u: bestU, d: bestD }
  }

  getArrivalState(): ArrivalState {
    const state = interactionState.getState()
    if (state.mode === 'focus') return { projectId: null, factor: 0 }
    if (projects.length === 0) return { projectId: null, factor: 0 }

    const u = this.getProgress()

    let bestIdx = 0
    let bestD = Infinity
    for (let i = 0; i < this.projectUs.length; i++) {
      const d = Math.abs(u - this.projectUs[i]!)
      if (d < bestD) {
        bestD = d
        bestIdx = i
      }
    }

    const radius = 0.12
    const t = Math.min(1, Math.max(0, 1 - bestD / radius))
    const s = t * t * (3 - 2 * t)

    const speed = Math.abs(this.velocity)
    const speedNorm = Math.min(1, Math.max(0, speed * 2.2))
    const speedScale = 1 - speedNorm * 0.4

    return {
      projectId: projects[bestIdx]?.id ?? null,
      factor: Math.min(1, Math.max(0, s * speedScale)),
    }
  }

  attachWindowScroll() {
    const onScroll = () => {
      const state = interactionState.getState()
      if (state.mode === 'focus' && state.focusTarget > 0.5) return

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const raw = window.scrollY / maxScroll
      this.lastRaw = raw
      this.lastInputAt = performance.now()

      this.setTargetProgress(this.warpRawToProgress(raw))
    }

    {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      this.lastRaw = window.scrollY / maxScroll
      this.lastInputAt = performance.now()
      this.setTargetProgress(this.warpRawToProgress(this.lastRaw))
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }

  applyScrollMagnet() {
    const state = interactionState.getState()
    if (state.mode === 'focus') return

    const now = performance.now()
    const since = (now - this.lastInputAt) / 1000

    const idle = Math.min(1, Math.max(0, (since - 0.08) / 0.22))
    if (idle <= 0) return

    const u = this.getTargetProgress()
    const nearest = this.nearestProjectU(u)

    const magnetRadius = 0.055
    if (nearest.d >= magnetRadius) return

    const t = 1 - nearest.d / magnetRadius
    const s = t * t * (3 - 2 * t)

    const maxPull = 0.035
    const pull = maxPull * s * idle

    this.setTargetProgress(u + (nearest.u - u) * pull)
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

export const scrollController = new ScrollController({ smoothing: 9 })
