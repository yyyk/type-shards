/** How the canvas shows the document: not part of it (not saved) */
export interface ViewOptions {
  /** The contours before they're moved and stroked, as thin lines */
  ghost: boolean
  /** A colour per piece, outlines unfilled */
  debugColors: boolean
  /** Straight edges snapped to the pixel grid */
  pixelSnap: boolean
}

export const defaultView: ViewOptions = {
  ghost: false,
  debugColors: false,
  pixelSnap: true,
}
