import { bounds, type Bounds } from "vector-path-tools"
import type { OutlinedPiece } from "@/lib/pipeline/outline"
import type { StrokedPiece } from "@/lib/pipeline/stroke"

/**
 * What the pieces draw, together: an outline's shape plus half its edge
 * (`edgeWidth`), or a stroke's path plus half its width. Null when they draw
 * nothing.
 */
export function piecesBounds(
  pieces: readonly (StrokedPiece | OutlinedPiece)[],
  edgeWidth = 0,
): Bounds | null {
  const result = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
  for (const piece of pieces) {
    const isOutline = "outline" in piece
    const b = bounds(isOutline ? piece.outline : piece.commands)
    if (!b) {
      continue
    }
    const grow = (isOutline ? edgeWidth : piece.strokeWidth) / 2
    result.minX = Math.min(result.minX, b.minX - grow)
    result.minY = Math.min(result.minY, b.minY - grow)
    result.maxX = Math.max(result.maxX, b.maxX + grow)
    result.maxY = Math.max(result.maxY, b.maxY + grow)
  }
  return result.minX <= result.maxX ? result : null
}
