import {
  fitCamera,
  pan,
  wheelDelta,
  wheelZoomFactor,
  zoomAt,
  type Camera,
} from "@/lib/canvas/camera"
import { type Piece } from "@/lib/pipeline/split"
import type { OutlinedPiece } from "@/lib/pipeline/outline"
import type { StrokedPiece } from "@/lib/pipeline/stroke"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { piecesBounds } from "@/lib/canvas/bounds"
import { isTyping } from "@/lib/keyboard"
import type { OutlineStyle } from "@/lib/pipeline/outline"
import { drawPieces } from "@/lib/canvas/draw"
import type { Appearance } from "@/state/document"
import { useEffect, useRef, useState } from "react"

/** px on screen around the drawing when zooming to fit */
const FIT_PADDING = 40

type ZoomCommand = "in" | "out" | "actual" | "fit"

/** The zoom menu's items, in order, with their shortcuts. */
const ZOOM_ITEMS: { command: ZoomCommand; label: string; keys: string }[] = [
  { command: "in", label: "Zoom in", keys: "+" },
  { command: "out", label: "Zoom out", keys: "−" },
  { command: "actual", label: "Zoom to 100%", keys: "⇧0" },
  { command: "fit", label: "Zoom to fit", keys: "⇧1" },
]

/**
 * The camera after a zoom command: in and out by 2× and to 100% around the
 * view's centre, or fitting the pieces (unchanged when they draw nothing).
 */
function zoom(
  command: ZoomCommand,
  camera: Camera,
  view: { width: number; height: number },
  pieces: readonly (StrokedPiece | OutlinedPiece)[],
): Camera {
  const center = (factor: number) =>
    zoomAt(camera, view.width / 2, view.height / 2, factor)
  switch (command) {
    case "in":
      return center(2)
    case "out":
      return center(1 / 2)
    case "actual":
      return center(1 / camera.zoom)
    case "fit": {
      const box = piecesBounds(pieces)
      return box ? fitCamera(box, view.width, view.height, FIT_PADDING) : camera
    }
  }
}

/**
 * The pieces on a canvas that fills its parent, with a Figma-style camera:
 * scroll (two fingers) to pan, pinch or ⌘/Ctrl + wheel to zoom around the
 * pointer, Space + drag or middle-button drag to pan. Keys: Shift+0 for 100%,
 * Shift+1 to fit, + and - (with or without ⌘/Ctrl) to zoom in and out; the
 * same from the zoom level's menu, in the corner.
 */
