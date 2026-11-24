import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/**
 * A panel section that collapses: its title toggles it, `actions` (buttons)
 * sit at the right of the title. Separated from the section above by a line.
 */
export function PanelSection({
  title,
  actions,
  defaultOpen = true,
  children,
}: {
  title: string
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="border-t pt-3 first:border-t-0 first:pt-0"
    >
      <div className="flex h-7 items-center justify-between gap-2">
        <CollapsibleTrigger className="group flex flex-1 items-center gap-1 text-left text-sm font-medium outline-none focus-visible:underline">
          <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
          {title}
        </CollapsibleTrigger>
        {actions}
      </div>
      <CollapsibleContent className="space-y-3 pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
