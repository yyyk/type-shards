import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SwitchFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** A short line under the label: what the setting does, or why it's fixed */
  hint?: string
}

export function SwitchField({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: SwitchFieldProps) {
  // links the label to the switch: clicking it toggles, and names the switch
  const id = useId()
  return (
    // min-h-7: as tall as the panel's other rows (fields are h-7), so the
    // gaps between rows look even
    <div className="flex min-h-7 items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        {hint && (
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onCheckedChange={(c) => onChange(c)}
      />
    </div>
  )
}
