import { useRef, type Dispatch, type SetStateAction } from "react"
import { SlidersHorizontal } from "lucide-react"
import type { Font } from "text-shape"
import { NumberInput } from "./NumberInput"
import { SwitchField } from "./SwitchField"
import { Hint } from "./Hint"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  axisName,
  axisValues,
  featureName,
  isFeatureOn,
  switchableFeatures,
} from "@/lib/fonts"
import type { Doc } from "@/state/document"

/**
 * Figma's "Type details": the settings you set once and leave, in a popover
 * beside the panel. Axes: every variable axis of the font. Features: kerning
 * and the font's OpenType features. Both follow the font.
 */
export function TypeDetails({
  font,
  doc,
  setDoc,
}: {
  font: Font
  doc: Doc
  setDoc: Dispatch<SetStateAction<Doc>>
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const values = axisValues(font, doc.variations)
  const features = switchableFeatures(font)
  return (
    <Popover>
      <Hint label="Type details">
        <PopoverTrigger
          ref={triggerRef}
          render={
            <Button variant="ghost" size="icon-xs" aria-label="Type details" />
          }
        >
          <SlidersHorizontal />
        </PopoverTrigger>
      </Hint>
      <PopoverContent
        // beside the panel, as in Figma, rather than over it by the button
        anchor={() => triggerRef.current?.closest("aside") ?? null}
        side="left"
        align="start"
        alignOffset={8}
        sideOffset={8}
        className="max-h-[80vh] w-64 overflow-y-auto"
      >
        <PopoverHeader>
          <PopoverTitle>Type details</PopoverTitle>
        </PopoverHeader>
        <Tabs defaultValue={font.axes.length ? "axes" : "features"}>
          <TabsList className="w-full">
            <TabsTrigger value="axes" disabled={!font.axes.length}>
              Axes
            </TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>
          <TabsContent value="axes" className="space-y-3 pt-2">
            {font.axes.map((axis) => (
              <NumberInput
                key={axis.tag}
                label={axisName(axis.tag)}
                value={values[axis.tag]}
                min={axis.min}
                max={axis.max}
                step={axis.max - axis.min > 20 ? 1 : 0.1}
                onChange={(v) =>
                  setDoc((d) => ({
                    ...d,
                    variations: { ...d.variations, [axis.tag]: v },
                  }))
                }
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!Object.keys(doc.variations).length}
              onClick={() => setDoc((d) => ({ ...d, variations: {} }))}
            >
              Reset axes
            </Button>
          </TabsContent>
          <TabsContent value="features" className="space-y-3 pt-2">
            <SwitchField
              label="Kerning"
              checked={doc.kerning}
              onChange={(kerning) => setDoc((d) => ({ ...d, kerning }))}
            />
            {features.map((tag) => (
              <SwitchField
                key={tag}
                label={featureName(tag)}
                checked={isFeatureOn(tag, doc.features, doc.letterSpacing)}
                onChange={(on) =>
                  setDoc((d) => ({
                    ...d,
                    features: { ...d.features, [tag]: on },
                  }))
                }
              />
            ))}
            {!features.length && (
              <p className="text-xs text-muted-foreground">
                This font has no optional OpenType features.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
