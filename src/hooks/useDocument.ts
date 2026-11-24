import { useEffect, useState, type SetStateAction } from "react"
import { isTyping } from "@/lib/keyboard"
import { defaultDoc, type Doc } from "@/state/document"
import { change, createHistory, redo, undo } from "@/state/history"

/** The document's sections that `update` patches */
export type SectionKey =
  "split" | "offset" | "pieces" | "stroke" | "outline" | "appearance" | "export"

/** Changes some of a section's settings, e.g. update("split", { spacing: 40 }) */
export type Update = <K extends SectionKey>(
  key: K,
  patch: Partial<Doc[K]>,
  merge?: boolean,
) => void

/** Changes the document; see useDocument */
export type SetDoc = (action: SetStateAction<Doc>, merge?: boolean) => void

/**
 * The document, with undo and redo (⌘Z, ⇧⌘Z / Ctrl+Y; in a text field ⌘Z is
 * the field's own). A burst of changes (scrubbing, typing) is one undo step;
 * `merge: false` makes a change a step of its own (a click, an opened file).
 */
export function useDocument() {
  const [history, setHistory] = useState(() => createHistory(defaultDoc))

  const setDoc: SetDoc = (action, merge = true) => {
    const now = performance.now()
    setHistory((h) =>
      change(
        h,
        typeof action === "function" ? action(h.present) : action,
        now,
        merge,
      ),
    )
  }
  const update: Update = (key, patch, merge) =>
    setDoc((d) => ({ ...d, [key]: { ...d[key], ...patch } }), merge)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || isTyping(e.target)) {
        return
      }
      if (e.code === "KeyZ") {
        e.preventDefault()
        setHistory((h) => (e.shiftKey ? redo(h) : undo(h)))
      } else if (e.code === "KeyY" && e.ctrlKey) {
        e.preventDefault()
        setHistory(redo)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return {
    doc: history.present,
    setDoc,
    update,
    undo: () => setHistory(undo),
    redo: () => setHistory(redo),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
