import {
  curveTangent,
  measureCurve,
  segments,
  type PathCommand,
  type Point,
  type Segment,
} from "vector-path-tools"
import { between, createRng, deriveSeed, RandomStream } from "./random"
import type { Piece } from "./split"

export interface StrokeStyle {
  /** px: the stroke width */
  width: number
  /** px: each piece's width varies by up to ±widthJitter around `width`, never below MIN_STROKE_WIDTH. Default 0. */
  widthJitter?: number
  /**
   * Drop an end segment shorter than the piece's own stroke width that turns a
   * corner: a sliver left by a cut just past a corner, which only shows as a
   * step at the join. Default false.
   */
  dropTails?: boolean
}

/** px: the thinnest a jittered stroke gets, since a stroke needs a positive width. */
export const MIN_STROKE_WIDTH = 0.1

/** A turn sharper than this (radians) between a tail and the rest of the piece is a corner. */
const TAIL_CORNER_ANGLE = Math.PI / 6

export interface StrokedPiece extends Piece {
  strokeWidth: number
}

/** Each piece with its stroke width, varied per piece when widthJitter > 0. */
export function strokePieces(
  pieces: readonly Piece[],
  style: StrokeStyle,
  seed: number,
): StrokedPiece[] {
  const result: StrokedPiece[] = []
  for (const piece of pieces) {
    const rng = createRng(
      deriveSeed(
        seed,
        RandomStream.stroke,
        piece.glyph,
        piece.contour,
        piece.index,
      ),
    )
    const strokeWidth = Math.max(
      MIN_STROKE_WIDTH,
      style.width + between(rng, -1, 1) * (style.widthJitter ?? 0),
    )
    const commands = style.dropTails
      ? dropTails(piece.commands, strokeWidth)
      : piece.commands
    result.push({ ...piece, commands, strokeWidth })
  }
  return result
}

/**
 * The piece without a tail at either end: an end segment shorter than
 * `minLength` that turns a corner from the segment next to it. Only one segment
 * is dropped at each end, and never the piece's only one. A closed piece, or
 * one with more than one subpath, is returned as it is. Returns new commands.
 */
export function dropTails(
  commands: readonly PathCommand[],
  minLength: number,
): PathCommand[] {
  const copy = () => commands.map((c) => ({ ...c }))
  const isOpenAndSingle =
    commands[0]?.type === "moveTo" &&
    commands.slice(1).every((c) => c.type !== "moveTo" && c.type !== "close")
  if (!isOpenAndSingle) return copy()

  // one segment per drawing command (segments keeps zero-length ones)
  const segs = segments(commands)
  let first = 0
  let last = segs.length - 1
  const isTail = (tail: Segment, next: Segment, tailIsFirst: boolean) =>
    measureCurve(tail).length < minLength &&
    (tailIsFirst ? turnsCorner(tail, next) : turnsCorner(next, tail))
  if (last > first && isTail(segs[last], segs[last - 1], false)) last--
  if (last > first && isTail(segs[first], segs[first + 1], true)) first++
  if (first === 0 && last === segs.length - 1) return copy()

  const start = segs[first].p0
  return [
    { type: "moveTo", x: start.x, y: start.y },
    ...commands.slice(first + 1, last + 2).map((c) => ({ ...c })),
  ]
}

/** Whether the path turns by more than TAIL_CORNER_ANGLE where `a` ends and `b` begins. */
function turnsCorner(a: Segment, b: Segment): boolean {
  const u = direction(a, false)
  const v = direction(b, true)
  if (!u || !v) return true // no direction at all: a zero-length sliver
  const angle = Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y)
  return Math.abs(angle) > TAIL_CORNER_ANGLE
}

/**
 * The direction at a segment's start or end. Where a curve's control point
 * sits on that end, the curve has no direction there, so use the nearest
 * control point that doesn't. Null for a segment that goes nowhere.
 */
function direction(s: Segment, atStart: boolean): Point | null {
  const t = curveTangent(s, atStart ? 0 : 1)
  if (t.x !== 0 || t.y !== 0) return t
  const points =
    s.type === "line"
      ? [s.p0, s.p1]
      : s.type === "quad"
        ? [s.p0, s.p1, s.p2]
        : [s.p0, s.p1, s.p2, s.p3]
  const ordered = atStart ? points : [...points].reverse()
  const from = ordered[0]
  for (const p of ordered.slice(1)) {
    const d = { x: p.x - from.x, y: p.y - from.y }
    if (d.x !== 0 || d.y !== 0) return atStart ? d : { x: -d.x, y: -d.y }
  }
  return null
}
