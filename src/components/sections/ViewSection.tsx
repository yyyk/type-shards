import { ColorField } from "@/components/ColorField"
import { PanelSection } from "@/components/PanelSection"
import { SwitchField } from "@/components/SwitchField"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"
import type { ViewOptions } from "@/state/view"

/**
 * How the canvas shows the work: its colour (saved with the document, but
 * not in the SVG) and the view switches.
 */
export function ViewSection({
  doc,
  update,
  view,
  onViewChange,
}: {
  doc: Doc
  update: Update
  view: ViewOptions
  onViewChange: (patch: Partial<ViewOptions>) => void
}) {
  return (
    <PanelSection title="View">
      <ColorField
        label="Canvas"
        value={doc.appearance.background}
        onChange={(background) => update("appearance", { background })}
      />
      <SwitchField
        label="Original contours"
        checked={view.ghost}
        onChange={(ghost) => onViewChange({ ghost })}
      />
      <SwitchField
        label="Piece colours"
        checked={view.debugColors}
        onChange={(debugColors) => onViewChange({ debugColors })}
      />
      <SwitchField
        label="Pixel snap"
        checked={view.pixelSnap}
        onChange={(pixelSnap) => onViewChange({ pixelSnap })}
      />
    </PanelSection>
  )
}
