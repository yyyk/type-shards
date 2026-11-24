import { useMemo } from "react"
import type { StrokeOutline } from "stroke-outline"
import type { Font } from "text-shape"
import { transformPieces } from "@/lib/pipeline/transform"
import { outlinePieces } from "@/lib/pipeline/outline"
import {
  hasStroke,
  layoutText,
  offsetGlyphPieces,
  splitGlyphs,
  type Built,
} from "@/lib/pipeline"
import { strokePieces } from "@/lib/pipeline/stroke"
import type { Doc } from "@/state/document"

/**
 * The pipeline (src/lib/pipeline), step by step, each step redone only when
 * its input or its own settings change: editing the line width doesn't lay
 * the text out again.
 */
export function usePipeline(
  doc: Doc,
  font: Font,
  stroke: StrokeOutline,
): Built {
  const glyphs = useMemo(
    () =>
      layoutText(font, {
        text: doc.text,
        size: doc.size,
        letterSpacing: doc.letterSpacing,
        wordSpacing: doc.wordSpacing,
        variations: doc.variations,
        features: doc.features,
        kerning: doc.kerning,
        lineHeight: doc.lineHeight,
        align: doc.align,
        wrap: doc.wrap,
        wrapWidth: doc.wrapWidth,
      }),
    [
      font,
      doc.text,
      doc.size,
      doc.letterSpacing,
      doc.wordSpacing,
      doc.variations,
      doc.features,
      doc.kerning,
      doc.lineHeight,
      doc.align,
      doc.wrap,
      doc.wrapWidth,
    ],
  )
  const split = useMemo(
    () => splitGlyphs(glyphs, doc.split, doc.seed),
    [glyphs, doc.split, doc.seed],
  )
  const moved = useMemo(
    () => offsetGlyphPieces(glyphs, split, doc.offset, doc.seed),
    [glyphs, split, doc.offset, doc.seed],
  )
  const transformed = useMemo(
    () => transformPieces(moved, doc.pieces, doc.seed),
    [moved, doc.pieces, doc.seed],
  )
  const stroked = useMemo(
    () => strokePieces(transformed, doc.stroke, doc.seed),
    [transformed, doc.stroke, doc.seed],
  )
  const withStroke = hasStroke(doc.appearance)
  const outlined = useMemo(
    () => (withStroke ? outlinePieces(stroked, stroke, doc.outline) : null),
    [withStroke, stroked, stroke, doc.outline],
  )
  return { glyphs, split, stroked, outlined }
}
