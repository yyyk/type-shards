import type { LineCap, LineJoin, StrokeOutline } from "stroke-outline"
import type { StrokedPiece } from "./stroke"
import type { PathCommand } from "vector-path-tools"
import { toSvgPath } from "@/lib/svg-path"
import { removeOverlaps } from "./overlaps"

export interface OutlineStyle {
  lineCap?: LineCap // "butt" | "square" | "round", default "butt"
  lineJoin?: LineJoin // "miter" | "bevel" | "round", default "miter"
  miterLimit?: number // default 4
}

export interface OutlinedPiece extends StrokedPiece {
  /** The stroke as a filled shape: fill it with the nonzero rule. */
  outline: PathCommand[]
}

export function outlinePieces(
  pieces: readonly StrokedPiece[],
  so: StrokeOutline,
  style: OutlineStyle,
): OutlinedPiece[] {
  const result: OutlinedPiece[] = []
  for (const piece of pieces) {
    const outline = so.buildOutline(toSvgPath(piece.commands), {
      lineWidth: piece.strokeWidth,
      lineCap: style.lineCap,
      lineJoin: style.lineJoin,
      miterLimit: style.miterLimit,
    })
    // An open piece's outline doubles back over itself at a corner the offset
    // edges can't meet in (clipToShape only clips closed subpaths): the union
    // fills the same, without those inner edges.
    result.push({ ...piece, outline: removeOverlaps(outline.commands) })
  }
  return result
}
