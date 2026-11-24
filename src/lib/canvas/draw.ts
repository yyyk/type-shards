import type { PathCommand } from "vector-path-tools"
import type { Appearance } from "@/state/document"
import type { Piece } from "@/lib/pipeline/split"
import type { OutlinedPiece, OutlineStyle } from "@/lib/pipeline/outline"
import { snapOffset, toScreen, type ScreenTransform } from "./screen"
import type { StrokedPiece } from "@/lib/pipeline/stroke"

/** A colour per piece, for telling the pieces apart */
const pieceColor = (i: number) => `hsl(${(i * 137.5) % 360} 70% 45%)`

/** The commands as a Path2D, built directly rather than from an SVG string. */
export function toPath2D(commands: readonly PathCommand[]): Path2D {
  const path = new Path2D()
  for (const c of commands) {
    switch (c.type) {
      case "moveTo":
        path.moveTo(c.x, c.y)
        break
      case "lineTo":
        path.lineTo(c.x, c.y)
        break
      case "quadTo":
        path.quadraticCurveTo(c.cx, c.cy, c.x, c.y)
        break
      case "cubicTo":
        path.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, c.x, c.y)
        break
      case "close":
        path.closePath()
        break
      default: {
        const unhandled: never = c
        throw new Error(`Unknown command: ${JSON.stringify(unhandled)}`)
      }
    }
  }
  return path
}

export interface DrawOptions {
  appearance: Appearance
  /** Caps and joins for stroked pieces (outlined ones have them built in) */
  lineStyle: OutlineStyle
  /** device px: a line that's 1 px on screen (the ghost's, and debug edges) */
  hairline: number
  /** Snap the paths to the pixel grid, so straight edges are crisp */
  pixelSnap: boolean
  /** The contours before they're moved and stroked, as thin lines */
  ghost?: readonly Piece[]
  /** A colour per piece, outlines unfilled: to tell the pieces apart */
  debugColors?: boolean
}

/**
 * Draws the pieces on `ctx`, whose transform must be the identity: `view`
 * takes the document to device px. Outlined pieces are filled with the
 * colour and stroked with the edge; stroked ones are stroked with the colour.
 * The canvas and the PNG export both draw with this, so they match.
 */
export function drawPieces(
  ctx: CanvasRenderingContext2D,
  pieces: readonly (StrokedPiece | OutlinedPiece)[],
  view: ScreenTransform,
  {
    appearance,
    lineStyle,
    hairline,
    pixelSnap,
    ghost = [],
    debugColors = false,
  }: DrawOptions,
) {
  // a path for a line `width` device px wide
  const path = (commands: readonly PathCommand[], width: number) =>
    toPath2D(toScreen(commands, view, pixelSnap ? snapOffset(width) : null))

  for (const [i, piece] of pieces.entries()) {
    if ("outline" in piece) {
      const outline = path(piece.outline, appearance.edgeWidth * view.scale)
      if (!debugColors) {
        ctx.fillStyle = appearance.color
        ctx.fill(outline) // nonzero is the canvas default
      }
      if (debugColors || appearance.edgeWidth > 0) {
        ctx.strokeStyle = debugColors ? pieceColor(i) : appearance.edge
        ctx.lineWidth = debugColors
          ? hairline
          : appearance.edgeWidth * view.scale
        ctx.stroke(outline)
      }
    } else {
      ctx.strokeStyle = debugColors ? pieceColor(i) : appearance.color
      ctx.lineWidth = piece.strokeWidth * view.scale
      ctx.lineCap = lineStyle.lineCap ?? "butt"
      ctx.lineJoin = lineStyle.lineJoin ?? "miter"
      ctx.miterLimit = lineStyle.miterLimit ?? 4
      ctx.stroke(path(piece.commands, ctx.lineWidth))
    }
  }

  if (ghost.length) {
    ctx.lineWidth = hairline
    ctx.lineCap = "butt"
    ctx.lineJoin = "miter"
    for (const [i, piece] of ghost.entries()) {
      ctx.strokeStyle = debugColors ? pieceColor(i) : "rgb(0 0 0 / 0.3)"
      ctx.stroke(path(piece.commands, hairline))
    }
  }
}
