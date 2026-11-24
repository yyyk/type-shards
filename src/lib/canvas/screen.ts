import type { PathCommand } from "vector-path-tools"

/** World to device px: device = world * scale + (x, y). */
export interface ScreenTransform {
  scale: number
  x: number
  y: number
}

/**
 * Where a line `width` device px wide is crisp: centred on a pixel's centre
 * (0.5) when it covers an odd number of pixels, on a pixel edge (0) when even.
 */
export function snapOffset(width: number): number {
  return Math.max(1, Math.round(width)) % 2 === 1 ? 0.5 : 0
}

/**
 * The commands in device px. With `offset` (see snapOffset), every end point
 * is moved to the nearest grid point at that offset, so straight horizontal and
 * vertical edges come out crisp; a curve's control points move by the same
 * amount as the end point next to them (a quad's one by the average of its
 * two), so tangents keep their directions. A point moves by at most half a
 * pixel each way. Without `offset` (null), the points are only transformed.
 * For display only: returns new commands.
 */
export function toScreen(
  commands: readonly PathCommand[],
  t: ScreenTransform,
  offset: number | null,
): PathCommand[] {
  const snap = (v: number) =>
    offset === null ? v : Math.round(v - offset) + offset
  // how far the current point and the subpath's start moved when snapped
  let moved = { x: 0, y: 0 }
  let startMoved = moved
  // the end point in device px, snapped, and how far snapping moved it
  const end = (x: number, y: number) => {
    const sx = x * t.scale + t.x
    const sy = y * t.scale + t.y
    const p = { x: snap(sx), y: snap(sy) }
    return { p, d: { x: p.x - sx, y: p.y - sy } }
  }
  // a control point in device px, moved by d
  const control = (x: number, y: number, d: { x: number; y: number }) => ({
    x: x * t.scale + t.x + d.x,
    y: y * t.scale + t.y + d.y,
  })

  const result: PathCommand[] = []
  for (const c of commands) {
    switch (c.type) {
      case "moveTo": {
        const { p, d } = end(c.x, c.y)
        result.push({ type: "moveTo", ...p })
        moved = startMoved = d
        break
      }
      case "lineTo": {
        const { p, d } = end(c.x, c.y)
        result.push({ type: "lineTo", ...p })
        moved = d
        break
      }
      case "quadTo": {
        const { p, d } = end(c.x, c.y)
        const average = { x: (moved.x + d.x) / 2, y: (moved.y + d.y) / 2 }
        const cp = control(c.cx, c.cy, average)
        result.push({ type: "quadTo", cx: cp.x, cy: cp.y, ...p })
        moved = d
        break
      }
      case "cubicTo": {
        const { p, d } = end(c.x, c.y)
        const c1 = control(c.c1x, c.c1y, moved)
        const c2 = control(c.c2x, c.c2y, d)
        result.push({
          type: "cubicTo",
          c1x: c1.x,
          c1y: c1.y,
          c2x: c2.x,
          c2y: c2.y,
          ...p,
        })
        moved = d
        break
      }
      case "close":
        result.push({ type: "close" })
        moved = startMoved // back at the subpath's start
        break
      default: {
        const unhandled: never = c
        throw new Error(`Unknown command: ${JSON.stringify(unhandled)}`)
      }
    }
  }
  return result
}
