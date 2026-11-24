import { describe, expect, it } from "vitest"
import { MAX_PNG_SIDE, pngSize } from "./png"

describe("pngSize", () => {
  it("scales, rounding up so nothing is cut off", () => {
    expect(pngSize(100, 50.2, 1)).toEqual({ width: 100, height: 51 })
    expect(pngSize(100, 50.2, 2)).toEqual({ width: 200, height: 101 })
  })

  it("is at least 1 px a side", () => {
    expect(pngSize(0, 0.1, 1)).toEqual({ width: 1, height: 1 })
  })

  it("refuses what's too big to draw", () => {
    expect(pngSize(MAX_PNG_SIDE, 10, 1).width).toBe(MAX_PNG_SIDE)
    expect(() => pngSize(MAX_PNG_SIDE, 10, 2)).toThrow("too big for a PNG")
  })
})
