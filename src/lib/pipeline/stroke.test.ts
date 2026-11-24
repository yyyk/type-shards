import type { PathCommand } from "vector-path-tools"
import { describe, expect, it } from "vitest"
import type { Piece } from "./split"
import { dropTails, MIN_STROKE_WIDTH, strokePieces } from "./stroke"

const line: PathCommand[] = [
  { type: "moveTo", x: 0, y: 0 },
  { type: "lineTo", x: 10, y: 0 },
]
const pieces: Piece[] = Array.from({ length: 50 }, (_, index) => ({
  glyph: 0,
  contour: 0,
  index,
  commands: line,
}))
const widths = (style: Parameters<typeof strokePieces>[1], seed = 0) =>
  strokePieces(pieces, style, seed).map((p) => p.strokeWidth)

describe("strokePieces", () => {
  it("gives every piece the width without jitter", () => {
    for (const w of widths({ width: 4 })) expect(w).toBe(4)
  })

  it("varies each piece's width within ±widthJitter px", () => {
    const ws = widths({ width: 4, widthJitter: 1.5 })
    for (const w of ws) {
      expect(w).toBeGreaterThanOrEqual(2.5 - 1e-9)
      expect(w).toBeLessThanOrEqual(5.5 + 1e-9)
    }
    expect(new Set(ws.map((w) => w.toFixed(6))).size).toBeGreaterThan(1)
  })

  it("never goes below MIN_STROKE_WIDTH", () => {
    // 2 ± 3 would reach −1
    const ws = widths({ width: 2, widthJitter: 3 })
    for (const w of ws) expect(w).toBeGreaterThanOrEqual(MIN_STROKE_WIDTH)
    expect(ws).toContain(MIN_STROKE_WIDTH)
  })

  it("gives the same widths for the same seed, and others for another seed", () => {
    const style = { width: 4, widthJitter: 1 }
    expect(widths(style, 5)).toEqual(widths(style, 5))
    expect(widths(style, 5)).not.toEqual(widths(style, 6))
  })

  it("keeps each piece's labels and commands", () => {
    const [p] = strokePieces([pieces[7]], { width: 4 }, 0)
    expect(p).toMatchObject({ glyph: 0, contour: 0, index: 7, commands: line })
  })
})

describe("dropTails", () => {
  const M = (x: number, y: number): PathCommand => ({ type: "moveTo", x, y })
  const L = (x: number, y: number): PathCommand => ({ type: "lineTo", x, y })

  it("drops a short last segment round a corner", () => {
    // 40 along, then 0.1 down round a right angle: the tail of a cut just past a corner
    expect(dropTails([M(0, 0), L(40, 0), L(40, 0.1)], 4)).toEqual([
      M(0, 0),
      L(40, 0),
    ])
  })

  it("drops a short first segment, moving the start to the corner", () => {
    expect(dropTails([M(40, -0.1), L(40, 0), L(0, 0)], 4)).toEqual([
      M(40, 0),
      L(0, 0),
    ])
  })

  it("drops a tail at both ends", () => {
    const both = [M(0, -0.2), L(0, 0), L(40, 0), L(40, 0.3)]
    expect(dropTails(both, 4)).toEqual([M(0, 0), L(40, 0)])
  })

  it("keeps an end segment at least as long as the width", () => {
    const arm = [M(0, 0), L(40, 0), L(40, 4)]
    expect(dropTails(arm, 4)).toEqual(arm)
  })

  it("keeps a short end segment that continues smoothly", () => {
    // a curve made of pieces: the short last line carries straight on
    const smooth = [M(0, 0), L(40, 0), L(42, 0)]
    expect(dropTails(smooth, 4)).toEqual(smooth)
    // a gentle 10° bend isn't a corner either
    const r = (10 * Math.PI) / 180
    const gentle = [M(0, 0), L(40, 0), L(40 + 2 * Math.cos(r), 2 * Math.sin(r))]
    expect(dropTails(gentle, 4)).toEqual(gentle)
  })

  it("finds the corner where a curve has no direction at its end", () => {
    // the cubic's second control point sits on its end, so its direction there
    // comes from the control points: heading right, then a 0.1 tail going down
    const cubic: PathCommand = {
      type: "cubicTo",
      c1x: 10,
      c1y: -10,
      c2x: 40,
      c2y: 0,
      x: 40,
      y: 0,
    }
    expect(dropTails([M(0, 0), cubic, L(40, 0.1)], 4)).toEqual([M(0, 0), cubic])
  })

  it("keeps a short segment after a curve with no direction at its end, when it carries on", () => {
    // the cubic's second control point sits on its end, but its first one says it
    // arrives heading right; the short line carries straight on, so it isn't a tail
    const cubic: PathCommand = {
      type: "cubicTo",
      c1x: 30,
      c1y: 0,
      c2x: 40,
      c2y: 0,
      x: 40,
      y: 0,
    }
    const smooth = [M(0, 0), cubic, L(42, 0)]
    expect(dropTails(smooth, 4)).toEqual(smooth)
  })

  it("keeps one segment when a two-segment piece is all tail", () => {
    // both segments are short and meet at a corner: one stays
    const result = dropTails([M(0, -0.2), L(0, 0), L(0.3, 0)], 4)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe("moveTo")
  })

  it("never drops a piece's only segment", () => {
    const short = [M(0, 0), L(0.1, 0)]
    expect(dropTails(short, 4)).toEqual(short)
  })

  it("leaves a closed piece as it is", () => {
    const closed = [
      M(0, 0),
      L(40, 0),
      L(40, 0.1),
      L(0, 0.1),
      { type: "close" } as PathCommand,
    ]
    expect(dropTails(closed, 4)).toEqual(closed)
  })

  it("returns new commands and leaves the input unchanged", () => {
    const input = [M(0, 0), L(40, 0), L(40, 0.1)]
    const copy = structuredClone(input)
    const result = dropTails(input, 4)
    expect(input).toEqual(copy)
    expect(result[1]).not.toBe(input[1])
  })
})

describe("strokePieces with dropTails", () => {
  const tailed: Piece = {
    glyph: 0,
    contour: 0,
    index: 0,
    commands: [
      { type: "moveTo", x: 0, y: 0 },
      { type: "lineTo", x: 40, y: 0 },
      { type: "lineTo", x: 40, y: 0.1 },
    ],
  }

  it("drops tails shorter than each piece's own stroke width", () => {
    const [p] = strokePieces([tailed], { width: 4, dropTails: true }, 0)
    expect(p.commands).toEqual(tailed.commands.slice(0, 2))
    // a stroke thinner than the tail keeps it
    const [thin] = strokePieces([tailed], { width: 0.05, dropTails: true }, 0)
    expect(thin.commands).toEqual(tailed.commands)
  })

  it("leaves the commands alone without dropTails, and keeps the widths the same", () => {
    const [plain] = strokePieces([tailed], { width: 4, widthJitter: 1 }, 3)
    const [dropped] = strokePieces(
      [tailed],
      { width: 4, widthJitter: 1, dropTails: true },
      3,
    )
    expect(plain.commands).toEqual(tailed.commands)
    expect(dropped.strokeWidth).toBe(plain.strokeWidth)
  })
})
