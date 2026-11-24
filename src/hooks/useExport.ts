import type { StrokeOutline } from "stroke-outline"
import { download } from "@/lib/export/download"
import { piecesToPng } from "@/lib/export/png"
import { piecesToSvg } from "@/lib/export/svg"
import { outlinePieces } from "@/lib/pipeline/outline"
import type { Built } from "@/lib/pipeline"
import type { Doc } from "@/state/document"
import type { Notify } from "./useNotice"

/**
 * Export, as the document's export settings say: copy or download, SVG or
 * PNG. The SVG has outlines with a stroke, or when asked for ("Outline
 * strokes"): built for it then, if they aren't already. The PNG is drawn as
 * the canvas is, pixel snapping included; its lines as they are (outlining
 * them changes nothing in pixels).
 */
export function useExport(
  doc: Doc,
  { stroked, outlined }: Built,
  stroke: StrokeOutline,
  notify: Notify,
) {
  const drawn = outlined ?? stroked
  const isSvg = doc.export.format === "svg"
  const background = (on: boolean) => (on ? doc.appearance.background : null)

  const svg = () =>
    piecesToSvg(
      outlined ??
        (doc.export.outlineStrokes
          ? outlinePieces(stroked, stroke, doc.outline)
          : stroked),
      doc.appearance,
      doc.outline,
      background(doc.export.svgBackground),
    )
  const png = () =>
    piecesToPng(
      drawn,
      doc.appearance,
      doc.outline,
      doc.export.scale,
      background(doc.export.pngBackground),
    )

  const copy = async () => {
    const text = isSvg ? svg() : null
    if (isSvg ? !text : !drawn.length) {
      notify("export", "Nothing to copy.", true)
      return
    }
    try {
      if (text) {
        await navigator.clipboard.writeText(text)
      } else {
        // the PNG as a promise, as Safari needs: the copy has to start
        // straight from the click, before the PNG is made
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png() }),
        ])
      }
      notify("export", `Copied as ${isSvg ? "SVG" : "PNG"}.`)
    } catch (e) {
      notify("export", `Couldn't copy: ${(e as Error).message}`, true)
    }
  }

  const save = async () => {
    const text = isSvg ? svg() : null
    if (isSvg ? !text : !drawn.length) {
      notify("export", "Nothing to download.", true)
      return
    }
    if (text) {
      download("type-shards.svg", text, "image/svg+xml")
      return
    }
    try {
      download(`type-shards@${doc.export.scale}x.png`, await png())
    } catch (e) {
      notify("export", `Couldn't make the PNG: ${(e as Error).message}`, true)
    }
  }

  return { copy, download: save }
}
