import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import { SwitchField } from "@/components/SwitchField"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

/** How the contours are cut into pieces. */
export function SplitSection({ doc, update }: { doc: Doc; update: Update }) {
  return (
    <PanelSection title="Split">
      <NumberInput
        label="Spacing"
        value={doc.split.spacing}
        min={5}
        max={300}
        unit="px"
        onChange={(v) => update("split", { spacing: v })}
      />
      <SwitchField
        label="Fit"
        checked={doc.split.fit}
        onChange={(fit) => update("split", { fit })}
      />
      <NumberInput
        label="Offset"
        value={doc.split.offset ?? 0}
        min={-100}
        max={100}
        unit="px"
        onChange={(v) => update("split", { offset: v })}
      />
      <NumberInput
        label="Phase"
        value={doc.split.phase ?? 0}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update("split", { phase: v })}
      />
      <NumberInput
        label="Jitter"
        value={doc.split.jitter ?? 0}
        min={0}
        max={50}
        unit="px"
        onChange={(v) => update("split", { jitter: v })}
      />
    </PanelSection>
  )
}
