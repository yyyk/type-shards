import { useEffect, useRef, type ReactNode } from "react"
import { FolderOpen, Redo2, Save, Undo2 } from "lucide-react"
import { Hint } from "./Hint"
import { Button } from "@/components/ui/button"

/** An icon button, its label shown as a tooltip and read out. */
function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Hint label={label}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </Button>
    </Hint>
  )
}

/**
 * The panel's top row: undo and redo, open and save the document (.json).
 * `notice` is a short message about the last open or save, under the row.
 * (Export is a panel section of its own.)
 */
export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpen,
  onSave,
  notice,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpen: (file: File) => void
  onSave: () => void
  notice: { text: string; error?: boolean } | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  // ⌘O / Ctrl+O opens a document, instead of the browser opening a file
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyO") {
        e.preventDefault()
        fileRef.current?.click()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex">
          <ToolButton label="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
            <Undo2 />
          </ToolButton>
          <ToolButton label="Redo (⇧⌘Z)" onClick={onRedo} disabled={!canRedo}>
            <Redo2 />
          </ToolButton>
        </div>
        <div className="flex">
          <ToolButton
            label="Open… (⌘O)"
            onClick={() => fileRef.current?.click()}
          >
            <FolderOpen />
          </ToolButton>
          <ToolButton label="Save (⌘S)" onClick={onSave}>
            <Save />
          </ToolButton>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="document-file"
          accept=".json,application/json"
          hidden
          data-testid="open-document"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onOpen(file)
            e.target.value = "" // the same file again counts as a change
          }}
        />
      </div>
      {notice && (
        <p
          role="status"
          className={
            notice.error
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {notice.text}
        </p>
      )}
    </div>
  )
}
