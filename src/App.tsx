import { use, useState } from "react"
import { GlyphCanvas } from "@/components/GlyphCanvas"
import { Toolbar } from "@/components/Toolbar"
import { AppearanceSection } from "@/components/sections/AppearanceSection"
import { ExportSection } from "@/components/sections/ExportSection"
import { LineSection } from "@/components/sections/LineSection"
import { OffsetSection } from "@/components/sections/OffsetSection"
import { PiecesSection } from "@/components/sections/PiecesSection"
import { RandomSection } from "@/components/sections/RandomSection"
import { SplitSection } from "@/components/sections/SplitSection"
import { TextSection } from "@/components/sections/TextSection"
import { ViewSection } from "@/components/sections/ViewSection"
import { useDocument } from "@/hooks/useDocument"
import { useDocumentFile } from "@/hooks/useDocumentFile"
import { useExport } from "@/hooks/useExport"
import { useFonts } from "@/hooks/useFonts"
import { useNotice } from "@/hooks/useNotice"
import { usePipeline } from "@/hooks/usePipeline"
import { engines } from "@/lib/engines"
import { hasStroke } from "@/lib/pipeline"
import { defaultView } from "@/state/view"

/**
 * The app: the canvas, and the panel beside it. The state and the work live
 * in hooks (src/hooks) and the panel's sections in src/components/sections;
 * this only connects them.
 */
function App() {
  const { font: defaultFont, stroke } = use(engines)
  const { doc, setDoc, update, undo, redo, canUndo, canRedo } = useDocument()
  const [view, setView] = useState(defaultView)
  const { notify, noticeFor } = useNotice()
  const fonts = useFonts(doc.font, defaultFont)
  const built = usePipeline(doc, fonts.font, stroke)
  const exporter = useExport(doc, built, stroke, notify)
  const file = useDocumentFile(doc, setDoc, fonts.isKnown, notify)

  return (
    <div className="flex h-screen">
      <main className="min-w-0 flex-1 overflow-hidden">
        <GlyphCanvas
          pieces={built.outlined ?? built.stroked}
          appearance={doc.appearance}
          lineStyle={doc.outline}
          ghost={built.split}
          showGhost={view.ghost}
          debugColors={view.debugColors}
          pixelSnap={view.pixelSnap}
        />
      </main>
      {/* relative: the switches' hidden checkboxes are absolutely positioned;
          without it they'd be placed on the page and make it scroll */}
      <aside className="relative w-60 shrink-0 space-y-3 overflow-y-auto border-l p-4">
        <Toolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onOpen={file.open}
          onSave={file.save}
          notice={noticeFor("toolbar")}
        />
        <TextSection
          doc={doc}
          setDoc={setDoc}
          fonts={fonts.fonts}
          font={fonts.font}
          onAddFont={fonts.addFont}
          fontStatus={fonts.status}
        />
        <RandomSection doc={doc} setDoc={setDoc} />
        <SplitSection doc={doc} update={update} />
        <OffsetSection doc={doc} update={update} />
        <PiecesSection doc={doc} update={update} />
        <LineSection doc={doc} update={update} />
        <AppearanceSection doc={doc} update={update} />
        <ViewSection
          doc={doc}
          update={update}
          view={view}
          onViewChange={(patch) => setView((v) => ({ ...v, ...patch }))}
        />
        <ExportSection
          options={doc.export}
          onChange={(patch) => update("export", patch, false)}
          hasStroke={hasStroke(doc.appearance)}
          onCopy={exporter.copy}
          onDownload={exporter.download}
          notice={noticeFor("export")}
        />
      </aside>
    </div>
  )
}

export default App
