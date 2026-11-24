import type { Appearance } from "@/state/document"
import { piecesBounds } from "@/lib/canvas/bounds"
import type { OutlinedPiece, OutlineStyle } from "@/lib/pipeline/outline"
import type { StrokedPiece } from "@/lib/pipeline/stroke"
import { toSvgPath } from "@/lib/svg-path"

/** Decimals kept in exported coordinates: 1/1000 px. */
const SVG_DIGITS = 3

/** A value safe inside an XML attribute. */
const attr = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

/**
 * The pieces as an SVG document, as they look on the canvas, sized to what
 * they draw: on `background` (a rectangle under the pieces), or transparent
 * with null, so pasted into Figma it's only the pieces (the frame has its own
 * fill). Outlined pieces are filled paths (with an edge, when it has a
 * width); stroked ones are stroked paths.
 * One path per piece, so they stay separate when pasted into Figma. Null when
 * they draw nothing.
 */
export function piecesToSvg(
  pieces: readonly (StrokedPiece | OutlinedPiece)[],
  appearance: Appearance,
  lineStyle: OutlineStyle,
  background: string | null = null,
): string | null {
  const edge = appearance.edgeWidth
  const box = piecesBounds(pieces, edge)
  if (!box) {
    return null
  }
  const round = (v: number) => Number(v.toFixed(SVG_DIGITS))
  const x = round(box.minX)
  const y = round(box.minY)
  const width = round(box.maxX - box.minX)
  const height = round(box.maxY - box.minY)

  const paths = pieces.map((piece) => {
    if ("outline" in piece) {
      const stroke =
        edge > 0
          ? ` stroke="${attr(appearance.edge)}" stroke-width="${attr(edge)}"`
          : ""
      return `  <path d="${toSvgPath(piece.outline, SVG_DIGITS)}" fill="${attr(appearance.color)}"${stroke}/>`
    }
    return (
      `  <path d="${toSvgPath(piece.commands, SVG_DIGITS)}" fill="none"` +
      ` stroke="${attr(appearance.color)}" stroke-width="${attr(round(piece.strokeWidth))}"` +
      ` stroke-linecap="${attr(lineStyle.lineCap ?? "butt")}"` +
      ` stroke-linejoin="${attr(lineStyle.lineJoin ?? "miter")}"` +
      ` stroke-miterlimit="${attr(lineStyle.miterLimit ?? 4)}"/>`
    )
  })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">`,
    ...(background
      ? [
          `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${attr(background)}"/>`,
        ]
      : []),
    ...paths.filter((p) => !p.includes('d=""')),
    "</svg>",
    "",
  ].join("\n")
}
