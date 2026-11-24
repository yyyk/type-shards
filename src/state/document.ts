import type { OffsetOptions } from "@/lib/pipeline/offset"
import type { PieceOptions } from "@/lib/pipeline/transform"
import type { SplitOptions } from "@/lib/pipeline/split"
import type { OutlineStyle } from "@/lib/pipeline/outline"
import type { StrokeStyle } from "@/lib/pipeline/stroke"

export type TextAlign = "left" | "center" | "right"

/**
 * How the pieces look (colours in hex, #rrggbb). The panel calls them as Figma
 * would for an outlined stroke: color is the Fill, edge the Stroke, edgeWidth
 * the Stroke Width (the names here are the saved ones).
 */
export interface Appearance {
  /** The pieces' colour */
  color: string
  /**
   * A line around each piece, in this colour. With it, each stroke is drawn
   * as a filled shape (its outline) with the edge around it.
   */
  edge: string
  /** px; 0 for no edge */
  edgeWidth: number
  /** The canvas behind the pieces: shown and saved, not in the SVG */
  background: string
}

export interface Doc {
  text: string
  /** A FontEntry id: a built-in font, or an uploaded one */
  font: string
  /** Variable axis values by tag, e.g. { wght: 700 }; unset axes are at their default */
  variations: Record<string, number>
  /** OpenType features turned on or off by tag; unset ones are at their default */
  features: Record<string, boolean>
  kerning: boolean
  size: number // px
  letterSpacing: number // px
  wordSpacing: number // px
  lineHeight: number // × size: baseline to baseline
  align: TextAlign
  /** Wrap lines at wrapWidth, at word breaks */
  wrap: boolean
  wrapWidth: number // px
  seed: number
  split: SplitOptions
  offset: OffsetOptions
  pieces: PieceOptions
  stroke: StrokeStyle
  outline: OutlineStyle
  appearance: Appearance
  export: ExportOptions
}

/** What Export makes, and how */
export interface ExportOptions {
  format: "svg" | "png"
  /** PNG only: px per document px (1×, 2×) */
  scale: number
  /**
   * Strokes as filled shapes (Figma's "Outline stroke"), rather than stroked
   * paths. Always so with an edge, which goes around the shapes.
   */
  outlineStrokes: boolean
  /** On the Canvas colour, or transparent: for each format */
  svgBackground: boolean
  pngBackground: boolean
}

export const defaultDoc: Doc = {
  text: "Louisiana",
  font: "roboto",
  variations: {},
  features: {},
  kerning: true,
  size: 200,
  letterSpacing: 18,
  wordSpacing: 0,
  lineHeight: 1.25,
  align: "left",
  wrap: false,
  wrapWidth: 1000,
  seed: 3,
  offset: {
    distance: 12,
    distanceJitter: 3, // px
    angleJitter: 90, // degrees
  },
  split: {
    spacing: 80,
    fit: true,
    offset: -77,
    phase: 0,
    jitter: 5,
  },
  pieces: { rotationJitter: 3, scaleJitter: 20, gaps: 0 },
  stroke: { width: 4, widthJitter: 2, dropTails: true },
  outline: { lineCap: "butt", lineJoin: "miter", miterLimit: 4 },
  appearance: {
    color: "#ffffff",
    edge: "#020020",
    edgeWidth: 1,
    background: "#eeeeee",
  },
  export: {
    format: "svg",
    scale: 2,
    outlineStrokes: true,
    svgBackground: false,
    pngBackground: true,
  },
}
