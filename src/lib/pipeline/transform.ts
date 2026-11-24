import { bounds, type PathCommand } from "vector-path-tools"
import { between, createRng, deriveSeed, RandomStream } from "./random"
import type { Piece } from "./split"

export interface PieceOptions {
  /** degrees: each piece turns by up to ± this around its centre. Default 0. */
  rotationJitter?: number
  /** %: each piece is scaled by up to ± this around its centre. Default 0. */
  scaleJitter?: number
  /** %: the share of pieces left out, picked at random. Default 0. */
  gaps?: number
}

/** The smallest a jittered scale gets, so a piece never vanishes or flips. */
export const MIN_SCALE = 0.01

/**
 * The pieces, each turned and scaled around the centre of its bounds by its
 * own random amount, and some left out (gaps). Rotation and scale come from
 * one random stream, the gaps from another: changing how much the pieces turn
 * never changes which are left out. Returns new pieces.
 */
export function transformPieces(
  pieces: readonly Piece[],
  options: PieceOptions,
  seed: number,
): Piece[] {
  const rotation = ((options.rotationJitter ?? 0) * Math.PI) / 180
  const scale = (options.scaleJitter ?? 0) / 100
  const gaps = (options.gaps ?? 0) / 100
  const result: Piece[] = []
  for (const piece of pieces) {
    const key = [piece.glyph, piece.contour, piece.index] as const
    if (gaps > 0) {
      const rng = createRng(deriveSeed(seed, RandomStream.gaps, ...key))
      if (rng() < gaps) {
        continue
      }
    }
    if (rotation === 0 && scale === 0) {
      result.push({ ...piece, commands: piece.commands.map((c) => ({ ...c })) })
      continue
    }
    const rng = createRng(deriveSeed(seed, RandomStream.transform, ...key))
    // always both draws, in this order, whichever are in use
    const angle = between(rng, -1, 1) * rotation
    const factor = Math.max(MIN_SCALE, 1 + between(rng, -1, 1) * scale)
    const b = bounds(piece.commands)
    if (!b) {
      result.push({ ...piece, commands: piece.commands.map((c) => ({ ...c })) })
      continue
    }
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    result.push({
      ...piece,
      commands: rotateScale(piece.commands, cx, cy, angle, factor),
    })
  }
  return result
}

/**
 * The commands turned by `angle` (radians) and scaled by `factor` around
 * (cx, cy). Exact for curves too: the control points are transformed with
 * the end points. Returns new commands.
 */
export function rotateScale(
  commands: readonly PathCommand[],
  cx: number,
  cy: number,
  angle: number,
  factor: number,
): PathCommand[] {
  const cos = Math.cos(angle) * factor
  const sin = Math.sin(angle) * factor
  const x = (px: number, py: number) => cx + (px - cx) * cos - (py - cy) * sin
  const y = (px: number, py: number) => cy + (px - cx) * sin + (py - cy) * cos
  return commands.map((c): PathCommand => {
    switch (c.type) {
      case "moveTo":
      case "lineTo":
        return { type: c.type, x: x(c.x, c.y), y: y(c.x, c.y) }
      case "quadTo":
        return {
          type: "quadTo",
          cx: x(c.cx, c.cy),
          cy: y(c.cx, c.cy),
          x: x(c.x, c.y),
          y: y(c.x, c.y),
        }
      case "cubicTo":
        return {
          type: "cubicTo",
          c1x: x(c.c1x, c.c1y),
          c1y: y(c.c1x, c.c1y),
          c2x: x(c.c2x, c.c2y),
          c2y: y(c.c2x, c.c2y),
          x: x(c.x, c.y),
          y: y(c.x, c.y),
        }
      case "close":
        return { type: "close" }
      default: {
        const unhandled: never = c
        throw new Error(`Unknown command: ${JSON.stringify(unhandled)}`)
      }
    }
  })
}
