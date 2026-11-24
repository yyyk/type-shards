import { describe, expect, it, vi } from "vitest"
import {
  area,
  BooleanOpError,
  contains,
  subpaths,
  type PathCommand,
} from "vector-path-tools"
import { removeOverlaps } from "./overlaps"

const failure = vi.hoisted(() => ({ error: null as Error | null }))
vi.mock("vector-path-tools", async (importOriginal) => {
  const original = await importOriginal<typeof import("vector-path-tools")>()
  return {
    ...original,
    booleanOp: (...args: Parameters<typeof original.booleanOp>) => {
      if (failure.error) throw failure.error
      return original.booleanOp(...args)
    },
  }
})

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

// Stems 10 × 100 at x = 0 and x = 40, and a crossbar from x = 10 to x = 40,
// ending exactly on both stems: the flush-edge case real fonts have.
const H = [
  ...rect(0, 0, 10, 100),
  ...rect(40, 0, 10, 100),
  ...rect(10, 45, 30, 10),
]

describe("removeOverlaps", () => {
  it("merges overlapping contours into one", () => {
    const result = removeOverlaps(H)
    expect(subpaths(result)).toHaveLength(1)
    // the two stems plus the crossbar, clockwise
    expect(area(result)).toBeCloseTo(2 * 1000 + 300)
    expect(contains(result, 25, 50)).toBe(true) // on the crossbar
    expect(contains(result, 25, 20)).toBe(false) // between the stems, above it
  })

  it("keeps holes", () => {
    const result = removeOverlaps([
      ...rect(0, 0, 100, 100),
      ...rect(25, 25, 50, 50, true),
    ])
    expect(subpaths(result)).toHaveLength(2)
    expect(area(result)).toBeCloseTo(10000 - 2500)
    expect(contains(result, 50, 50)).toBe(false)
  })

  it("keeps separate shapes separate", () => {
    const result = removeOverlaps([
      ...rect(0, 0, 10, 10),
      ...rect(50, 0, 10, 10),
    ])
    expect(subpaths(result)).toHaveLength(2)
    expect(area(result)).toBeCloseTo(200)
  })

  it("closes every contour exactly at its start", () => {
    for (const contour of subpaths(removeOverlaps(H))) {
      const start = contour[0]
      const last = contour.at(-2)
      expect(contour.at(-1)).toEqual({ type: "close" })
      if (start.type !== "moveTo" || !last || last.type === "close") {
        throw new Error("unexpected contour shape")
      }
      expect(last.x).toBe(start.x)
      expect(last.y).toBe(start.y)
    }
  })

  it("leaves the input unchanged", () => {
    const copy = structuredClone(H)
    removeOverlaps(H)
    expect(H).toEqual(copy)
  })

  it("returns nothing for a path that draws nothing", () => {
    expect(removeOverlaps([])).toEqual([])
    expect(removeOverlaps([{ type: "moveTo", x: 1, y: 1 }])).toEqual([])
  })

  it("keeps the input as it is when booleanOp gives up", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    failure.error = new BooleanOpError("a contour doesn't close")
    try {
      const result = removeOverlaps(H)
      expect(result).toEqual(H)
      expect(result).not.toBe(H)
      expect(warn).toHaveBeenCalledOnce()
    } finally {
      failure.error = null
      warn.mockRestore()
    }
  })

  it("doesn't hide other errors", () => {
    failure.error = new TypeError("a bug")
    try {
      expect(() => removeOverlaps(H)).toThrow(TypeError)
    } finally {
      failure.error = null
    }
  })
})
