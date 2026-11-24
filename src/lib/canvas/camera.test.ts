import { describe, expect, it } from "vitest"
import {
  fitCamera,
  MAX_ZOOM,
  MIN_ZOOM,
  pan,
  wheelDelta,
  wheelZoomFactor,
  zoomAt,
  type Camera,
} from "./camera"

const toScreen = (c: Camera, x: number, y: number) => ({
  x: x * c.zoom + c.x,
  y: y * c.zoom + c.y,
})

describe("zoomAt", () => {
  it("keeps the world point under the pointer in place", () => {
    const camera = { x: 100, y: 50, zoom: 1.5 }
    const zoomed = zoomAt(camera, 300, 200, 2)
    expect(zoomed.zoom).toBe(3)
    // the world point at screen (300, 200) before
    const world = { x: (300 - 100) / 1.5, y: (200 - 50) / 1.5 }
    const after = toScreen(zoomed, world.x, world.y)
    expect(after.x).toBeCloseTo(300)
    expect(after.y).toBeCloseTo(200)
  })

  it("clamps the zoom, and keeps the pointer's point in place there too", () => {
    const camera = { x: 0, y: 0, zoom: 1 }
    const inZoomed = zoomAt(camera, 40, 40, 1000)
    expect(inZoomed.zoom).toBe(MAX_ZOOM)
    expect(toScreen(inZoomed, 40, 40).x).toBeCloseTo(40)
    expect(zoomAt(camera, 0, 0, 1e-6).zoom).toBe(MIN_ZOOM)
  })

  it("doesn't move the camera when the zoom is already at its limit", () => {
    const camera = { x: 10, y: 20, zoom: MAX_ZOOM }
    expect(zoomAt(camera, 500, 300, 2)).toEqual(camera)
  })
})

describe("pan", () => {
  it("moves the camera by the screen delta", () => {
    expect(pan({ x: 10, y: 20, zoom: 3 }, 5, -7)).toEqual({
      x: 15,
      y: 13,
      zoom: 3,
    })
  })
})

describe("wheelDelta", () => {
  it("converts lines and pages to px", () => {
    expect(wheelDelta({ deltaX: 1, deltaY: 2, deltaMode: 0 }, 800)).toEqual({
      dx: 1,
      dy: 2,
    })
    expect(wheelDelta({ deltaX: 1, deltaY: 2, deltaMode: 1 }, 800)).toEqual({
      dx: 16,
      dy: 32,
    })
    expect(wheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 800)).toEqual({
      dx: 0,
      dy: 800,
    })
  })
})

describe("fitCamera", () => {
  const box = { minX: 100, minY: 50, maxX: 300, maxY: 100 } // 200 × 50

  it("fits the box's wider side into the view, inside the padding", () => {
    // 800 - 2 × 100 = 600 px across for 200 wide: 3×; 400 - 200 = 200 px
    // down for 50 high would allow 4×
    const camera = fitCamera(box, 800, 400, 100)
    expect(camera.zoom).toBe(3)
    const topLeft = toScreen(camera, box.minX, box.minY)
    const bottomRight = toScreen(camera, box.maxX, box.maxY)
    expect(topLeft.x).toBeCloseTo(100)
    expect(bottomRight.x).toBeCloseTo(700)
    // centred vertically: 150 px tall in 400
    expect(topLeft.y).toBeCloseTo(125)
    expect(bottomRight.y).toBeCloseTo(275)
  })

  it("centres a box with no size at zoom 1", () => {
    const camera = fitCamera(
      { minX: 10, minY: 20, maxX: 10, maxY: 20 },
      800,
      400,
      40,
    )
    expect(camera).toEqual({ x: 390, y: 180, zoom: 1 })
  })

  it("fits a line with no height by its width", () => {
    const camera = fitCamera(
      { minX: 0, minY: 0, maxX: 100, maxY: 0 },
      800,
      400,
      0,
    )
    expect(camera.zoom).toBe(8)
  })

  it("clamps the zoom", () => {
    const tiny = { minX: 0, minY: 0, maxX: 1e-6, maxY: 1e-6 }
    expect(fitCamera(tiny, 800, 400, 0).zoom).toBe(MAX_ZOOM)
    const huge = { minX: 0, minY: 0, maxX: 1e9, maxY: 1e9 }
    expect(fitCamera(huge, 800, 400, 0).zoom).toBe(MIN_ZOOM)
  })

  it("still fits when the padding is larger than the view", () => {
    expect(fitCamera(box, 100, 100, 80).zoom).toBeGreaterThan(0)
  })
})

describe("wheelZoomFactor", () => {
  it("zooms in for a negative delta and out for a positive one", () => {
    expect(wheelZoomFactor(-10)).toBeGreaterThan(1)
    expect(wheelZoomFactor(10)).toBeLessThan(1)
    expect(wheelZoomFactor(0)).toBe(1)
  })

  it("undoes itself: in and out by the same delta cancel", () => {
    expect(wheelZoomFactor(-7) * wheelZoomFactor(7)).toBeCloseTo(1)
  })

  it("caps a mouse wheel notch", () => {
    expect(wheelZoomFactor(-100)).toBe(wheelZoomFactor(-50))
    expect(wheelZoomFactor(100)).toBe(wheelZoomFactor(50))
  })
})
