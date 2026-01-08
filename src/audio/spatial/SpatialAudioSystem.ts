import * as THREE from 'three'
import * as Tone from 'tone'

import { audioContextManager } from './AudioContextManager'
import { AudioBus } from './AudioBus'
import { AudioState } from './AudioState'
import { SpatialAudioNode } from './SpatialAudioNode'

import { projects } from '../../data/projects'

export class SpatialAudioSystem {
  private listener: THREE.AudioListener | null = null
  private bus: AudioBus | null = null
  private state = new AudioState()

  private emitters = new Map<string, SpatialAudioNode>()

  private dummyStarted = false
  private ambientNoise: Tone.Noise | null = null
  private projectNoises = new Map<string, Tone.Noise>()
  private projectOscs = new Map<string, Tone.Oscillator>()
  private projectFms = new Map<string, Tone.FMOscillator>()
  private projectLfos = new Map<string, Tone.LFO>()

  private projectPlayers = new Map<string, Tone.Player>()
  private projectPlayerGains = new Map<string, Tone.Gain>()
  private projectPlayerLoaded = new Map<string, boolean>()

  private sharedWavBuffer: Tone.ToneAudioBuffer | null = null
  private sharedWavLoaded = false
  private projectNotReadyLogged = new Set<string>()

  private spatialMaster = 0.65
  private portalSpace = 0

  init(listener: THREE.AudioListener) {
    this.listener = listener
    audioContextManager.initWithListener(listener)
    if (!this.bus) this.bus = new AudioBus()
  }

  installUnlockHandlers(target: Window | HTMLElement = window) {
    const remove = audioContextManager.installUnlockHandlers(target)
    const handler = () => {
      this.ensureDummySoundscapeStarted()
      this.ensureProjectPlayersReady()
    }

    target.addEventListener('pointerdown', handler, { passive: true })
    target.addEventListener('keydown', handler)

    return () => {
      target.removeEventListener('pointerdown', handler)
      target.removeEventListener('keydown', handler)
      remove()
    }
  }

  getOrCreateEmitter(projectId: string) {
    if (!this.listener || !this.bus) return null

    const existing = this.emitters.get(projectId)
    if (existing) return existing

    const emitter = new SpatialAudioNode(projectId, this.listener, this.bus)
    emitter.ensureConnected()
    this.emitters.set(projectId, emitter)

    this.ensureDummySoundscapeStarted()

    const ctx = Tone.getContext()?.rawContext as AudioContext | undefined
    if (ctx && ctx.state === 'running') {
      emitter.ensureStarted()
      emitter.setMasterGain(this.spatialMaster, 1.0)
    }
    return emitter
  }

  removeEmitter(projectId: string) {
    const e = this.emitters.get(projectId)
    if (!e) return
    this.emitters.delete(projectId)
  }

  updateDrive({ focusAmount, nearestProjectId, nearestProjectFactor, portalGravity }: {
    focusAmount: number
    nearestProjectId: string | null
    nearestProjectFactor: number
    portalGravity: number
  }) {
    if (!this.bus) return

    this.ensureDummySoundscapeStarted()

    const mix = this.state.update({ focusAmount, nearestProjectId, nearestProjectFactor, portalGravity })

    const pg = clamp01(portalGravity)
    this.portalSpace = pg * pg * (3 - 2 * pg)

    this.spatialMaster = mix.master

    this.bus.setMasterLevel(mix.master, 1.2)
    this.bus.setAmbientLevel(mix.ambient, 1.2)

    if (nearestProjectId) {
      this.applyProjectDrive(nearestProjectId, {
        base: 0.22,
        filterType: 'lowpass',
        filterFreq: 900,
        filterQ: 0.7,
        reverbWet: 0.18,
        reverbDecay: 2.4,
        width: 0.14,
      }, {
        proximity: nearestProjectFactor,
        focus: focusAmount,
      })
    }
  }

