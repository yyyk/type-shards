import type { LineCap, LineJoin } from "stroke-outline"
import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import { SelectField } from "@/components/SelectField"
import { SwitchField } from "@/components/SwitchField"
import type { Update } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

const LINE_CAPS = [
  { value: "butt", label: "Butt" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
] as const satisfies readonly { value: LineCap; label: string }[]

const LINE_JOINS = [
  { value: "miter", label: "Miter" },
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" },
] as const satisfies readonly { value: LineJoin; label: string }[]

/** Each piece as a line: its width, tails, caps and joins. */
export function LineSection({ doc, update }: { doc: Doc; update: Update }) {
  const join = doc.outline.lineJoin ?? "miter"
  return (
    <PanelSection title="Line">
      <NumberInput
        label="Width"
        value={doc.stroke.width}
        min={0.5}
        max={30}
        step={0.5}
        unit="px"
        onChange={(v) => update("stroke", { width: v })}
      />
      <NumberInput
        label="Width Jitter"
        value={doc.stroke.widthJitter ?? 0}
        min={0}
        max={15}
        step={0.5}
        unit="px"
        onChange={(v) => update("stroke", { widthJitter: v })}
      />
      <SwitchField
        label="Drop tails"
        checked={doc.stroke.dropTails ?? false}
        onChange={(dropTails) => update("stroke", { dropTails })}
      />
      <SelectField
        label="Cap"
        value={doc.outline.lineCap ?? "butt"}
        options={LINE_CAPS}
        onChange={(lineCap) => update("outline", { lineCap })}
      />
      <SelectField
        label="Join"
        value={join}
        options={LINE_JOINS}
        onChange={(lineJoin) => update("outline", { lineJoin })}
      />
      {join === "miter" && (
        <NumberInput
          label="Miter Limit"
          value={doc.outline.miterLimit ?? 4}
          min={1}
          max={20}
          step={0.5}
          onChange={(v) => update("outline", { miterLimit: v })}
        />
      )}
    </PanelSection>
  )
}
