import { describe, expect, it } from "vitest"
import type { PathCommand } from "vector-path-tools"
import { toSvgPath } from "./svg-path"

const line: PathCommand[] = [
  { type: "moveTo", x: 0, y: 0 },
  { type: "lineTo", x: 10.123456, y: 0 },
]

describe("toSvgPath", () => {
  it("rounds to the digits given, and keeps full precision without", () => {
    expect(toSvgPath(line)).toBe("M 0 0 L 10.123456 0")
    expect(toSvgPath(line, 3)).toBe("M 0 0 L 10.123 0")
  })

  it("never writes a negative zero", () => {
    expect(toSvgPath([{ type: "moveTo", x: -0.0001, y: 0 }], 3)).toBe("M 0 0")
  })
})
