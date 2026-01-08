import soundWavUrl from '../assets/sound.wav?url'

export type Project = {
  id: string
  title: string
  subtitle: string
  description: string
  audioSrc?: string
  audioLoop?: boolean
  audioBaseVolume?: number
  lighting?: {
    color: string
    intensity: number
    distance: number
  }
  audio?: {
    base: number
    filter: {
      type: 'lowpass' | 'bandpass' | 'peaking'
      freq: number
      q: number
    }
    reverb: number
    width: number
  }
  cover?: {
    seed: string
  }
  media?: {
    kind: 'audio' | 'video' | 'image'
    href: string
    label: string
  }[]
  links?: {
    href: string
    label: string
  }[]
}

export const projects: Project[] = [
  {
    id: 'echoes',
    title: 'Echoes for Unlit Rooms',
    subtitle: 'granular sketches / slow air',
    description:
      'Small pieces made from room tone, softened piano fragments, and careful repetition. Nothing resolves; it just shifts. A record you can leave on without noticing when it began.',
    cover: { seed: 'echoes' },
    lighting: { color: '#aebbd6', intensity: 0.9, distance: 11 },
    audio: {
      base: 0.22,
      filter: { type: 'lowpass', freq: 900, q: 0.7 },
      reverb: 0.18,
      width: 0.12,
    },
    audioSrc: soundWavUrl,
    audioLoop: true,
    audioBaseVolume: 0.22,
    media: [
      { kind: 'audio', href: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/20090610_0_ambience.ogg', label: 'Audio' },
      { kind: 'image', href: '/covers/echoes.svg', label: 'Cover' },
    ],
    links: [
      { href: 'https://soundcloud.com/brenticus/ambient', label: 'SoundCloud' },
    ],
  },
  {
    id: 'rift',
    title: 'Rift Study (Live)',
    subtitle: 'pressure / low motion',
    description:
      'A single-take set built from a narrow palette. Pulses arrive and disappear without a clear downbeat. The piece is mostly about weight and small timing errors becoming texture.',
    cover: { seed: 'rift' },
    lighting: { color: '#c6cfdf', intensity: 1.05, distance: 12 },
    audio: {
      base: 0.24,
      filter: { type: 'peaking', freq: 1200, q: 0.55 },
      reverb: 0.14,
      width: 0.16,
    },
    audioSrc: soundWavUrl,
    audioLoop: true,
    audioBaseVolume: 0.22,
    media: [
      { kind: 'audio', href: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Stellardrone_-_Ultra_Deep_Field.ogg', label: 'Audio' },
      { kind: 'image', href: '/covers/rift.svg', label: 'Cover' },
    ],
    links: [
      { href: 'https://freemusicarchive.org/music/Stellardrone/Light_Years_1227/08_Ultra_Deep_Field/', label: 'Listen' },
    ],
  },
  {
    id: 'murmur',
    title: 'Murmur',
    subtitle: 'score fragments / breath',
    description:
      'Short cues written for scenes that never happen. A few tones, a dull click, a pad that refuses to bloom. The intent is to support silence rather than cover it.',
    cover: { seed: 'murmur' },
    lighting: { color: '#b7c7c1', intensity: 0.95, distance: 11.5 },
    audio: {
      base: 0.23,
      filter: { type: 'bandpass', freq: 980, q: 0.8 },
      reverb: 0.22,
      width: 0.22,
    },
    audioSrc: soundWavUrl,
    audioLoop: true,
    audioBaseVolume: 0.22,
    media: [
      { kind: 'audio', href: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Brenticus_-_Ambient.ogg', label: 'Audio' },
      { kind: 'image', href: '/covers/murmur.svg', label: 'Cover' },
    ],
    links: [
      { href: 'https://soundcloud.com/brenticus', label: 'Profile' },
    ],
  },
  {
    id: 'void-drift',
    title: 'Void Drift',
    subtitle: 'longform drone / micro-shift',
    description:
      'A sustained tone with small internal motion—beating, phase, and the illusion of distance. It’s meant to feel like standing still while the air changes around you.',
    cover: { seed: 'void-drift' },
    lighting: { color: '#a7b1c2', intensity: 0.85, distance: 10.5 },
    audio: {
      base: 0.2,
      filter: { type: 'lowpass', freq: 720, q: 0.75 },
      reverb: 0.26,
      width: 0.2,
    },
    audioSrc: soundWavUrl,
    audioLoop: true,
    audioBaseVolume: 0.22,
    media: [
      { kind: 'audio', href: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Campfire_sound_ambience.ogg', label: 'Audio' },
      { kind: 'image', href: '/covers/void-drift.svg', label: 'Cover' },
    ],
    links: [
      { href: 'https://www.freesound.org/people/Glaneur%20de%20sons/sounds/29727/', label: 'Source' },
    ],
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    subtitle: 'soft pulse / fading edges',
    description:
      'A brief piece built from a small melodic cell and worn transients. The brighter moments are allowed to hang, then thin out into noise and room tone.',
    cover: { seed: 'afterglow' },
    lighting: { color: '#c2cce0', intensity: 1.0, distance: 12.5 },
    audio: {
      base: 0.24,
      filter: { type: 'peaking', freq: 1450, q: 0.5 },
      reverb: 0.16,
      width: 0.24,
    },
    audioSrc: soundWavUrl,
    audioLoop: true,
    audioBaseVolume: 0.22,
    media: [
      { kind: 'audio', href: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Nature_sounds_ambience_in_a_Dordogne_pond.ogg', label: 'Audio' },
      { kind: 'image', href: '/covers/afterglow.svg', label: 'Cover' },
    ],
    links: [
      { href: 'https://www.freesound.org/people/Glaneur%20de%20sons/sounds/34379/', label: 'Source' },
    ],
  },
]
