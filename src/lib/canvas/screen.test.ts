import { describe, expect, it } from "vitest"
import type { PathCommand } from "vector-path-tools"
import { snapOffset, toScreen } from "./screen"

const rect: PathCommand[] = [
  { type: "moveTo", x: 10.3, y: 20.2 },
  { type: "lineTo", x: 30.7, y: 20.2 },
  { type: "lineTo", x: 30.7, y: 40.9 },
  { type: "lineTo", x: 10.3, y: 40.9 },
  { type: "close" },
]

describe("snapOffset", () => {
  it("centres odd widths on pixel centres and even widths on pixel edges", () => {
    expect(snapOffset(1)).toBe(0.5)
    expect(snapOffset(2)).toBe(0)
    expect(snapOffset(3)).toBe(0.5)
    expect(snapOffset(1.4)).toBe(0.5) // rounds to 1
    expect(snapOffset(1.6)).toBe(0) // rounds to 2
  })

  it("treats a line thinner than a pixel as 1 px", () => {
    expect(snapOffset(0.2)).toBe(0.5)
  })
})

describe("toScreen", () => {
  const t = { scale: 2, x: 5, y: -3 }

  it("only transforms without an offset", () => {
    expect(toScreen(rect, t, null)).toEqual([
      { type: "moveTo", x: 10.3 * 2 + 5, y: 20.2 * 2 - 3 },
      { type: "lineTo", x: 30.7 * 2 + 5, y: 20.2 * 2 - 3 },
      { type: "lineTo", x: 30.7 * 2 + 5, y: 40.9 * 2 - 3 },
      { type: "lineTo", x: 10.3 * 2 + 5, y: 40.9 * 2 - 3 },
      { type: "close" },
    ])
  })

  it("snaps end points to the grid at the offset, by at most half a pixel", () => {
    for (const offset of [0, 0.5]) {
      const plain = toScreen(rect, t, null)
      const snapped = toScreen(rect, t, offset)
      for (const [i, c] of snapped.entries()) {
        const p = plain[i]
        if (c.type === "close" || p.type === "close") continue
        expect(c.x - offset).toBe(Math.round(c.x - offset))
        expect(c.y - offset).toBe(Math.round(c.y - offset))
        expect(Math.abs(c.x - p.x)).toBeLessThanOrEqual(0.5)
        expect(Math.abs(c.y - p.y)).toBeLessThanOrEqual(0.5)
      }
    }
  })

  it("keeps straight edges straight: points on a line snap to the same grid line", () => {
    const [a, b] = toScreen(rect, t, 0.5)
    if (a.type !== "moveTo" || b.type !== "lineTo") throw new Error("shape")
    expect(a.y).toBe(b.y)
  })

  it("moves a cubic's control points with the end points next to them", () => {
    const curve: PathCommand[] = [
      { type: "moveTo", x: 0.3, y: 0.3 },
      { type: "cubicTo", c1x: 4, c1y: 0.3, c2x: 9.8, c2y: 6, x: 9.8, y: 10.2 },
    ]
    const id = { scale: 1, x: 0, y: 0 }
    const [m, c] = toScreen(curve, id, 0)
    if (m.type !== "moveTo" || c.type !== "cubicTo") throw new Error("shape")
    // start (0.3, 0.3) → (0, 0): c1 moves by (-0.3, -0.3)
    expect(c.c1x).toBeCloseTo(3.7)
    expect(c.c1y).toBeCloseTo(0) // the start tangent stays horizontal
    // end (9.8, 10.2) → (10, 10): c2 moves by (0.2, -0.2)
    expect(c.c2x).toBeCloseTo(10) // the end tangent stays vertical
    expect(c.c2y).toBeCloseTo(5.8)
  })

  it("moves a quad's control point by the average of its end points' moves", () => {
    const curve: PathCommand[] = [
      { type: "moveTo", x: 0.4, y: 0 },
      { type: "quadTo", cx: 5, cy: 5, x: 10, y: 0.2 },
    ]
    const [, q] = toScreen(curve, { scale: 1, x: 0, y: 0 }, 0)
    if (q.type !== "quadTo") throw new Error("shape")
    // moves: start (-0.4, 0), end (0, -0.2)
    expect(q.cx).toBeCloseTo(5 - 0.2)
    expect(q.cy).toBeCloseTo(5 - 0.1)
  })

  it("uses the subpath's start after a close", () => {
    const path: PathCommand[] = [
      { type: "moveTo", x: 0.3, y: 0 },
      { type: "lineTo", x: 5.4, y: 0 },
      { type: "close" },
      // the current point is (0.3, 0) again, moved by -0.3
      { type: "cubicTo", c1x: 1, c1y: 1, c2x: 2, c2y: 2, x: 3, y: 3 },
    ]
    const result = toScreen(path, { scale: 1, x: 0, y: 0 }, 0)
    const c = result[3]
    if (c.type !== "cubicTo") throw new Error("shape")
    expect(c.c1x).toBeCloseTo(1 - 0.3)
  })

  it("leaves the input unchanged", () => {
    const copy = structuredClone(rect)
    toScreen(rect, t, 0.5)
    expect(rect).toEqual(copy)
  })
})
