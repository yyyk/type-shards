import { booleanOp, BooleanOpError, type PathCommand } from "vector-path-tools"

/**
 * The path's fill as simple, closed contours, with no overlaps. If booleanOp
 * can't give a trustworthy result, returns a copy of the input instead: it
 * fills the same, only its overlaps stay.
 */
export function removeOverlaps(
  commands: readonly PathCommand[],
): PathCommand[] {
  try {
    return booleanOp(commands, [], "union")
  } catch (e) {
    if (!(e instanceof BooleanOpError)) {
      throw e
    }
    console.warn("removeOverlaps: kept the overlaps:", e.message)
    return commands.map((c) => ({ ...c }))
  }
}
