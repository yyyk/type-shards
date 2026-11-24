import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"
import { init, type StrokeOutline } from "stroke-outline"
import { Font, initText } from "text-shape"
import { defaultDoc, type Doc } from "@/state/document"
import { buildPieces, layoutText } from "."

// the real engines, as the app loads them, but from disk
let font: Font
let stroke: StrokeOutline
beforeAll(async () => {
  await initText(
    readFileSync("node_modules/text-shape/wasm/text_shape_bg.wasm"),
  )
  stroke = await init(
    readFileSync("node_modules/stroke-outline/dist/wasm/stroke_outline.wasm"),
  )
  font = Font.fromBytes(readFileSync("public/fonts/Roboto-Regular.ttf"))
})

const doc = (patch: Partial<Doc> = {}): Doc => ({
  ...defaultDoc,
  text: "Hi",
  ...patch,
})

describe("layoutText", () => {
  it("gives a glyph per letter that draws, spaces left out", () => {
    expect(layoutText(font, doc({ text: "Hi" }))).toHaveLength(2)
    expect(layoutText(font, doc({ text: "H i" }))).toHaveLength(2)
    expect(layoutText(font, doc({ text: "" }))).toHaveLength(0)
  })
})

describe("buildPieces", () => {
  it("is the same every time for the same document", () => {
    expect(buildPieces(doc(), font, stroke)).toEqual(
      buildPieces(doc(), font, stroke),
    )
  })

  it("outlines the lines only with a stroke", () => {
    const withStroke = buildPieces(doc(), font, stroke)
    expect(withStroke.outlined).toHaveLength(withStroke.stroked.length)
    const without = buildPieces(
      doc({ appearance: { ...defaultDoc.appearance, edgeWidth: 0 } }),
      font,
      stroke,
    )
    expect(without.outlined).toBeNull()
  })

  it("keeps the cut contours as they are, before anything moves", () => {
    const built = buildPieces(doc(), font, stroke)
    expect(built.split.length).toBeGreaterThan(2)
    // moved by the offset
    expect(built.stroked[0].commands).not.toEqual(built.split[0].commands)
    // with nothing moving them, the lines are the cut contours
    // (set here, not taken from the defaults, which may move them)
    const still = buildPieces(
      doc({
        offset: { distance: 0, distanceJitter: 0, angleJitter: 0 },
        pieces: { rotationJitter: 0, scaleJitter: 0, gaps: 0 },
        stroke: { ...defaultDoc.stroke, dropTails: false },
      }),
      font,
      stroke,
    )
    expect(still.stroked.map((p) => p.commands)).toEqual(
      still.split.map((p) => p.commands),
    )
  })

  it("leaves pieces out for gaps", () => {
    const all = buildPieces(doc({ text: "Hello" }), font, stroke)
    const gaps = buildPieces(
      doc({ text: "Hello", pieces: { ...defaultDoc.pieces, gaps: 50 } }),
      font,
      stroke,
    )
    expect(gaps.stroked.length).toBeLessThan(all.stroked.length)
    expect(gaps.split).toEqual(all.split) // the cuts are the same
  })
})
