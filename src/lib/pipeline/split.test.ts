import { describe, expect, it } from "vitest"
import { measure, type PathCommand } from "vector-path-tools"
import type { GlyphOutline } from "./glyphs"
import { createRng } from "./random"
import { cutPositions, MAX_CUTS, splitGlyph, type SplitOptions } from "./split"

const options = (overrides: Partial<SplitOptions>): SplitOptions => ({
  spacing: 25,
  fit: true,
  phase: 0,
  jitter: 0,
  ...overrides,
})

describe("cutPositions", () => {
  it("divides the contour evenly with fit", () => {
    expect(cutPositions(100, options({}), createRng(1))).toEqual([
      0, 25, 50, 75,
    ])
  })

  it("shifts every cut by the phase", () => {
    expect(cutPositions(100, options({ phase: 0.5 }), createRng(1))).toEqual([
      12.5, 37.5, 62.5, 87.5,
    ])
  })

  describe("offset", () => {
    /** Cut positions rounded to 1e-9, so sums like 5 + 0.2 × 25 compare exactly. */
    const cuts = (length: number, overrides: Partial<SplitOptions>) =>
      cutPositions(length, options(overrides), createRng(1)).map(
        (d) => Math.round(d * 1e9) / 1e9,
      )

    it("moves the first cut, and every other cut with it, by a distance", () => {
      expect(cuts(100, { offset: 12.5 })).toEqual([12.5, 37.5, 62.5, 87.5])
    })

    it("is the same as a phase of offset / step", () => {
      // step 25: an offset of 12.5 is half a step
      expect(cuts(100, { offset: 12.5 })).toEqual(cuts(100, { phase: 0.5 }))
    })

    it("moves the cuts backwards when negative, wrapping past the start", () => {
      // -5, 20, 45, 70, with -5 wrapping round to 95
      expect(cuts(100, { offset: -5 })).toEqual([20, 45, 70, 95])
    })

    it("repeats every step with fit, so an offset past a step wraps round", () => {
      expect(cuts(100, { offset: 30 })).toEqual(cuts(100, { offset: 5 }))
    })

    it("moves the leftover piece round the contour without fit", () => {
      // cuts at 10, 40, 70 and 100 (= 0): the 10 px leftover is now from 0 to 10
      expect(cuts(100, { spacing: 30, fit: false, offset: 10 })).toEqual([
        0, 10, 40, 70,
      ])
    })

    it("adds up with the phase", () => {
      // an offset of 5 plus a phase of 0.2 × step 25 = 10
      expect(cuts(100, { offset: 5, phase: 0.2 })).toEqual(
        cuts(100, { offset: 10 }),
      )
    })

    it("moves every contour by the same distance, whatever its step", () => {
      // with fit, the step differs: 100 / 4 = 25 and 90 / 4 = 22.5
      const firstCut = (length: number) => cuts(length, { offset: 3 })[0]
      expect(firstCut(100)).toBe(3)
      expect(firstCut(90)).toBe(3)
    })
  })

  it("keeps the exact spacing without fit, leaving the rest to one shorter piece", () => {
    // pieces of 30, 30, 30 and the 10 left over
    expect(
      cutPositions(100, options({ spacing: 30, fit: false }), createRng(1)),
    ).toEqual([0, 30, 60, 90])
  })

  it("cuts a contour just under two spacings long without fit", () => {
    // like the hole of an "A": 189.4 at spacing 100 gives pieces of 100 and 89.4
    expect(
      cutPositions(189.4, options({ spacing: 100, fit: false }), createRng(1)),
    ).toEqual([0, 100])
  })

  it("adds no extra cut when the spacing divides the contour exactly", () => {
    // 100 / 25 is exactly 4: four pieces of 25, no zero-length fifth one
    expect(
      cutPositions(100, options({ spacing: 25, fit: false }), createRng(1)),
    ).toEqual([0, 25, 50, 75])
    // and the same where rounding makes the division come out a hair above
    const length = 0.1 * 3 * 100 // 30.000000000000004
    expect(
      cutPositions(length, options({ spacing: 10, fit: false }), createRng(1)),
    ).toHaveLength(3)
  })

  it("keeps a cut a hair below 0 inside [0, length)", () => {
    // an offset of -1e-17 wraps to just under 100, which rounds to exactly 100
    const cuts = cutPositions(100, options({ offset: -1e-17 }), createRng(1))
    for (const d of cuts) {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThan(100)
    }
  })

  it("keeps a contour no longer than the spacing whole without fit", () => {
    expect(
      cutPositions(100, options({ spacing: 100, fit: false }), createRng(1)),
    ).toEqual([])
    expect(
      cutPositions(80, options({ spacing: 100, fit: false }), createRng(1)),
    ).toEqual([])
  })

  it("makes no cuts when the spacing is longer than the contour", () => {
    expect(cutPositions(100, options({ spacing: 150 }), createRng(1))).toEqual(
      [],
    )
  })

  it("makes no cuts on a contour of length 0", () => {
    expect(cutPositions(0, options({}), createRng(1))).toEqual([])
  })

  it.each([0, -5, NaN])("rejects a spacing of %s", (spacing) => {
    expect(() => cutPositions(100, options({ spacing }), createRng(1))).toThrow(
      RangeError,
    )
  })

  it("rejects more than MAX_CUTS cuts", () => {
    const spacing = 100 / (MAX_CUTS + 10)
    expect(() => cutPositions(100, options({ spacing }), createRng(1))).toThrow(
      RangeError,
    )
  })

  describe("with jitter", () => {
    // jitter of half a step (25 / 2): the most it can be
    const jittered = (seed: number) =>
      cutPositions(100, options({ phase: 0.3, jitter: 12.5 }), createRng(seed))

    it("gives the same cuts for the same seed", () => {
      expect(jittered(7)).toEqual(jittered(7))
    })

    it("moves the cuts away from the even positions", () => {
      expect(jittered(7)).not.toEqual([7.5, 32.5, 57.5, 82.5])
    })

    it("keeps every cut in [0, length), sorted", () => {
      for (let seed = 0; seed < 200; seed++) {
        const cuts = jittered(seed)
        expect(cuts).toHaveLength(4)
        for (const [i, d] of cuts.entries()) {
          expect(d).toBeGreaterThanOrEqual(0)
          expect(d).toBeLessThan(100)
          if (i > 0) expect(d).toBeGreaterThanOrEqual(cuts[i - 1])
        }
      }
    })

    it("moves each cut by at most jitter px", () => {
      // spacing 25, phase 0: the even cuts are at 0, 25, 50, 75
      for (let seed = 0; seed < 200; seed++) {
        const cuts = cutPositions(100, options({ jitter: 3 }), createRng(seed))
        for (const d of cuts) {
          const even = Math.round(d / 25) * 25
          expect(Math.abs(d - even)).toBeLessThanOrEqual(3 + 1e-9)
        }
      }
    })

    it("limits jitter to half a step, so cuts can't cross", () => {
      // on a step of 25, any jitter above 12.5 is capped at 12.5
      for (let seed = 0; seed < 50; seed++) {
        expect(
          cutPositions(100, options({ jitter: 1000 }), createRng(seed)),
        ).toEqual(cutPositions(100, options({ jitter: 12.5 }), createRng(seed)))
      }
    })

    it("is the same amount on contours with different steps", () => {
      // jitter 2 on steps of 25 and of 50: both stay within ±2 of their places
      for (const length of [100, 200]) {
        const step = length / 4
        const o = options({ spacing: step, jitter: 2 })
        for (let seed = 0; seed < 100; seed++) {
          for (const d of cutPositions(length, o, createRng(seed))) {
            const even = Math.round(d / step) * step
            expect(Math.abs(d - even)).toBeLessThanOrEqual(2 + 1e-9)
          }
        }
      }
    })
  })
})

