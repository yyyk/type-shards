import type { PathCommand } from "vector-path-tools"
import type { TextLayout } from "text-shape"

export function placeOutline(
  outline: readonly Readonly<PathCommand>[],
  x: number,
  y: number,
  scale: number,
): PathCommand[] {
  const result: PathCommand[] = []
  const tx = (px: number) => x + px * scale
  const ty = (py: number) => y + py * scale
  for (const command of outline) {
    switch (command.type) {
      case "moveTo":
        result.push({
          type: "moveTo",
          x: tx(command.x),
          y: ty(command.y),
        })
        break
      case "lineTo":
        result.push({
          type: "lineTo",
          x: tx(command.x),
          y: ty(command.y),
        })
        break
      case "quadTo":
        result.push({
          type: "quadTo",
          cx: tx(command.cx),
          cy: ty(command.cy),
          x: tx(command.x),
          y: ty(command.y),
        })
        break
      case "cubicTo":
        result.push({
          type: "cubicTo",
          c1x: tx(command.c1x),
          c1y: ty(command.c1y),
          c2x: tx(command.c2x),
          c2y: ty(command.c2y),
          x: tx(command.x),
          y: ty(command.y),
        })
        break
      case "close":
        result.push({ type: "close" })
        break
      default: {
        const unhandled: never = command
        throw new Error(`Unknown command: ${JSON.stringify(unhandled)}`)
      }
    }
  }
  return result
}

export interface GlyphOutline {
  index: number
  cluster: number
  commands: PathCommand[]
}

export function layoutToGlyphs(layout: TextLayout): GlyphOutline[] {
  const result: GlyphOutline[] = []
  let index = 0
  for (const line of layout.lines) {
    for (const g of line.glyphs) {
      const outline = layout.font.outline(g.id, layout.variations, {
        flipY: true,
      })
      if (outline.length > 0) {
        result.push({
          index,
          cluster: g.cluster,
          commands: placeOutline(outline, g.x, g.y, layout.scale),
        })
      }
      index++
    }
  }
  return result
}
