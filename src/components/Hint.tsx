import type { ReactElement, ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A tooltip on `children`, a single button (or a menu's or popover's trigger:
 * the tooltip wraps it through `render`, keeping what it does).
 */
export function Hint({
  label,
  side = "bottom",
  children,
}: {
  label: ReactNode
  side?: "top" | "bottom" | "left" | "right"
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
