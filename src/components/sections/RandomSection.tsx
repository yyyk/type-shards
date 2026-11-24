import { Dices } from "lucide-react"
import { Hint } from "@/components/Hint"
import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import { Button } from "@/components/ui/button"
import type { SetDoc } from "@/hooks/useDocument"
import type { Doc } from "@/state/document"

/** The seed range: the field's, and what Shuffle picks from */
export const MAX_SEED = 9999

/** The seed every random amount comes from, and a button to shuffle it. */
export function RandomSection({ doc, setDoc }: { doc: Doc; setDoc: SetDoc }) {
  return (
    <PanelSection title="Random">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <NumberInput
            label="Seed"
            value={doc.seed}
            min={0}
            max={MAX_SEED}
            onChange={(v) => setDoc((d) => ({ ...d, seed: v }))}
          />
        </div>
        <Hint label="Shuffle seed">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Shuffle seed"
            onClick={() =>
              setDoc(
                (d) => ({
                  ...d,
                  seed: Math.floor(Math.random() * (MAX_SEED + 1)),
                }),
                false,
              )
            }
          >
            <Dices />
          </Button>
        </Hint>
      </div>
    </PanelSection>
  )
}
