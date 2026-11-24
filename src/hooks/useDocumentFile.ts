import { useEffect } from "react"
import { download } from "@/lib/export/download"
import { defaultDoc, type Doc } from "@/state/document"
import { parseDoc, serializeDoc } from "@/state/document-file"
import type { SetDoc } from "./useDocument"
import type { Notify } from "./useNotice"

/**
 * Saving the document as .json (⌘S, rather than the browser's Save Page),
 * and opening one. `isKnownFont` says whether a font id is here: an uploaded
 * font is only here until a reload, so a document using one opens with the
 * default.
 */
export function useDocumentFile(
  doc: Doc,
  setDoc: SetDoc,
  isKnownFont: (id: string) => boolean,
  notify: Notify,
) {
  const save = () =>
    download("type-shards.json", serializeDoc(doc), "application/json")

  const open = async (file: File) => {
    try {
      let opened = parseDoc(await file.text())
      const known = isKnownFont(opened.font)
      if (!known) {
        opened = {
          ...opened,
          font: defaultDoc.font,
          variations: {},
          features: {},
        }
      }
      setDoc(opened, false)
      notify(
        "toolbar",
        known
          ? `Opened ${file.name}.`
          : `Opened ${file.name}. Its font was uploaded and isn't here now: upload it again.`,
        !known,
      )
    } catch (e) {
      notify(
        "toolbar",
        `Couldn't open ${file.name}: ${(e as Error).message}`,
        true,
      )
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.code === "KeyS"
      ) {
        e.preventDefault() // not the browser's Save Page
        download("type-shards.json", serializeDoc(doc), "application/json")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [doc])

  return { open, save }
}
