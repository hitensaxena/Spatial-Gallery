import * as Tone from 'tone'

export type ProjectChannel = {
  id: string
  input: Tone.Gain
  filter: Tone.Filter
  reverb: Tone.Reverb
  width: Tone.StereoWidener
  gain: Tone.Gain
}

export type ProjectFilterType = 'lowpass' | 'bandpass' | 'peaking'

export class AudioBus {
  readonly master: Tone.Gain
  readonly ambient: Tone.Gain

  private readonly channels = new Map<string, ProjectChannel>()

  constructor() {
    this.master = new Tone.Gain(0).toDestination()
    this.ambient = new Tone.Gain(0).connect(this.master)
  }

  getOrCreateProjectChannel(id: string): ProjectChannel {
    const existing = this.channels.get(id)
    if (existing) return existing

    const input = new Tone.Gain(1)
    const filter = new Tone.Filter({ type: 'lowpass', frequency: 1800, rolloff: -24, Q: 0.5 })
    const reverb = new Tone.Reverb({
      decay: 2.4,
      preDelay: 0.01,
      wet: 0.15,
    })
    const width = new Tone.StereoWidener(0)
    const gain = new Tone.Gain(0)

    input.connect(filter)
    filter.connect(reverb)
    reverb.connect(width)
    width.connect(gain)

    const channel: ProjectChannel = { id, input, filter, reverb, width, gain }
    this.channels.set(id, channel)
    return channel
  }

  setAmbientLevel(level: number, rampSeconds = 0.8) {
    this.ambient.gain.rampTo(Math.max(0, Math.min(1, level)), rampSeconds)
  }

  setMasterLevel(level: number, rampSeconds = 0.8) {
    this.master.gain.rampTo(Math.max(0, Math.min(1, level)), rampSeconds)
  }

  setProjectLevel(id: string, level: number, rampSeconds = 0.8) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.gain.gain.rampTo(Math.max(0, Math.min(1, level)), rampSeconds)
  }

  setProjectFilterType(id: string, type: ProjectFilterType) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.filter.type = type as any
  }

  setProjectFilter(id: string, freq: number, q: number, rampSeconds = 0.8) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.filter.frequency.rampTo(Math.max(30, freq), rampSeconds)
    ch.filter.Q.rampTo(Math.max(0.05, q), rampSeconds)
  }

  setProjectReverb(id: string, wet: number, decay: number, rampSeconds = 1.2) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.reverb.wet.rampTo(Math.max(0, Math.min(0.6, wet)), rampSeconds)
    ch.reverb.decay = Math.max(0.6, Math.min(8, decay))
  }

  setProjectWidth(id: string, width: number, rampSeconds = 1.2) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.width.width.rampTo(Math.max(0, Math.min(0.6, width)), rampSeconds)
  }

  connectProjectToMaster(id: string) {
    const ch = this.getOrCreateProjectChannel(id)
    ch.gain.disconnect()
    ch.gain.connect(this.master)
  }
}
