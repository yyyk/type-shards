import { ColorField } from "@/components/ColorField"
import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

/**
 * The pieces' colours, as Figma names them for an outlined stroke: Fill, and
 * a Stroke around it (saved as color, edge, edgeWidth).
 */
export function AppearanceSection({
  doc,
  update,
}: {
  doc: Doc
  update: Update
}) {
  return (
    <PanelSection title="Appearance">
      <ColorField
        label="Fill"
        value={doc.appearance.color}
        onChange={(color) => update("appearance", { color })}
      />
      <ColorField
        label="Stroke"
        value={doc.appearance.edge}
        onChange={(edge) => update("appearance", { edge })}
      />
      <NumberInput
        label="Stroke Width"
        value={doc.appearance.edgeWidth}
        min={0}
        max={20}
        step={0.5}
        unit="px"
        onChange={(v) => update("appearance", { edgeWidth: v })}
      />
    </PanelSection>
  )
}
