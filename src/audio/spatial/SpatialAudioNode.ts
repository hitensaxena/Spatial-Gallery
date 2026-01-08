import * as THREE from 'three'
import * as Tone from 'tone'

import type { AudioBus, ProjectChannel } from './AudioBus'

export class SpatialAudioNode {
  readonly id: string
  readonly positional: THREE.PositionalAudio

  private readonly channel: ProjectChannel

  private readonly bridge: GainNode
  private readonly bridgeTone: Tone.Gain

  private connected = false
  private started = false

  constructor(id: string, listener: THREE.AudioListener, bus: AudioBus) {
    this.id = id
    this.channel = bus.getOrCreateProjectChannel(id)

    this.positional = new THREE.PositionalAudio(listener)
    this.positional.setRefDistance(7.5)
    this.positional.setRolloffFactor(1.05)
    this.positional.setDistanceModel('exponential')
    this.positional.setMaxDistance(90)

    const ctx = listener.context
    this.bridge = ctx.createGain()
    this.bridge.gain.value = 1

    this.bridgeTone = new Tone.Gain(1)
    this.bridgeTone.connect(this.bridge)

    if ((this.positional as any).setNodeSource) {
      ;(this.positional as any).setNodeSource(this.bridge)
    } else if ((this.positional as any).setNodeSource?.call) {
      ;(this.positional as any).setNodeSource(this.bridge)
    } else {
      ;(this.positional as any).setNodeSource?.(this.bridge)
    }
  }

  ensureConnected() {
    if (this.connected) return
    this.channel.gain.connect(this.bridgeTone)
    this.connected = true
  }

  ensureStarted() {
    if (this.started) return
    try {
      this.positional.setVolume(2.2)
      this.positional.play()
      this.started = true
    } catch {
      // ignore
    }
  }

  setMasterGain(value: number, rampSeconds = 1.0) {
    this.bridgeTone.gain.rampTo(Math.max(0, Math.min(1, value)), rampSeconds)
  }

  setWorldPosition(worldPos: THREE.Vector3) {
    this.positional.position.copy(worldPos)
  }

  setSpatialParams({ refDistance, rolloffFactor }: { refDistance?: number; rolloffFactor?: number }) {
    if (refDistance !== undefined) this.positional.setRefDistance(refDistance)
    if (rolloffFactor !== undefined) this.positional.setRolloffFactor(rolloffFactor)
  }
}
