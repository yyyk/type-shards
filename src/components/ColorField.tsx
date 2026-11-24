import { useId } from "react"
import { Label } from "@/components/ui/label"

/**
 * A labelled colour: a swatch that opens the system colour picker, and the
 * colour's hex value. Works in hex (#rrggbb), which is what the picker gives.
 */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <label className="flex h-7 w-24 cursor-pointer items-center gap-2 rounded-lg border border-input px-1.5 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-4 shrink-0 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-black/10 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <span className="text-sm tabular-nums">{value.toUpperCase()}</span>
      </label>
    </div>
  )
}
