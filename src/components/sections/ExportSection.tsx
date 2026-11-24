import { Copy, Download } from "lucide-react"
import { PanelSection } from "@/components/PanelSection"
import { SwitchField } from "@/components/SwitchField"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ExportOptions } from "@/state/document"

/** Two or three choices side by side, labelled, as the panel's other rows. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <ToggleGroup
        aria-label={label}
        variant="outline"
        size="sm"
        spacing={0}
        value={[value]}
        // [] when the pressed one is clicked again: keep it pressed
        onValueChange={([v]) => v && onChange(v as T)}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="px-2.5 text-xs"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

const FORMATS = [
  { value: "svg", label: "SVG" },
  { value: "png", label: "PNG" },
] as const

const SCALES = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
] as const

/**
 * Like Figma's Export section: the format, its settings (only the chosen
 * format's), then Copy (to paste, e.g. into Figma) or Download. `notice` is a
 * short message about the last copy or download.
 */
export function ExportSection({
  options,
  onChange,
  hasStroke,
  onCopy,
  onDownload,
  notice,
}: {
  options: ExportOptions
  onChange: (patch: Partial<ExportOptions>) => void
  /** With a stroke (Appearance), strokes are always outlined: it goes around them */
  hasStroke: boolean
  onCopy: () => void
  onDownload: () => void
  notice: { text: string; error?: boolean } | null
}) {
  const isSvg = options.format === "svg"
  const background = isSvg ? options.svgBackground : options.pngBackground
  return (
    <PanelSection title="Export">
      <Choice
        label="Format"
        value={options.format}
        options={FORMATS}
        onChange={(format) => onChange({ format })}
      />
      {/* The format's own setting, in a row of fixed height: Outline strokes
          has a hint line and Scale doesn't, so the rows below would move
          when the format changes. */}
      <div className="flex h-9 flex-col justify-center">
        {isSvg ? (
          <SwitchField
            label="Outline strokes"
            checked={options.outlineStrokes || hasStroke}
            disabled={hasStroke}
            hint={
              hasStroke
                ? "Always on with a stroke"
                : options.outlineStrokes
                  ? "Filled shapes"
                  : "Lines you can edit"
            }
            onChange={(outlineStrokes) => onChange({ outlineStrokes })}
          />
        ) : (
          <Choice
            label="Scale"
            value={String(options.scale) === "1" ? "1" : "2"}
            options={SCALES}
            onChange={(scale) => onChange({ scale: Number(scale) })}
          />
        )}
      </div>
      {/* each format keeps its own: SVG off (clean to paste), PNG on */}
      <SwitchField
        label="Background"
        checked={background}
        hint={background ? "The Canvas colour" : "Transparent"}
        onChange={(on) =>
          onChange(isSvg ? { svgBackground: on } : { pngBackground: on })
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy />
          Copy
        </Button>
        <Button size="sm" onClick={onDownload}>
          <Download />
          Download
        </Button>
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
    </PanelSection>
  )
}
