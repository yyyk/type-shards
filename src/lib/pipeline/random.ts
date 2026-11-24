export type Rng = () => number

// mulberry32
export function createRng(seed: number): Rng {
  return function () {
    let t = (seed = (seed + 0x6d2b79f5) | 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function between(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min
}

// MurmurHash3
function mix(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/**
 * One key per step that uses randomness. Pass it as the first key to
 * deriveSeed, so each step gets its own values: changing one step's
 * settings never changes another's.
 */
export const RandomStream = {
  cuts: 0,
  offset: 1,
  stroke: 2,
  /** a piece's rotation, then its scale */
  transform: 3,
  /** whether a piece is left out */
  gaps: 4,
} as const

export function deriveSeed(seed: number, ...keys: number[]): number {
  let h = mix(seed)
  for (const key of keys) {
    h = mix(h ^ key)
  }
  return h
}

export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  let x1, x2, w
  do {
    x1 = rng() * 2 - 1
    x2 = rng() * 2 - 1
    w = x1 ** 2 + x2 ** 2
  } while (w >= 1 || w === 0)
  w = Math.sqrt((-2 * Math.log(w)) / w)
  return x1 * w * sd + mean
}
