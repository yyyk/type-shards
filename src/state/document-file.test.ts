import { describe, expect, it } from "vitest"
import { defaultDoc, type Doc } from "./document"
import { parseDoc, serializeDoc } from "./document-file"

const file = (doc: unknown, extra: object = {}) =>
  JSON.stringify({ format: "type-shards", version: 1, doc, ...extra })

describe("serializeDoc and parseDoc", () => {
  it("round-trip a document", () => {
    const doc: Doc = {
      ...defaultDoc,
      text: "Hi\nthere",
      font: "roboto-flex",
      variations: { wght: 700, wdth: 80 },
      features: { ss01: true, liga: false },
      split: { ...defaultDoc.split, spacing: 33 },
      appearance: { ...defaultDoc.appearance, color: "#ff0000", edgeWidth: 0 },
      export: {
        format: "png",
        scale: 1,
        outlineStrokes: false,
        svgBackground: true,
        pngBackground: false,
      },
    }
    expect(parseDoc(serializeDoc(doc))).toEqual(doc)
  })

  it("fills in settings an older file doesn't have", () => {
    const doc = parseDoc(file({ text: "Old", split: { spacing: 50 } }))
    expect(doc.text).toBe("Old")
    expect(doc.split).toEqual({ ...defaultDoc.split, spacing: 50 })
    expect(doc.appearance).toEqual(defaultDoc.appearance)
  })

  it("ignores values of the wrong type, and settings it doesn't know", () => {
    const doc = parseDoc(
      file({
        size: "big",
        seed: Infinity,
        stroke: { width: null, dropTails: false },
        variations: { wght: 700, wdth: "wide" },
        features: { ss01: true, liga: 1 },
        unknown: 1,
      }),
    )
    expect(doc.size).toBe(defaultDoc.size)
    expect(doc.seed).toBe(defaultDoc.seed)
    expect(doc.stroke).toEqual({ ...defaultDoc.stroke, dropTails: false })
    expect(doc.variations).toEqual({ wght: 700 })
    expect(doc.features).toEqual({ ss01: true })
    expect("unknown" in doc).toBe(false)
  })

  it("takes hex colours only", () => {
    const doc = parseDoc(
      file({
        appearance: { color: "#00ff00", edge: "red", background: "#12" },
      }),
    )
    expect(doc.appearance.color).toBe("#00ff00")
    expect(doc.appearance.edge).toBe(defaultDoc.appearance.edge)
    expect(doc.appearance.background).toBe(defaultDoc.appearance.background)
  })

  it("takes only the known values for a setting with a few choices", () => {
    const doc = parseDoc(
      file({
        align: "sideways",
        outline: { lineCap: "round", lineJoin: "pointy" },
      }),
    )
    expect(doc.align).toBe(defaultDoc.align)
    expect(doc.outline.lineCap).toBe("round")
    expect(doc.outline.lineJoin).toBe(defaultDoc.outline.lineJoin)
  })

  it("reads a file from before fill was renamed color", () => {
    const doc = parseDoc(
      file({ appearance: { mode: "stroke", fill: "#123456", edgeWidth: 2 } }),
    )
    expect(doc.appearance).toEqual({
      ...defaultDoc.appearance,
      color: "#123456",
      edgeWidth: 2,
    })
    expect("mode" in doc.appearance).toBe(false)
  })

  it("rejects what isn't one of the app's documents", () => {
    expect(() => parseDoc("not json")).toThrow("isn't valid JSON")
    expect(() => parseDoc(JSON.stringify({ text: "x" }))).toThrow(
      "isn't a type-shards document",
    )
    expect(() => parseDoc(file([]))).toThrow("isn't a type-shards document")
    expect(() => parseDoc(file({}, { version: 99 }))).toThrow("newer version")
  })
})
