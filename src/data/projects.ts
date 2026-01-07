export type Project = {
  id: string
  title: string
  subtitle: string
  description: string
  lighting?: {
    color: string
    intensity: number
    distance: number
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
    title: 'Echoes',
    subtitle: 'Ambient EP',
    description:
      'Slow-blooming ambient pieces built from granular piano, field recordings, and tape hiss. Designed to feel like distance: soft edges, long tails, and negative space that invites stillness.',
    cover: { seed: 'echoes' },
    lighting: { color: '#aebbd6', intensity: 0.9, distance: 11 },
    media: [
      { kind: 'audio', href: '#', label: 'Preview' },
      { kind: 'image', href: '#', label: 'Cover' },
    ],
    links: [
      { href: '#', label: 'Listen' },
      { href: '#', label: 'Bandcamp' },
      { href: '#', label: 'Credits' },
    ],
  },
  {
    id: 'rift',
    title: 'Rift',
    subtitle: 'Live Set',
    description:
      'A minimal, evolving live performance built on rhythmic pressure and low-frequency drift. The structure is simple; the motion is physical. Recorded in one take with subtle automation and restraint.',
    cover: { seed: 'rift' },
    lighting: { color: '#c6cfdf', intensity: 1.05, distance: 12 },
    media: [
      { kind: 'video', href: '#', label: 'Full Set' },
      { kind: 'audio', href: '#', label: 'Audio Only' },
    ],
    links: [
      { href: '#', label: 'Watch' },
      { href: '#', label: 'Tracklist' },
      { href: '#', label: 'Notes' },
    ],
  },
  {
    id: 'murmur',
    title: 'Murmur',
    subtitle: 'Soundtrack',
    description:
      'A small soundtrack study: understated motifs, warm pads, and sparse percussion. Built for scenes that move slowly—where attention shifts to light, texture, and breath between actions.',
    cover: { seed: 'murmur' },
    lighting: { color: '#b7c7c1', intensity: 0.95, distance: 11.5 },
    media: [
      { kind: 'image', href: '#', label: 'Stills' },
      { kind: 'audio', href: '#', label: 'Theme' },
    ],
    links: [
      { href: '#', label: 'Details' },
      { href: '#', label: 'Download' },
      { href: '#', label: 'License' },
    ],
  },
  {
    id: 'void-drift',
    title: 'Void Drift',
    subtitle: 'Drone Study',
    description:
      'A longform drone experiment focused on micro-movement. Harmonics phase slowly over time, creating a sensation of motion without rhythm—like being carried through a current.',
    cover: { seed: 'void-drift' },
    lighting: { color: '#a7b1c2', intensity: 0.85, distance: 10.5 },
    media: [
      { kind: 'audio', href: '#', label: 'Preview' },
      { kind: 'image', href: '#', label: 'Cover' },
    ],
    links: [
      { href: '#', label: 'Listen' },
      { href: '#', label: 'Session Notes' },
      { href: '#', label: 'Download' },
    ],
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    subtitle: 'Single',
    description:
      'A single built on a simple melodic fragment and gentle rhythmic ghosts. The mix is intentionally spacious—bright moments emerge, linger, then dissolve back into the room tone.',
    cover: { seed: 'afterglow' },
    lighting: { color: '#c2cce0', intensity: 1.0, distance: 12.5 },
    media: [
      { kind: 'audio', href: '#', label: 'Preview' },
      { kind: 'video', href: '#', label: 'Visual' },
    ],
    links: [
      { href: '#', label: 'Listen' },
      { href: '#', label: 'Lyrics' },
      { href: '#', label: 'Credits' },
    ],
  },
]
