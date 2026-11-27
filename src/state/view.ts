/** The panel's tabs */
export type PanelTab = "text" | "shards" | "output"

/** How the canvas shows the document: not part of it (not saved) */
export interface ViewOptions {
  /** The panel's open tab */
  tab: PanelTab
  /** The contours before they're moved and stroked, as thin lines */
  ghost: boolean
  /** A colour per piece, outlines unfilled */
  debugColors: boolean
  /** Straight edges snapped to the pixel grid */
  pixelSnap: boolean
}

export const defaultView: ViewOptions = {
  tab: "text",
  ghost: false,
  debugColors: false,
  pixelSnap: true,
}