export function GlyphCanvas({
  pieces,
  appearance,
  lineStyle,
  ghost = [],
  showGhost = false,
  debugColors = false,
  pixelSnap = true,
}: {
  /** Outlined pieces are filled and edged; stroked ones are stroked */
  pieces: (StrokedPiece | OutlinedPiece)[]
  appearance: Appearance
  /** Caps and joins for stroked pieces (outlined ones have them built in) */
  lineStyle: OutlineStyle
  /** The contours before they're moved and stroked, drawn as thin lines */
  ghost?: Piece[]
  showGhost?: boolean
  /** A colour per piece, outlines unfilled: to tell the pieces apart */
  debugColors?: boolean
  /** Snap the drawn paths to the pixel grid, so straight edges are crisp. */
  pixelSnap?: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  // until the first fit (below)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [spaceDown, setSpaceDown] = useState(false)
  // the last pointer position while dragging to pan, null when not dragging
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Start zoomed to fit, once: as soon as the canvas has a size (0 × 0 until
  // the ResizeObserver reports) and there is something to fit. Never again by
  // itself, or the view would jump at every edit. Set during render, as React
  // recommends for state that follows other state: the unfitted view is
  // never drawn.
  const [fitted, setFitted] = useState(false)
  if (!fitted && size.width > 0 && size.height > 0 && piecesBounds(pieces)) {
    setFitted(true)
    setCamera((c) => zoom("fit", c, size, pieces))
  }

  // The device pixel ratio changes when the window moves to another screen, or
  // with the browser's zoom. The drawing reads it live; this redraws when it
  // changes: a media query on the current ratio says when, and a resize too
  // (browser zoom).
  const [dpr, setDpr] = useState(() => window.devicePixelRatio)
  useEffect(() => {
    const query = window.matchMedia(`(resolution: ${dpr}dppx)`)
    const onChange = () => setDpr(window.devicePixelRatio)
    query.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    return () => {
      query.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [dpr])

  // the canvas takes the size of its box, which takes the size of the parent
  useEffect(() => {
    const box = boxRef.current
    if (!box) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // React's onWheel is passive, so it can't stop the page from zooming on a
  // pinch: listen directly instead
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) {
      return
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { dx, dy } = wheelDelta(e, canvas.clientHeight)
      if (e.ctrlKey || e.metaKey) {
        // a pinch arrives as a wheel event with ctrlKey
        const rect = canvas.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        setCamera((c) => zoomAt(c, px, py, wheelZoomFactor(dy)))
      } else {
        setCamera((c) => pan(c, -dx, -dy))
      }
    }
    canvas.addEventListener("wheel", onWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", onWheel)
  }, [])

  // Space held down turns a drag into a pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) {
        return
      }
      e.preventDefault() // don't scroll, or press a focused button
      setSpaceDown(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceDown(false)
      }
    }
    // a key released while the window isn't focused never sends keyup
    const onBlur = () => setSpaceDown(false)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [])

  // Figma's zoom shortcuts. Not while typing: Shift+0 is ")" and - is minus.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey) {
        return
      }
      let command: ZoomCommand | null = null
      // the digits by e.code: with Shift, e.key is ")" or "!", by layout
      if (e.shiftKey && e.code === "Digit0") {
        command = "actual"
      } else if (e.shiftKey && e.code === "Digit1") {
        command = "fit"
      } else if (e.key === "+" || e.key === "=") {
        command = "in"
      } else if (e.key === "-" || e.key === "_") {
        command = "out"
      }
      if (command) {
        e.preventDefault() // ⌘/Ctrl + and - would zoom the page
        setCamera((c) => zoom(command, c, size, pieces))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [pieces, size])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isPan = e.button === 1 || (e.button === 0 && spaceDown)
    if (!isPan) {
      return
    }
    e.preventDefault() // no autoscroll on a middle-button press
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const last = drag.current
    if (!last) {
      return
    }
    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    drag.current = { x: e.clientX, y: e.clientY }
    setCamera((c) => pan(c, dx, dy))
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) {
      return
    }
    // read live: `dpr` (state) is only there to redraw when it changes
    const ratio = window.devicePixelRatio
    // setting the size clears the canvas and resets the transform
    canvas.width = Math.round(size.width * ratio)
    canvas.height = Math.round(size.height * ratio)
    // drawn in device px: the paths are transformed (and snapped) by toScreen
    const view = {
      scale: ratio * camera.zoom,
      x: ratio * camera.x,
      y: ratio * camera.y,
    }
    drawPieces(ctx, pieces, view, {
      appearance,
      lineStyle,
      hairline: ratio, // 1 screen px, whatever the zoom
      pixelSnap,
      ghost: showGhost ? ghost : [],
      debugColors,
    })
  }, [
    pieces,
    appearance,
    lineStyle,
    ghost,
    showGhost,
    size,
    camera,
    dpr,
    debugColors,
    pixelSnap,
  ])

  return (
    // the canvas is out of the layout (absolute), so it never holds its box
    // open: the box can shrink with the window, and the canvas follows
    <div
      ref={boxRef}
      className="relative size-full"
      style={{ background: appearance.background }}
    >
      <canvas
        ref={ref}
        className="absolute inset-0"
        style={{
          width: size.width,
          height: size.height,
          cursor: dragging ? "grabbing" : spaceDown ? "grab" : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {/* Figma's zoom menu: the zoom level, and what it can be set to */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="absolute right-2 bottom-2 rounded-md bg-background/80 px-2 py-1 text-xs tabular-nums text-muted-foreground shadow-sm hover:text-foreground data-popup-open:text-foreground"
          aria-label="Zoom"
        >
          {Math.round(camera.zoom * 100)}%
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-44">
          {ZOOM_ITEMS.map(({ command, label, keys }) => (
            <DropdownMenuItem
              key={command}
              onClick={() => setCamera((c) => zoom(command, c, size, pieces))}
            >
              {label}
              <DropdownMenuShortcut>{keys}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
