import { describe, expect, it } from "vitest"
import type { PathCommand } from "vector-path-tools"
import { defaultDoc } from "@/state/document"
import { toSvgPath } from "@/lib/svg-path"
import { piecesToSvg } from "./svg"

const line: PathCommand[] = [
  { type: "moveTo", x: 0, y: 0 },
  { type: "lineTo", x: 10.123456, y: 0 },
]
const square: PathCommand[] = [
  { type: "moveTo", x: 0, y: -2 },
  { type: "lineTo", x: 10, y: -2 },
  { type: "lineTo", x: 10, y: 2 },
  { type: "lineTo", x: 0, y: 2 },
  { type: "close" },
]
const piece = { glyph: 0, contour: 0, index: 0, commands: line, strokeWidth: 4 }
const appearance = defaultDoc.appearance
const lineStyle = {
  lineCap: "round",
  lineJoin: "bevel",
  miterLimit: 3,
} as const

/** The value of every `name="…"` in the svg, in order. */
const values = (svg: string, name: string) =>
  [...svg.matchAll(new RegExp(` ${name}="([^"]*)"`, "g"))].map((m) => m[1])

describe("piecesToSvg", () => {
  it("fills outlines, with the edge, sized to fit", () => {
    const svg = piecesToSvg(
      [{ ...piece, outline: square }],
      appearance,
      lineStyle,
    )
    expect(svg).not.toBeNull()
    // grown by half the 1 px edge
    expect(values(svg!, "viewBox")).toEqual(["-0.5 -2.5 11 5"])
    // no background: only the piece is filled
    expect(values(svg!, "fill")).toEqual([appearance.color])
    expect(svg).not.toContain("<rect")
    expect(values(svg!, "stroke")).toEqual([appearance.edge])
    expect(values(svg!, "d")).toEqual([toSvgPath(square, 3)])
  })

  it("puts the background under the pieces when asked", () => {
    const svg = piecesToSvg(
      [{ ...piece, outline: square }],
      appearance,
      lineStyle,
      "#123456",
    )!
    // the rectangle covers the whole drawing, before (under) the piece
    expect(svg).toContain(
      '<rect x="-0.5" y="-2.5" width="11" height="5" fill="#123456"/>',
    )
    expect(svg.indexOf("<rect")).toBeLessThan(svg.indexOf("<path"))
  })

  it("escapes the background too", () => {
    const svg = piecesToSvg([piece], appearance, lineStyle, '"/><script>')!
    expect(svg).not.toContain("<script>")
  })

  it("leaves the edge out when it has no width", () => {
    const svg = piecesToSvg(
      [{ ...piece, outline: square }],
      { ...appearance, edgeWidth: 0 },
      lineStyle,
    )!
    expect(values(svg, "stroke")).toEqual([])
    expect(values(svg, "viewBox")).toEqual(["0 -2 10 4"])
  })

  it("strokes stroked pieces with their width, caps and joins", () => {
    const svg = piecesToSvg([piece], appearance, lineStyle)!
    expect(values(svg, "stroke")).toEqual([appearance.color])
    expect(values(svg, "stroke-width")).toEqual(["4"])
    expect(values(svg, "stroke-linecap")).toEqual(["round"])
    expect(values(svg, "stroke-linejoin")).toEqual(["bevel"])
    expect(values(svg, "stroke-miterlimit")).toEqual(["3"])
    expect(values(svg, "d")).toEqual(["M 0 0 L 10.123 0"])
  })

  it("escapes colours, so a colour can't break the markup", () => {
    const svg = piecesToSvg(
      [piece],
      { ...appearance, color: '"/><script>' },
      lineStyle,
    )!
    expect(svg).not.toContain("<script>")
    expect(values(svg, "stroke")[0]).toBe("&quot;/&gt;&lt;script&gt;")
  })

  it("is null when there's nothing to draw", () => {
    expect(piecesToSvg([], appearance, lineStyle)).toBeNull()
  })
})
