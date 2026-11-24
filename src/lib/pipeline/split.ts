import {
  measure,
  splitPath,
  subpaths,
  type PathCommand,
} from "vector-path-tools"
import type { GlyphOutline } from "./glyphs"
import {
  between,
  createRng,
  deriveSeed,
  RandomStream,
  type Rng,
} from "./random"

export interface SplitOptions {
  /** px: target distance between cuts */
  spacing: number
  /**
   * true: adjust the spacing so the contour divides evenly. false: keep the
   * spacing exactly, and leave whatever is left over to one shorter piece.
   */
  fit: boolean
  /** Moves every cut this far along the contour (px). Can be negative. */
  offset?: number
  /** 0…1: moves every cut by this fraction of its contour's step. Going from 0 to 1 returns every contour to its start, for seamless loops. */
  phase?: number
  /**
   * px: each cut moves randomly by up to ±jitter along the contour, but never
   * more than half a step, so neighbouring cuts can't cross. Default 0.
   */
  jitter?: number
}

export const MAX_CUTS = 10_000

/** Cut distances along a closed contour: sorted, each in [0, length). */
export function cutPositions(
  length: number,
  options: SplitOptions,
  rng: Rng,
): number[] {
  if (!(options.spacing > 0)) {
    throw new RangeError(`spacing must be positive (got ${options.spacing})`)
  }
  const n = options.fit
    ? Math.max(1, Math.round(length / options.spacing))
    : // a cut at every multiple of the spacing that fits on the contour; the
      // small allowance stops rounding (100 / 25 = 4.0000000001) adding a cut
      Math.ceil(length / options.spacing - 1e-9)
  if (n > MAX_CUTS) {
    throw new RangeError(`too many cuts: ${n} (max ${MAX_CUTS})`)
  }
  if (!(length > 0) || n <= 1) {
    return []
  }
  const result: number[] = []
  const stepSize = options.fit ? length / n : options.spacing
  for (let i = 0; i < n; i++) {
    let d =
      (options.offset ?? 0) +
      (i + (options.phase ?? 0)) * stepSize +
      between(rng, -1, 1) * Math.min(options.jitter ?? 0, stepSize / 2)
    // into [0, length), leaving values already in range exact
    d %= length
    if (d < 0) d += length
    if (d >= length) d = 0 // a tiny negative value, rounded up to length
    result.push(d)
  }
  result.sort((a, b) => a - b)
  return result
}

export interface Piece {
  glyph: number // the glyph's index (GlyphOutline.index)
  contour: number // which contour of that glyph
  index: number // position along that contour: 0, 1, 2…
  commands: PathCommand[]
}

export function splitGlyph(
  glyph: GlyphOutline,
  options: SplitOptions,
  seed: number,
): Piece[] {
  const result: Piece[] = []
  const contours = subpaths(glyph.commands)
  for (const [contourIndex, contour] of contours.entries()) {
    const length = measure(contour).length
    const rng = createRng(
      deriveSeed(seed, RandomStream.cuts, glyph.index, contourIndex),
    )
    const cuts = cutPositions(length, options, rng)
    const pieces = splitPath(contour, cuts)
    for (const [pieceIndex, piece] of pieces.entries()) {
      result.push({
        glyph: glyph.index,
        contour: contourIndex,
        index: pieceIndex,
        commands: piece,
      })
    }
  }
  return result
}
