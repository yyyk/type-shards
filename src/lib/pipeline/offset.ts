import { area, measure, subpaths, type PathCommand } from "vector-path-tools"
import type { Piece } from "./split"
import { placeOutline } from "./glyphs"
import { between, createRng, deriveSeed, RandomStream } from "./random"

export interface OffsetOptions {
  /** px: how far each piece moves. Positive moves away from the ink, negative into it. */
  distance: number
  /** px: each piece's distance varies by up to ±distanceJitter around `distance`, so it can cross to the other side. Default 0. */
  distanceJitter?: number
  /** Degrees: each piece's direction tilts by up to ±angleJitter from the normal, at most 90. Default 0. */
  angleJitter?: number
}

export function inkSide(glyphCommands: readonly PathCommand[]): 1 | -1 {
  let biggestArea = 0
  for (const subpath of subpaths(glyphCommands)) {
    const v = area(subpath)
    if (Math.abs(v) > Math.abs(biggestArea)) {
      biggestArea = v
    }
  }
  return biggestArea >= 0 ? 1 : -1
}

/** Every piece moved along its midpoint normal, each by its own distance when distanceJitter > 0. */
export function offsetPieces(
  pieces: readonly Piece[],
  sides: ReadonlyMap<number, 1 | -1>,
  options: OffsetOptions,
  seed: number,
): Piece[] {
  return pieces.map((piece) => {
    const rng = createRng(
      deriveSeed(
        seed,
        RandomStream.offset,
        piece.glyph,
        piece.contour,
        piece.index,
      ),
    )
    const distanceRoll = between(rng, -1, 1) // always drawn first
    const distance =
      options.distance + distanceRoll * (options.distanceJitter ?? 0)
    const angleRoll = between(rng, -1, 1)
    // beyond 90°, a piece would move back towards the other side
    const angle =
      (angleRoll * Math.min(options.angleJitter ?? 0, 90) * Math.PI) / 180
    const side = sides.get(piece.glyph) ?? 1
    return { ...piece, commands: offsetPiece(piece, side, distance, angle) }
  })
}

/**
 * The piece moved as a whole along the normal at its midpoint tilted
 * by angle (radians) from the normal, `distance` away
 * from the ink (into it when negative). `side` is the glyph's inkSide.
 */
export function offsetPiece(
  piece: Piece,
  side: -1 | 1,
  distance: number,
  angle: number = 0,
): PathCommand[] {
  // +d is to the right of travel; the ink is on the right when side is 1
  return translatePiece(piece.commands, -distance * side, angle)
}

function translatePiece(
  commands: readonly PathCommand[],
  distance: number,
  angle: number,
): PathCommand[] {
  const m = measure(commands)
  const mid = m.length / 2
  const delta = m.length * 1e-6
  const a = m.pointAtLength(mid - delta)
  const b = m.pointAtLength(mid + delta)
  if (!a || !b) {
    // no length, so no direction to move along: kept as it is (with round caps "M p Z" still draws a dot)
    return placeOutline(commands, 0, 0, 1)
  }
  // add the two unit vectors (cos, sin) and use the angle of the sum, so a
  // midpoint on a corner uses the average of both directions
  const offsetAngle = Math.atan2(
    Math.sin(a.angle) + Math.sin(b.angle),
    Math.cos(a.angle) + Math.cos(b.angle),
  )
  const normal = {
    x: -Math.sin(offsetAngle + angle),
    y: Math.cos(offsetAngle + angle),
  }
  return placeOutline(commands, normal.x * distance, normal.y * distance, 1)
}
