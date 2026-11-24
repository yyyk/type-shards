import { describe, expect, it } from "vitest"
import {
  createRng,
  between,
  deriveSeed,
  gaussian,
  RandomStream,
} from "./random"

describe("createRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b())
    }
  })

  it("returns different values on consecutive calls", () => {
    const a = createRng(42)
    let prev = a()
    for (let i = 0; i < 10; i++) {
      const next = a()
      expect(next).not.toBe(prev)
      prev = next
    }
  })

  it("gives unrelated first values for nearby seeds", () => {
    const firsts: number[] = []
    for (let seed = 0; seed < 100; seed++) {
      firsts.push(createRng(seed)())
    }

    let gap = 0
    for (let i = 1; i < firsts.length; i++) {
      gap += Math.abs(firsts[i] - firsts[i - 1])
    }
    gap /= firsts.length - 1

    expect(gap).toBeGreaterThan(0.2)
  })

  it("stays in [0, 1)", () => {
    const a = createRng(42)
    for (let i = 0; i < 1000; i++) {
      const v = a()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe("between", () => {
  it("stays in [min, max)", () => {
    const a = createRng(42)
    for (let i = 0; i < 1000; i++) {
      const v = between(a, 5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })
})

describe("deriveSeed", () => {
  it("is repeatable", () => {
    const a = deriveSeed(42, 0, 10)
    const b = deriveSeed(42, 0, 10)
    expect(a).toBe(b)
  })

  it("depends on key order", () => {
    const a = deriveSeed(42, 0, 10)
    const b = deriveSeed(42, 10, 0)
    expect(a).not.toBe(b)
  })
})

describe("gaussian", () => {
  it("has the requested mean and standard deviation", () => {
    const rng = createRng(42)
    const values: number[] = []
    const n = 10_000
    let sum = 0
    for (let i = 0; i < n; i++) {
      const v = gaussian(rng, 3, 2)
      sum += v
      values.push(v)
    }
    const mean = sum / n
    expect(mean).toBeCloseTo(3, 1)

    sum = 0
    for (let i = 0; i < n; i++) {
      sum += Math.pow(values[i] - mean, 2)
    }
    const sd = Math.sqrt(sum / n)
    expect(sd).toBeCloseTo(2, 1)
  })
})

// The app's seed field (and Shuffle) covers 0..9999. Every seed there should
// give its own design, unrelated to the seeds next to it.
describe("seeds 0..9999, as the app uses them", () => {
  const SEEDS = 10_000
  // the first value a piece's stroke draws, as strokePieces does
  const firstDraw = (seed: number, piece: number) =>
    createRng(deriveSeed(seed, RandomStream.stroke, 0, 0, piece))()

  it("gives each seed its own values", () => {
    const values = new Set<number>()
    for (let s = 0; s < SEEDS; s++) values.add(firstDraw(s, 0))
    expect(values.size).toBe(SEEDS)
  })

  it("spreads them evenly", () => {
    const bins = Array.from({ length: 10 }, () => 0)
    for (let s = 0; s < SEEDS; s++) bins[Math.floor(firstDraw(s, 0) * 10)]++
    // 1000 per bin expected; 4 standard deviations is ±120
    for (const count of bins) expect(Math.abs(count - 1000)).toBeLessThan(120)
  })

  it("doesn't relate neighbouring seeds", () => {
    const a: number[] = []
    const b: number[] = []
    for (let s = 0; s < SEEDS - 1; s++) {
      a.push(firstDraw(s, 0))
      b.push(firstDraw(s + 1, 0))
    }
    const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length
    const ma = mean(a)
    const mb = mean(b)
    let cov = 0
    let va = 0
    let vb = 0
    for (let i = 0; i < a.length; i++) {
      cov += (a[i] - ma) * (b[i] - mb)
      va += (a[i] - ma) ** 2
      vb += (b[i] - mb) ** 2
    }
    // uncorrelated: |r| around 1/√n = 0.01; 0.04 is 4 standard deviations
    expect(Math.abs(cov / Math.sqrt(va * vb))).toBeLessThan(0.04)
  })

  it("doesn't relate a seed's pieces to each other either", () => {
    const values = new Set<number>()
    for (let p = 0; p < 1000; p++) values.add(firstDraw(42, p))
    expect(values.size).toBe(1000)
  })
})
