import type { PathCommand } from "vector-path-tools"

/**
 * The commands as SVG path data. With `digits`, numbers are rounded to that
 * many decimals (for export; full precision otherwise).
 */
export function toSvgPath(
  commands: readonly PathCommand[],
  digits?: number,
): string {
  const n = (v: number) => (digits === undefined ? v : round(v, digits))
  let result: string[] = []
  for (const command of commands) {
    switch (command.type) {
      case "moveTo":
        result.push(`M ${n(command.x)} ${n(command.y)}`)
        break
      case "lineTo":
        result.push(`L ${n(command.x)} ${n(command.y)}`)
        break
      case "quadTo":
        result.push(
          `Q ${n(command.cx)} ${n(command.cy)} ${n(command.x)} ${n(command.y)}`,
        )
        break
      case "cubicTo":
        result.push(
          `C ${n(command.c1x)} ${n(command.c1y)} ${n(command.c2x)} ${n(command.c2y)} ${n(command.x)} ${n(command.y)}`,
        )
        break
      case "close":
        result.push("Z")
        break
      default: {
        const unhandled: never = command
        throw new Error(`Unknown command: ${JSON.stringify(unhandled)}`)
      }
    }
  }
  return result.join(" ")
}

/** `v` rounded to `digits` decimals, without a negative zero. */
function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f + 0
}
