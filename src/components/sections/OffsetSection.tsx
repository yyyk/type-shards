import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

/** How far the pieces move away from (or into) their letter. */
export function OffsetSection({ doc, update }: { doc: Doc; update: Update }) {
  return (
    <PanelSection title="Offset">
      <NumberInput
        label="Distance"
        value={doc.offset.distance}
        min={-50}
        max={50}
        unit="px"
        onChange={(v) => update("offset", { distance: v })}
      />
      <NumberInput
        label="Distance Jitter"
        value={doc.offset.distanceJitter ?? 0}
        min={0}
        max={30}
        unit="px"
        onChange={(v) => update("offset", { distanceJitter: v })}
      />
      <NumberInput
        label="Angle Jitter"
        value={doc.offset.angleJitter ?? 0}
        min={0}
        max={90}
        unit="°"
        onChange={(v) => update("offset", { angleJitter: v })}
      />
    </PanelSection>
  )
}