  applyProjectDrive(
    projectId: string,
    profile: {
      base: number
      filterType: 'lowpass' | 'bandpass' | 'peaking'
      filterFreq: number
      filterQ: number
      reverbWet: number
      reverbDecay: number
      width: number
    },
    drive: { proximity: number; focus: number },
  ) {
    if (!this.bus) return

    const prox = clamp01(drive.proximity)
    const focus = clamp01(drive.focus)
    const clarity = smoothStep(prox)
    const focusEase = smoothStep(focus)

    const active = prox > 0.01 || focus > 0.02

    const pg = this.projectPlayerGains.get(projectId)
    if (pg) {
      const p = projects.find((x) => x.id === projectId)
      const base = Math.max(0.0001, Math.min(0.6, p?.audioBaseVolume ?? 0.12))
      const mult = 0.28 + 1.45 * clarity + 0.55 * focusEase

      const audible = active ? clamp01(mult) : 0
      const target = Math.min(0.9, audible * base * 1.35)

      if (active && target > 0.001) {
        this.ensureProjectPlayerStarted(projectId)
      }

      pg.gain.rampTo(target, active ? 1.1 : 2.2)
    }

    const level = clamp01(profile.base * (0.16 + 0.92 * clarity + 0.55 * focusEase))
    const type = profile.filterType

    const unmask = 2400 * clarity + 2200 * focusEase
    const freq = profile.filterFreq + unmask
    const q = profile.filterQ + (1 - clarity) * 0.12

    const openness = clamp01(profile.reverbWet * (1.12 - clarity * 0.52 - focusEase * 0.25) * (1 + this.portalSpace * 0.22))
    const decay = profile.reverbDecay * (1.1 - clarity * 0.25)

    const width = clamp01(profile.width * (1.08 - clarity * 0.52 - focusEase * 0.12) * (1 + this.portalSpace * 0.28))

    this.bus.setProjectFilterType(projectId, type)
    this.bus.setProjectFilter(projectId, freq, q, 1.4)
    this.bus.setProjectReverb(projectId, openness, decay, 1.8)
    this.bus.setProjectWidth(projectId, width, 1.8)
    this.bus.setProjectLevel(projectId, level, 1.6)
  }

  private ensureProjectPlayersReady() {
    if (!this.bus) return

    const ctx = Tone.getContext()?.rawContext as AudioContext | undefined
    if (!ctx || ctx.state !== 'running') return

    if (!this.sharedWavBuffer) {
      const first = projects.find((p) => !!p.audioSrc)
      if (first?.audioSrc) {
        this.sharedWavLoaded = false
        this.sharedWavBuffer = new Tone.ToneAudioBuffer(first.audioSrc, () => {
          this.sharedWavLoaded = true
          console.log('[audio] shared wav loaded')
          for (const p of projects) {
            if (!p.audioSrc) continue
            this.projectPlayerLoaded.set(p.id, true)
            const pl = this.projectPlayers.get(p.id)
            if (pl) pl.buffer = this.sharedWavBuffer!
          }
        })
      }
    }

    for (const p of projects) {
      if (!p.audioSrc) continue
      if (this.projectPlayers.has(p.id)) continue

      this.projectPlayerLoaded.set(p.id, false)

      const ch = this.bus.getOrCreateProjectChannel(p.id)

      const gain = new Tone.Gain(0)
      const player = new Tone.Player({
        loop: p.audioLoop ?? true,
        autostart: false,
        fadeIn: 2.0,
        fadeOut: 2.0,
      })

      if (this.sharedWavBuffer) {
        player.buffer = this.sharedWavBuffer
        if (this.sharedWavLoaded) this.projectPlayerLoaded.set(p.id, true)
      }

      player.connect(gain)
      gain.connect(ch.input)

      this.projectPlayers.set(p.id, player)
      this.projectPlayerGains.set(p.id, gain)

      const dn = this.projectNoises.get(p.id)
      if (dn) {
        try {
          dn.stop()
        } catch {
          // ignore
        }
        dn.dispose()
        this.projectNoises.delete(p.id)
      }

      const dox = this.projectOscs.get(p.id)
      if (dox) {
        try {
          dox.stop()
        } catch {
          // ignore
        }
        dox.dispose()
        this.projectOscs.delete(p.id)
      }

      const dfm = this.projectFms.get(p.id)
      if (dfm) {
        try {
          dfm.stop()
        } catch {
          // ignore
        }
        dfm.dispose()
        this.projectFms.delete(p.id)
      }

      const dlfo = this.projectLfos.get(p.id)
      if (dlfo) {
        try {
          dlfo.stop()
        } catch {
          // ignore
        }
        dlfo.dispose()
        this.projectLfos.delete(p.id)
      }
    }
  }

