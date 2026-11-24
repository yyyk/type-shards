import { describe, expect, it } from "vitest"
import { bounds, measure, type PathCommand } from "vector-path-tools"
import type { Piece } from "./split"
import { MIN_SCALE, rotateScale, transformPieces } from "./transform"

/** A horizontal line from (x, y), `length` long, as a piece. */
const linePiece = (index: number, x = 0, y = 0, length = 10): Piece => ({
  glyph: 0,
  contour: 0,
  index,
  commands: [
    { type: "moveTo", x, y },
    { type: "lineTo", x: x + length, y },
  ],
})
const many = Array.from({ length: 400 }, (_, i) => linePiece(i, i * 20))

const lengthOf = (commands: PathCommand[]) => measure(commands).length
const centreOf = (commands: PathCommand[]) => {
  const b = bounds(commands)!
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}
/** The direction of a line piece, in degrees. */
const angleOf = (commands: PathCommand[]) => {
  const [a, b] = commands
  if (a.type !== "moveTo" || b.type !== "lineTo") throw new Error("shape")
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

describe("rotateScale", () => {
  it("turns and scales around the centre, curves included", () => {
    const curve: PathCommand[] = [
      { type: "moveTo", x: 1, y: 0 },
      { type: "quadTo", cx: 2, cy: 0, x: 2, y: 1 },
      { type: "cubicTo", c1x: 2, c1y: 2, c2x: 1, c2y: 2, x: 1, y: 1 },
      { type: "close" },
    ]
    // a quarter turn, twice the size, around (1, 1)
    const out = rotateScale(curve, 1, 1, Math.PI / 2, 2)
    const round = (v: number) => Math.round(v * 1e9) / 1e9 + 0
    expect(
      out.map((c) =>
        Object.fromEntries(
          Object.entries(c).map(([k, v]) => [
            k,
            typeof v === "number" ? round(v) : v,
          ]),
        ),
      ),
    ).toEqual([
      { type: "moveTo", x: 3, y: 1 },
      { type: "quadTo", cx: 3, cy: 3, x: 1, y: 3 },
      { type: "cubicTo", c1x: -1, c1y: 3, c2x: -1, c2y: 1, x: 1, y: 1 },
      { type: "close" },
    ])
  })
})

describe("transformPieces", () => {
  it("leaves the pieces as they are with nothing set", () => {
    expect(transformPieces(many, {}, 1)).toEqual(many)
  })

  it("turns each piece around its centre, within the jitter", () => {
    const out = transformPieces(many, { rotationJitter: 30 }, 1)
    const angles = out.map((p) => angleOf(p.commands))
    for (const [i, p] of out.entries()) {
      expect(Math.abs(angles[i])).toBeLessThanOrEqual(30)
      expect(lengthOf(p.commands)).toBeCloseTo(10)
      expect(centreOf(p.commands).x).toBeCloseTo(i * 20 + 5)
      expect(centreOf(p.commands).y).toBeCloseTo(0)
    }
    // spread over the range, not all the same
    expect(Math.max(...angles)).toBeGreaterThan(25)
    expect(Math.min(...angles)).toBeLessThan(-25)
  })

  it("scales each piece around its centre, within the jitter", () => {
    const out = transformPieces(many, { scaleJitter: 50 }, 1)
    const lengths = out.map((p) => lengthOf(p.commands))
    for (const [i, p] of out.entries()) {
      expect(lengths[i]).toBeGreaterThanOrEqual(5 - 1e-9)
      expect(lengths[i]).toBeLessThanOrEqual(15 + 1e-9)
      expect(centreOf(p.commands).x).toBeCloseTo(i * 20 + 5)
      expect(angleOf(p.commands)).toBeCloseTo(0) // not turned
    }
    expect(Math.max(...lengths)).toBeGreaterThan(14)
    expect(Math.min(...lengths)).toBeLessThan(6)
  })

  it("never scales a piece to nothing or inside out", () => {
    const out = transformPieces(many, { scaleJitter: 500 }, 1)
    for (const p of out) {
      expect(lengthOf(p.commands)).toBeGreaterThanOrEqual(10 * MIN_SCALE - 1e-9)
      expect(angleOf(p.commands)).toBeCloseTo(0)
    }
  })

  it("leaves out about the share of pieces asked for", () => {
    expect(transformPieces(many, { gaps: 0 }, 1)).toHaveLength(400)
    expect(transformPieces(many, { gaps: 100 }, 1)).toHaveLength(0)
    const kept = transformPieces(many, { gaps: 25 }, 1).length
    // 300 expected; 4 standard deviations is ±35
    expect(Math.abs(kept - 300)).toBeLessThan(35)
  })

  it("is the same for the same seed, and different for another", () => {
    const options = { rotationJitter: 45, scaleJitter: 20, gaps: 30 }
    expect(transformPieces(many, options, 7)).toEqual(
      transformPieces(many, options, 7),
    )
    expect(transformPieces(many, options, 8)).not.toEqual(
      transformPieces(many, options, 7),
    )
  })

  it("leaves out the same pieces whatever the rotation and scale", () => {
    const ids = (pieces: Piece[]) => pieces.map((p) => p.index)
    const plain = transformPieces(many, { gaps: 40 }, 3)
    const turned = transformPieces(
      many,
      { gaps: 40, rotationJitter: 90, scaleJitter: 50 },
      3,
    )
    expect(ids(turned)).toEqual(ids(plain))
  })

  it("keeps a piece's rotation when the scale changes, and the other way round", () => {
    const a = transformPieces(many, { rotationJitter: 40, scaleJitter: 10 }, 5)
    const b = transformPieces(many, { rotationJitter: 40, scaleJitter: 60 }, 5)
    for (let i = 0; i < a.length; i++) {
      expect(angleOf(b[i].commands)).toBeCloseTo(angleOf(a[i].commands))
    }
  })

  it("leaves the input unchanged", () => {
    const copy = structuredClone(many)
    transformPieces(many, { rotationJitter: 45, scaleJitter: 20, gaps: 30 }, 1)
    expect(many).toEqual(copy)
  })
})
