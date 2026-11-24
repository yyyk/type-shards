import { describe, expect, it } from "vitest"
import { measure, type PathCommand } from "vector-path-tools"
import { inkSide, offsetPiece, offsetPieces } from "./offset"
import type { Piece } from "./split"

/** A rectangle contour, clockwise on screen unless `reversed`. */
function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  reversed = false,
): PathCommand[] {
  const points = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
  if (reversed) points.reverse()
  const [[x0, y0], ...rest] = points
  return [
    { type: "moveTo", x: x0, y: y0 },
    ...rest.map(([px, py]): PathCommand => ({ type: "lineTo", x: px, y: py })),
    { type: "close" },
  ]
}

describe("inkSide", () => {
  it("is 1 for a contour running clockwise on screen", () => {
    expect(inkSide(rect(0, 0, 10, 10))).toBe(1)
  })

  it("is -1 for a contour running counter-clockwise on screen", () => {
    expect(inkSide(rect(0, 0, 10, 10, true))).toBe(-1)
  })

  it("follows the outer contour, not the hole", () => {
    const hole = [...rect(0, 0, 100, 100), ...rect(25, 25, 50, 50, true)]
    expect(inkSide(hole)).toBe(1)
    const reversed = [...rect(0, 0, 100, 100, true), ...rect(25, 25, 50, 50)]
    expect(inkSide(reversed)).toBe(-1)
  })

  it("follows the largest contour, wherever it comes in the path", () => {
    // like an "i": a small dot first, then the larger stem, running the other way
    const i = [...rect(0, 0, 5, 5), ...rect(0, 10, 5, 50, true)]
    expect(inkSide(i)).toBe(-1)
  })

  it("is 1 for an empty path", () => {
    expect(inkSide([])).toBe(1)
  })
})

const piece = (commands: PathCommand[], index = 0, glyph = 0): Piece => ({
  glyph,
  contour: 0,
  index,
  commands,
})

/** Every on-curve and control point, as [x, y] pairs, for comparing positions. */
const points = (commands: PathCommand[]) =>
  commands.flatMap((c): [number, number][] => {
    switch (c.type) {
      case "moveTo":
      case "lineTo":
        return [[c.x, c.y]]
      case "quadTo":
        return [
          [c.cx, c.cy],
          [c.x, c.y],
        ]
      case "cubicTo":
        return [
          [c.c1x, c.c1y],
          [c.c2x, c.c2y],
          [c.x, c.y],
        ]
      case "close":
        return []
    }
  })

/** Checks every point of `actual` is the matching point of `original`, moved by (dx, dy). */
function expectMovedBy(
  actual: PathCommand[],
  original: PathCommand[],
  dx: number,
  dy: number,
) {
  const before = points(original)
  const after = points(actual)
  expect(after).toHaveLength(before.length)
  for (const [i, [x, y]] of before.entries()) {
    expect(after[i][0]).toBeCloseTo(x + dx)
    expect(after[i][1]).toBeCloseTo(y + dy)
  }
}

// Runs left to right, so its right-hand side (y down) is below it: with an ink
// side of 1, the ink is below the line.
const line: PathCommand[] = [
  { type: "moveTo", x: 0, y: 0 },
  { type: "lineTo", x: 10, y: 0 },
]