  private ensureProjectPlayerStarted(projectId: string) {
    const player = this.projectPlayers.get(projectId)
    const gain = this.projectPlayerGains.get(projectId)
    if (!player || !gain) return

    if (this.sharedWavBuffer && player.buffer !== this.sharedWavBuffer) {
      player.buffer = this.sharedWavBuffer
    }

    const sharedLoaded = this.sharedWavLoaded || !!(this.sharedWavBuffer && (this.sharedWavBuffer as any).loaded)
    const loaded = sharedLoaded || this.projectPlayerLoaded.get(projectId)
    if (!loaded) {
      if (!this.projectNotReadyLogged.has(projectId)) {
        console.log('[audio] project wav not ready yet', projectId)
        this.projectNotReadyLogged.add(projectId)
      }
      return
    }

    if (player.state !== 'started') {
      gain.gain.setValueAtTime(0, Tone.now())
      try {
        player.start()
        console.log('[audio] project wav start', projectId)
      } catch {
        // ignore
      }
    }
  }

  private ensureDummySoundscapeStarted() {
    if (this.dummyStarted) return
    if (!this.bus) return

    const ctx = Tone.getContext()?.rawContext as AudioContext | undefined
    if (!ctx || ctx.state !== 'running') return

    this.dummyStarted = true

    this.ambientNoise = new Tone.Noise('pink')
    const ambGain = new Tone.Gain(0.085)
    const ambFilter = new Tone.Filter({ type: 'lowpass', frequency: 760, rolloff: -24, Q: 0.75 })
    this.ambientNoise.connect(ambFilter)
    ambFilter.connect(ambGain)
    ambGain.connect(this.bus.ambient)
    this.ambientNoise.start()

    for (const p of projects) {
      if (p.audioSrc) continue
      const ch = this.bus.getOrCreateProjectChannel(p.id)

      const h = hash01(p.id)
      const baseFreq = 85 + h * 210

      const n = new Tone.Noise('brown')
      const nFilter = new Tone.Filter({ type: 'bandpass', frequency: 520 + h * 420, rolloff: -24, Q: 0.7 + h * 0.25 })
      const nGain = new Tone.Gain(0.06)
      n.connect(nFilter)
      nFilter.connect(nGain)
      nGain.connect(ch.input)
      n.start()

      const osc = new Tone.Oscillator({ type: 'triangle', frequency: baseFreq * (1.0 + h * 0.08) })
      const oGain = new Tone.Gain(0.035)
      osc.connect(oGain)
      oGain.connect(ch.input)
      osc.start()

      const fm = new Tone.FMOscillator({
        type: 'sine',
        harmonicity: 1.5 + h * 0.6,
        modulationIndex: 2 + h * 4,
        frequency: baseFreq * (0.5 + h * 0.35),
      })
      const fmGain = new Tone.Gain(0.028)
      fm.connect(fmGain)
      fmGain.connect(ch.input)
      fm.start()

      const lfo = new Tone.LFO({
        frequency: 0.03 + h * 0.06,
        min: 420 + h * 260,
        max: 980 + h * 520,
      })
      lfo.connect(nFilter.frequency)
      lfo.start()

      this.projectNoises.set(p.id, n)
      this.projectOscs.set(p.id, osc)
      this.projectFms.set(p.id, fm)
      this.projectLfos.set(p.id, lfo)
    }

    for (const e of this.emitters.values()) {
      e.ensureStarted()
      e.setMasterGain(this.spatialMaster, 1.2)
    }
  }
}

function hash01(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

function smoothStep(x: number) {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

export const spatialAudioSystem = new SpatialAudioSystem()
