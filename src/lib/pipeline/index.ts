import type { StrokeOutline } from "stroke-outline"
import { Typography, type Font } from "text-shape"
import type { Doc } from "@/state/document"
import { featureSettings } from "@/lib/fonts"
import { layoutToGlyphs, type GlyphOutline } from "./glyphs"
import { inkSide, offsetPieces } from "./offset"
import { removeOverlaps } from "./overlaps"
import { splitGlyph, type Piece } from "./split"
import { transformPieces } from "./transform"
import { outlinePieces, type OutlinedPiece } from "./outline"
import { strokePieces, type StrokedPiece } from "./stroke"

/*
 * The steps from the document to what's drawn, each a plain function of the
 * one before: text → glyphs → split → offset → pieces → line → outline. The
 * app runs them one by one (usePipeline) so each is only redone when its own
 * settings change; buildPieces runs them all at once.
 */

/** The document's text settings: what the layout depends on */
export type TextSettings = Pick<
  Doc,
  | "text"
  | "size"
  | "letterSpacing"
  | "wordSpacing"
  | "variations"
  | "features"
  | "kerning"
  | "lineHeight"
  | "align"
  | "wrap"
  | "wrapWidth"
>

/** The text laid out in `font`: each glyph's outline, its overlaps removed. */
export function layoutText(font: Font, text: TextSettings): GlyphOutline[] {
  const layout = new Typography()
    .textFont(font, text.size)
    .textProperties({
      letterSpacing: text.letterSpacing,
      wordSpacing: text.wordSpacing,
      fontVariationSettings: text.variations,
      fontFeatures: featureSettings(text.features),
      fontKerning: text.kerning ? "auto" : "none",
    })
    .textLeading(text.size * text.lineHeight)
    .textAlign(text.align)
    .textWrap("word")
    .layout(text.text, 0, text.size, text.wrap ? text.wrapWidth : undefined)
  return layoutToGlyphs(layout).map((g) => ({
    ...g,
    commands: removeOverlaps(g.commands),
  }))
}

/** Every glyph's contours cut into pieces. */
export function splitGlyphs(
  glyphs: readonly GlyphOutline[],
  split: Doc["split"],
  seed: number,
): Piece[] {
  return glyphs.flatMap((g) => splitGlyph(g, split, seed))
}

/** The pieces moved away from (or into) their glyph's ink. */
export function offsetGlyphPieces(
  glyphs: readonly GlyphOutline[],
  pieces: readonly Piece[],
  offset: Doc["offset"],
  seed: number,
): Piece[] {
  const sides = new Map(glyphs.map((g) => [g.index, inkSide(g.commands)]))
  return offsetPieces(pieces, sides, offset, seed)
}

/**
 * With a stroke (Appearance), each line is drawn as its outline, the stroke
 * around it. Without, as a line: it looks the same, and building outlines is
 * the slow part.
 */
export const hasStroke = (appearance: Doc["appearance"]) =>
  appearance.edgeWidth > 0

/** Everything the pipeline makes, step by step. */
export interface Built {
  glyphs: GlyphOutline[]
  /** The contours cut, before they move: the canvas's "original contours" */
  split: Piece[]
  /** Each piece with its line width */
  stroked: StrokedPiece[]
  /** With a stroke: each line as a filled shape; null without one */
  outlined: OutlinedPiece[] | null
}

/** All the steps at once, for a document: what the canvas draws. */
export function buildPieces(
  doc: Doc,
  font: Font,
  stroke: StrokeOutline,
): Built {
  const glyphs = layoutText(font, doc)
  const split = splitGlyphs(glyphs, doc.split, doc.seed)
  const moved = offsetGlyphPieces(glyphs, split, doc.offset, doc.seed)
  const transformed = transformPieces(moved, doc.pieces, doc.seed)
  const stroked = strokePieces(transformed, doc.stroke, doc.seed)
  const outlined = hasStroke(doc.appearance)
    ? outlinePieces(stroked, stroke, doc.outline)
    : null
  return { glyphs, split, stroked, outlined }
}
