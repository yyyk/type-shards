import { use, useState } from "react"
import { GlyphCanvas } from "@/components/GlyphCanvas"
import { Toolbar } from "@/components/Toolbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { defaultView, type PanelTab, type ViewOptions } from "@/state/view"

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
  const changeView = (patch: Partial<ViewOptions>) =>
    setView((v) => ({ ...v, ...patch }))

  return (
    <div className="flex h-screen overflow-hidden">
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
      <aside className="flex w-60 shrink-0 flex-col border-l">
        <Tabs
          value={view.tab}
          onValueChange={(tab) => changeView({ tab: tab as PanelTab })}
          className="min-h-0 flex-1 gap-0"
        >
          {/* The toolbar and the tabs stay put; only a tab's settings scroll */}
          <div className="space-y-3 border-b p-4 pb-3">
            <Toolbar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onOpen={file.open}
              onSave={file.save}
              notice={noticeFor("toolbar")}
            />
            <TabsList className="w-full">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="shards">Shards</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="text" className={TAB}>
            <TextSection
              doc={doc}
              setDoc={setDoc}
              fonts={fonts.fonts}
              font={fonts.font}
              onAddFont={fonts.addFont}
              fontStatus={fonts.status}
            />
          </TabsContent>
          <TabsContent value="shards" className={TAB}>
            <RandomSection doc={doc} setDoc={setDoc} />
            <SplitSection doc={doc} update={update} />
            <OffsetSection doc={doc} update={update} />
            <PiecesSection doc={doc} update={update} />
            <LineSection doc={doc} update={update} />
            <AppearanceSection doc={doc} update={update} />
          </TabsContent>
          <TabsContent value="output" className={TAB}>
            <ViewSection
              doc={doc}
              update={update}
              view={view}
              onViewChange={changeView}
            />
            <ExportSection
              options={doc.export}
              onChange={(patch) => update("export", patch, false)}
              hasStroke={hasStroke(doc.appearance)}
              onCopy={exporter.copy}
              onDownload={exporter.download}
              notice={noticeFor("export")}
            />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  )
}

/**
 * A tab's settings: scrolling on their own, under the tabs. relative: the
 * switches' hidden checkboxes are absolutely positioned, so they must be
 * placed in the scrolling panel; placed on anything outside it, one below
 * the fold overflows the page and switching tabs scrolls the whole window.
 */
const TAB = "relative min-h-0 space-y-3 overflow-y-auto p-4"

export default App
