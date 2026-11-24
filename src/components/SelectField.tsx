import { useId } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** A labelled choice from a few options, laid out like NumberInput. */
export function SelectField<T extends string>({
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
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value}
        onValueChange={(v) => v !== null && onChange(v as T)}
      >
        {/* named by aria-label: a label's htmlFor doesn't name this trigger */}
        <SelectTrigger id={id} aria-label={label} size="sm" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
