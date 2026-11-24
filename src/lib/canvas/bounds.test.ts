import { describe, expect, it } from "vitest"
import type { PathCommand } from "vector-path-tools"
import { piecesBounds } from "./bounds"

const line = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): PathCommand[] => [
  { type: "moveTo", x: x0, y: y0 },
  { type: "lineTo", x: x1, y: y1 },
]
const piece = { glyph: 0, contour: 0, index: 0 }

describe("piecesBounds", () => {
  it("grows a stroke by half its width", () => {
    const stroked = { ...piece, commands: line(0, 0, 10, 0), strokeWidth: 4 }
    expect(piecesBounds([stroked])).toEqual({
      minX: -2,
      minY: -2,
      maxX: 12,
      maxY: 2,
    })
  })

  it("measures an outline by its shape, grown by half the edge", () => {
    const outlined = {
      ...piece,
      commands: line(0, 0, 10, 0),
      strokeWidth: 4,
      outline: [...line(0, -2, 10, -2), ...line(10, 2, 0, 2)],
    }
    expect(piecesBounds([outlined])).toEqual({
      minX: 0,
      minY: -2,
      maxX: 10,
      maxY: 2,
    })
    expect(piecesBounds([outlined], 2)).toEqual({
      minX: -1,
      minY: -3,
      maxX: 11,
      maxY: 3,
    })
  })

  it("joins the pieces, and skips ones that draw nothing", () => {
    const a = { ...piece, commands: line(0, 0, 10, 0), strokeWidth: 0 }
    const b = { ...piece, commands: line(20, 5, 30, 5), strokeWidth: 0 }
    const empty = { ...piece, commands: [], strokeWidth: 0 }
    expect(piecesBounds([a, empty, b])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 30,
      maxY: 5,
    })
  })

  it("is null for nothing", () => {
    expect(piecesBounds([])).toBeNull()
  })
})
