/** The view onto the canvas: screen = world * zoom + (x, y), in CSS px. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 64

/** A wheel event's delta in px, whatever unit (px, lines or pages) it came in. */
export function wheelDelta(
  e: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">,
  pageHeight: number,
): { dx: number; dy: number } {
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? pageHeight : 1
  return { dx: e.deltaX * unit, dy: e.deltaY * unit }
}

/** The camera moved by (dx, dy) screen px: the content follows the pointer. */
export function pan(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy }
}

/**
 * The camera zoomed by `factor` around the screen point (px, py): the world
 * point under it stays under it. The zoom is clamped to MIN_ZOOM..MAX_ZOOM.
 */
export function zoomAt(
  camera: Camera,
  px: number,
  py: number,
  factor: number,
): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor))
  const k = zoom / camera.zoom
  return {
    x: px - (px - camera.x) * k,
    y: py - (py - camera.y) * k,
    zoom,
  }
}

/**
 * The camera that fits `box` (world) into a view of width × height (screen
 * px), centred, with `padding` px around it. A box with no size is centred at
 * zoom 1. The zoom is clamped to MIN_ZOOM..MAX_ZOOM.
 */
export function fitCamera(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  padding: number,
): Camera {
  const boxWidth = box.maxX - box.minX
  const boxHeight = box.maxY - box.minY
  const fit = Math.min(
    boxWidth > 0 ? Math.max(1, width - 2 * padding) / boxWidth : Infinity,
    boxHeight > 0 ? Math.max(1, height - 2 * padding) / boxHeight : Infinity,
  )
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Number.isFinite(fit) ? fit : 1),
  )
  return {
    x: width / 2 - (box.minX + boxWidth / 2) * zoom,
    y: height / 2 - (box.minY + boxHeight / 2) * zoom,
    zoom,
  }
}

/**
 * The zoom factor for a pinch or ⌘/Ctrl + wheel delta (px). A trackpad pinch
 * sends many small deltas, a mouse wheel few large ones: each step is capped,
 * so one wheel notch zooms by at most about 1.65×.
 */
export function wheelZoomFactor(dy: number): number {
  return Math.exp(-Math.max(-50, Math.min(50, dy)) * 0.01)
}
