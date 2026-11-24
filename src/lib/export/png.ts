import type { Appearance } from "@/state/document"
import { piecesBounds } from "@/lib/canvas/bounds"
import { drawPieces } from "@/lib/canvas/draw"
import type { OutlinedPiece, OutlineStyle } from "@/lib/pipeline/outline"
import type { StrokedPiece } from "@/lib/pipeline/stroke"

/**
 * px: the largest side a PNG gets. Browsers refuse bigger canvases (Safari
 * at about 16384 px, and less for the total area), and the image comes out
 * empty without an error.
 */
export const MAX_PNG_SIDE = 16384

/**
 * The PNG's size in px for an SVG `width` × `height` at `scale` (1×, 2×):
 * rounded up, so nothing is cut off. Throws when it's too big to draw.
 */
export function pngSize(
  width: number,
  height: number,
  scale: number,
): { width: number; height: number } {
  const size = {
    width: Math.max(1, Math.ceil(width * scale)),
    height: Math.max(1, Math.ceil(height * scale)),
  }
  if (size.width > MAX_PNG_SIDE || size.height > MAX_PNG_SIDE) {
    throw new Error(
      `${size.width} × ${size.height} px is too big for a PNG (at most ${MAX_PNG_SIDE} px a side). Try 1×, or a smaller size.`,
    )
  }
  return size
}

/**
 * The pieces as a PNG at `scale` (px per document px), drawn as the canvas
 * draws them (drawPieces), pixel snapping included, so straight edges are
 * crisp: on `background` (a CSS colour), or transparent with null. The same
 * size and place as the SVG.
 */
export async function piecesToPng(
  pieces: readonly (StrokedPiece | OutlinedPiece)[],
  appearance: Appearance,
  lineStyle: OutlineStyle,
  scale: number,
  background: string | null,
): Promise<Blob> {
  const box = piecesBounds(pieces, appearance.edgeWidth)
  if (!box) {
    throw new Error("There's nothing to draw.")
  }
  const size = pngSize(box.maxX - box.minX, box.maxY - box.minY, scale)
  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Couldn't draw the PNG.")
  }
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size.width, size.height)
  }
  drawPieces(
    ctx,
    pieces,
    { scale, x: -box.minX * scale, y: -box.minY * scale },
    { appearance, lineStyle, hairline: scale, pixelSnap: true },
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  )
  if (!blob) {
    throw new Error("Couldn't make the PNG.")
  }
  return blob
}