describe("offsetPiece", () => {
  it("moves the piece away from the ink for a positive distance", () => {
    expectMovedBy(offsetPiece(piece(line), 1, 2), line, 0, -2)
  })

  it("moves it into the ink for a negative distance", () => {
    expectMovedBy(offsetPiece(piece(line), 1, -2), line, 0, 2)
  })

  it("follows the ink side: -1 means the ink is on the other side", () => {
    expectMovedBy(offsetPiece(piece(line), -1, 2), line, 0, 2)
  })

  it("keeps the length and shape exactly, curves included", () => {
    const curve: PathCommand[] = [
      { type: "moveTo", x: 0, y: 0 },
      { type: "cubicTo", c1x: 10, c1y: -20, c2x: 30, c2y: 20, x: 40, y: 0 },
    ]
    const result = offsetPiece(piece(curve), 1, 2)
    expect(measure(result).length).toBeCloseTo(measure(curve).length, 9)
  })

  it("uses the average direction when the midpoint is a corner", () => {
    // (0,0) → (10,0) → (10,10): the midpoint is the corner at (10,0).
    // Directions (1,0) and (0,1) average to 45°, so the right-hand normal is
    // (-1, 1) / √2: into the ink, 2 along it, for a distance of -2.
    const corner: PathCommand[] = [
      { type: "moveTo", x: 0, y: 0 },
      { type: "lineTo", x: 10, y: 0 },
      { type: "lineTo", x: 10, y: 10 },
    ]
    const result = offsetPiece(piece(corner), 1, -2)
    expectMovedBy(result, corner, -Math.SQRT2, Math.SQRT2)
  })

  it("moves a closed piece as a whole, like any other", () => {
    // a 10 × 10 square, clockwise on screen: its midpoint by length is the
    // corner (10,10), so it moves diagonally away from the ink there
    const square: PathCommand[] = [
      ...line,
      { type: "lineTo", x: 10, y: 10 },
      { type: "lineTo", x: 0, y: 10 },
      { type: "close" },
    ]
    const result = offsetPiece(piece(square), 1, 2)
    expectMovedBy(result, square, Math.SQRT2, Math.SQRT2)
    expect(result.at(-1)).toEqual({ type: "close" })
  })

  it("leaves the piece in place for distance 0", () => {
    expectMovedBy(offsetPiece(piece(line), 1, 0), line, 0, 0)
  })

  it("leaves the input unchanged", () => {
    const input = structuredClone(line)
    offsetPiece(piece(input), 1, 2)
    expect(input).toEqual(line)
  })
})

describe("offsetPieces", () => {
  // 50 copies of the same line, each its own piece: with an ink side of 1,
  // each moves straight up by its distance, so -y is that distance
  const lines = Array.from({ length: 50 }, (_, i) => piece(line, i))
  const sides = new Map([[0, 1 as const]])
  const distances = (moved: Piece[]) =>
    moved.map((p) => {
      const start = p.commands[0]
      if (start.type !== "moveTo") throw new Error("expected a moveTo")
      return -start.y
    })

  it("moves every piece exactly the distance without jitter", () => {
    for (const d of distances(offsetPieces(lines, sides, { distance: 2 }, 0))) {
      expect(d).toBeCloseTo(2)
    }
  })

  it("varies each piece's distance within ±distanceJitter px", () => {
    const moved = offsetPieces(
      lines,
      sides,
      { distance: 2, distanceJitter: 1 },
      0,
    )
    const ds = distances(moved)
    for (const d of ds) {
      expect(d).toBeGreaterThanOrEqual(1 - 1e-9)
      expect(d).toBeLessThanOrEqual(3 + 1e-9)
    }
    expect(new Set(ds.map((d) => d.toFixed(6))).size).toBeGreaterThan(1)
  })

  it("lets a piece cross to the other side when the range includes 0", () => {
    // distance 0 ± 10: some pieces move away from the ink, some into it
    const ds = distances(
      offsetPieces(lines, sides, { distance: 0, distanceJitter: 10 }, 0),
    )
    for (const d of ds) {
      expect(Math.abs(d)).toBeLessThanOrEqual(10 + 1e-9)
    }
    expect(ds.some((d) => d > 0)).toBe(true)
    expect(ds.some((d) => d < 0)).toBe(true)
  })

  it("gives the same result for the same seed, and another for another seed", () => {
    const o = { distance: 2, distanceJitter: 0.5 }
    expect(offsetPieces(lines, sides, o, 7)).toEqual(
      offsetPieces(lines, sides, o, 7),
    )
    expect(offsetPieces(lines, sides, o, 7)).not.toEqual(
      offsetPieces(lines, sides, o, 8),
    )
  })

  it("uses each piece's own glyph's ink side", () => {
    const two = [piece(line, 0, 0), piece(line, 0, 1)]
    const both = new Map<number, 1 | -1>([
      [0, 1],
      [1, -1],
    ])
    const [a, b] = offsetPieces(two, both, { distance: 2 }, 0)
    expectMovedBy(a.commands, line, 0, -2)
    expectMovedBy(b.commands, line, 0, 2)
  })

  it("keeps each piece's labels", () => {
    const [moved] = offsetPieces([piece(line, 3, 0)], sides, { distance: 2 }, 0)
    expect(moved).toMatchObject({ glyph: 0, contour: 0, index: 3 })
  })
})

