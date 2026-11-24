import { useId, useState } from "react"
import { NumberField } from "@base-ui/react/number-field"
import { MoveHorizontal } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"

const TYPING = new Set(["input-change", "input-paste", "input-clear"])

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

/**
 * A number field like Figma's: drag the label to scrub, type a value (Enter or
 * leaving the field commits it, Escape cancels it), or use the arrow keys:
 * ±step, ×10 with Shift, ÷10 with Alt.
 */
export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: NumberInputProps) {
  const id = useId()
  // Bumped by Escape: a new key remounts the field, which drops the typed text
  // and shows `value` again, without committing anything.
  const [resetKey, setResetKey] = useState(0)
  return (
    // Base UI puts the field's hidden input after the field, not in it: the
    // div keeps it in, so the panel's row spacing counts the field as one row
    <div>
      <NumberField.Root
        key={resetKey}
        id={id}
        // names the hidden input Base UI keeps for forms (browsers flag a field
        // with neither id nor name)
        name={label}
        value={value}
        // Live while scrubbing or stepping. Typed text only applies once it's
        // committed (and clamped), not at every keystroke: typing 120 would run
        // the pipeline at 1 and 12 first. null is an empty field: keep the value.
        onValueChange={(v, { reason }) => {
          if (v !== null && !TYPING.has(reason)) onChange(v)
        }}
        onValueCommitted={(v, { reason }) => {
          if (v !== null && reason === "input-blur") onChange(v)
        }}
        min={min}
        max={max}
        step={step}
        smallStep={step / 10}
        largeStep={step * 10}
        format={{ maximumFractionDigits: 4, useGrouping: false }}
        className="flex items-center justify-between gap-2"
      >
        <NumberField.ScrubArea className="cursor-ew-resize select-none">
          <Label htmlFor={id} className="cursor-ew-resize">
            {label}
          </Label>
          <NumberField.ScrubAreaCursor className="drop-shadow-sm">
            <MoveHorizontal className="size-4" />
          </NumberField.ScrubAreaCursor>
        </NumberField.ScrubArea>
        <NumberField.Group render={<InputGroup className="h-7 w-24" />}>
          <NumberField.Input
            render={<InputGroupInput className="h-7 text-sm tabular-nums" />}
            onKeyDown={(e) => {
              // Base UI commits typed text on blur only; Enter commits it too
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") setResetKey((k) => k + 1)
            }}
          />
          {unit && (
            <InputGroupAddon align="inline-end">
              <InputGroupText>{unit}</InputGroupText>
            </InputGroupAddon>
          )}
        </NumberField.Group>
      </NumberField.Root>
    </div>
  )
}