/** A square contour, clockwise on screen, with its top-left corner at (x, y). */
const square = (x: number, y: number, size: number): PathCommand[] => [
  { type: "moveTo", x, y },
  { type: "lineTo", x: x + size, y },
  { type: "lineTo", x: x + size, y: y + size },
  { type: "lineTo", x, y: y + size },
  { type: "close" },
]

const glyph = (index: number, commands: PathCommand[]): GlyphOutline => ({
  index,
  cluster: index,
  commands,
})

const isClosed = (commands: PathCommand[]) => commands.at(-1)?.type === "close"

describe("splitGlyph", () => {
  it("cuts a contour into even, open pieces", () => {
    // perimeter 400, spacing 100
    const pieces = splitGlyph(
      glyph(0, square(0, 0, 100)),
      options({ spacing: 100 }),
      1,
    )
    expect(pieces).toHaveLength(4)
    for (const piece of pieces) {
      expect(measure(piece.commands).length).toBeCloseTo(100)
      expect(isClosed(piece.commands)).toBe(false)
    }
  })

  it("cuts every contour of the glyph", () => {
    // outer perimeter 400 → 4 pieces; inner perimeter 200 → 2 pieces
    const commands = [...square(0, 0, 100), ...square(25, 25, 50)]
    const pieces = splitGlyph(glyph(0, commands), options({ spacing: 100 }), 1)
    expect(pieces.map((p) => p.contour)).toEqual([0, 0, 0, 0, 1, 1])
  })

  it("keeps a contour whole and closed when there are no cuts", () => {
    const pieces = splitGlyph(
      glyph(0, square(0, 0, 100)),
      options({ spacing: 1000 }),
      1,
    )
    expect(pieces).toHaveLength(1)
    expect(isClosed(pieces[0].commands)).toBe(true)
    expect(measure(pieces[0].commands).length).toBeCloseTo(400)
  })

  it("labels each piece with its glyph, contour and position", () => {
    const pieces = splitGlyph(
      glyph(5, square(0, 0, 100)),
      options({ spacing: 100 }),
      1,
    )
    expect(
      pieces.map(({ glyph, contour, index }) => ({ glyph, contour, index })),
    ).toEqual([
      { glyph: 5, contour: 0, index: 0 },
      { glyph: 5, contour: 0, index: 1 },
      { glyph: 5, contour: 0, index: 2 },
      { glyph: 5, contour: 0, index: 3 },
    ])
  })

  describe("with jitter", () => {
    const jittered = (glyphIndex: number, seed: number) =>
      splitGlyph(
        glyph(glyphIndex, square(0, 0, 100)),
        options({ spacing: 100, jitter: 50 }),
        seed,
      )
    const starts = (pieces: ReturnType<typeof splitGlyph>) =>
      pieces.map((p) => p.commands[0])

    it("gives the same pieces for the same seed", () => {
      expect(jittered(0, 9)).toEqual(jittered(0, 9))
    })

    it("cuts each glyph differently, from its own seed", () => {
      expect(starts(jittered(0, 9))).not.toEqual(starts(jittered(1, 9)))
    })
  })

  it("gives no pieces for an empty glyph", () => {
    expect(splitGlyph(glyph(0, []), options({}), 1)).toEqual([])
  })
})