describe("offsetPiece with an angle", () => {
  it("tilts the move away from the normal, keeping its length", () => {
    // 30° from straight up (away from the ink), still 2 long
    const [[x, y]] = points(offsetPiece(piece(line), 1, 2, Math.PI / 6))
    expect(Math.hypot(x, y)).toBeCloseTo(2)
    expect(y).toBeCloseTo(-2 * Math.cos(Math.PI / 6))
    expect(Math.abs(x)).toBeCloseTo(2 * Math.sin(Math.PI / 6))
  })

  it("slides the piece along itself at 90°", () => {
    const [[x, y]] = points(offsetPiece(piece(line), 1, 2, Math.PI / 2))
    expect(y).toBeCloseTo(0)
    expect(Math.abs(x)).toBeCloseTo(2)
  })

  it("is the same as no angle at 0", () => {
    expect(offsetPiece(piece(line), 1, 2, 0)).toEqual(
      offsetPiece(piece(line), 1, 2),
    )
  })
})

describe("offsetPieces with angleJitter", () => {
  const lines = Array.from({ length: 50 }, (_, i) => piece(line, i))
  const sides = new Map([[0, 1 as const]])
  /** The direction each piece moved, in degrees from straight up (away from the ink). */
  const tilts = (moved: Piece[]) =>
    moved.map((p) => {
      const [[x, y]] = points(p.commands)
      return (Math.atan2(x, -y) * 180) / Math.PI
    })

  it("tilts each piece by up to ±angleJitter degrees", () => {
    const ts = tilts(
      offsetPieces(lines, sides, { distance: 2, angleJitter: 30 }, 0),
    )
    for (const t of ts) expect(Math.abs(t)).toBeLessThanOrEqual(30 + 1e-9)
    expect(ts.some((t) => t > 5)).toBe(true)
    expect(ts.some((t) => t < -5)).toBe(true)
  })

  it("never tilts past 90°, so pieces don't move back towards the ink", () => {
    for (const t of tilts(
      offsetPieces(lines, sides, { distance: 2, angleJitter: 1000 }, 0),
    )) {
      expect(Math.abs(t)).toBeLessThanOrEqual(90 + 1e-9)
    }
  })

  it("keeps each piece's distance when tilting", () => {
    for (const p of offsetPieces(
      lines,
      sides,
      { distance: 2, angleJitter: 60 },
      0,
    )) {
      const [[x, y]] = points(p.commands)
      expect(Math.hypot(x, y)).toBeCloseTo(2)
    }
  })

  it("doesn't change the distances when turned on", () => {
    // the angle is drawn after the distance, so the distances stay the same
    const o = { distance: 2, distanceJitter: 1 }
    const plain = offsetPieces(lines, sides, o, 3)
    const tilted = offsetPieces(lines, sides, { ...o, angleJitter: 45 }, 3)
    for (const [i, p] of tilted.entries()) {
      const [[x, y]] = points(p.commands)
      const [[px, py]] = points(plain[i].commands)
      expect(Math.hypot(x, y)).toBeCloseTo(Math.hypot(px, py))
    }
  })
})
