import { describe, expect, it } from "vitest"
import { placeOutline, layoutToGlyphs } from "./glyphs"
import type { PathCommand } from "vector-path-tools"
import type { TextLayout } from "text-shape"

const SPACE = 3

function fakeLayout() {
  const calls: unknown[][] = []
  const shape: PathCommand[] = [
    { type: "moveTo", x: 2, y: 4 },
    { type: "lineTo", x: 6, y: 8 },
    { type: "close" },
  ]
  const layout = {
    scale: 0.5,
    variations: { wght: 700 },
    font: {
      outline: (...args: unknown[]) => {
        calls.push(args)
        return args[0] === SPACE ? [] : shape
      },
    },
    lines: [
      {
        glyphs: [
          { id: 40, cluster: 0, x: 0, y: 100 },
          { id: 41, cluster: 1, x: 30, y: 100 },
          { id: SPACE, cluster: 2, x: 50, y: 100 },
          { id: 42, cluster: 3, x: 60, y: 100 },
        ],
      },
      {
        glyphs: [{ id: 43, cluster: 5, x: 0, y: 200 }],
      },
    ],
  } as unknown as TextLayout
  return { layout, calls }
}

describe("placeOutline", () => {
  it.each([
    [
      "moveTo",
      { type: "moveTo", x: 100, y: 200 },
      { type: "moveTo", x: 60, y: 150 },
    ],
    [
      "lineTo",
      { type: "lineTo", x: 100, y: 200 },
      { type: "lineTo", x: 60, y: 150 },
    ],
    [
      "quadTo",
      { type: "quadTo", cx: 2, cy: 4, x: 6, y: 8 },
      { type: "quadTo", cx: 11, cy: 52, x: 13, y: 54 },
    ],
    [
      "cubicTo",
      { type: "cubicTo", c1x: 2, c1y: 4, c2x: 6, c2y: 8, x: 12, y: 14 },
      { type: "cubicTo", c1x: 11, c1y: 52, c2x: 13, c2y: 54, x: 16, y: 57 },
    ],
    ["close", { type: "close" }, { type: "close" }],
  ] as const)("transforms %s", (_name, input, expected) => {
    expect(placeOutline([input], 10, 50, 0.5)).toEqual([expected])
  })

  it("leaves the input unchanged", () => {
    const input: PathCommand[] = [
      { type: "moveTo", x: 2, y: 4 },
      { type: "quadTo", cx: 6, cy: 8, x: 12, y: 14 },
      { type: "close" },
    ]
    const copy = structuredClone(input)
    placeOutline(input, 10, 50, 0.5)
    expect(input).toEqual(copy)
  })

  it("returns an empty outline for an empty input", () => {
    expect(placeOutline([], 10, 50, 0.5)).toEqual([])
  })
})

describe("layoutToGlyphs", () => {
  it("skips empty glyphs but still counts them", () => {
    const { layout } = fakeLayout()
    const indexes = layoutToGlyphs(layout).map((g) => g.index)
    expect(indexes).toEqual([0, 1, 3, 4])
  })

  it("continues the index across lines", () => {
    const { layout } = fakeLayout()
    const last = layoutToGlyphs(layout).at(-1)
    expect(last?.index).toBe(4)
  })

  it("takes cluster from the glyph's cluster, not its id", () => {
    const { layout } = fakeLayout()
    const clusters = layoutToGlyphs(layout).map((g) => g.cluster)
    expect(clusters).toEqual([0, 1, 3, 5])
  })

  it("asks the font for y-down outlines with the layout's variations", () => {
    const { layout, calls } = fakeLayout()
    layoutToGlyphs(layout)
    expect(calls[0]).toEqual([40, { wght: 700 }, { flipY: true }])
    expect(calls).toHaveLength(5)
    for (const call of calls) {
      expect(call[2]).toEqual({ flipY: true })
    }
  })

  it("places each glyph at its own pen position, scaled", () => {
    const { layout } = fakeLayout()
    const glyph = layoutToGlyphs(layout).find((g) => g.cluster === 3)
    // pen (60, 100), scale 0.5: (2, 4) → (61, 102), (6, 8) → (63, 104)
    expect(glyph?.commands).toEqual([
      { type: "moveTo", x: 61, y: 102 },
      { type: "lineTo", x: 63, y: 104 },
      { type: "close" },
    ])
  })
})
