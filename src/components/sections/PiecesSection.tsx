import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

/** Each piece turned and scaled by its own random amount, and some left out. */
export function PiecesSection({ doc, update }: { doc: Doc; update: Update }) {
  return (
    <PanelSection title="Pieces">
      <NumberInput
        label="Rotation"
        value={doc.pieces.rotationJitter ?? 0}
        min={0}
        max={180}
        unit="°"
        onChange={(v) => update("pieces", { rotationJitter: v })}
      />
      <NumberInput
        label="Scale"
        value={doc.pieces.scaleJitter ?? 0}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => update("pieces", { scaleJitter: v })}
      />
      <NumberInput
        label="Gaps"
        value={doc.pieces.gaps ?? 0}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => update("pieces", { gaps: v })}
      />
    </PanelSection>
  )
}
