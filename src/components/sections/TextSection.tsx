import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { AlignCenter, AlignLeft, AlignRight, Upload } from "lucide-react"
import { Font } from "text-shape"
import { NumberInput } from "@/components/NumberInput"
import { PanelSection } from "@/components/PanelSection"
import { SwitchField } from "@/components/SwitchField"
import { TypeDetails } from "@/components/TypeDetails"
import { Hint } from "@/components/Hint"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  BUILTIN_FONTS,
  fontName,
  instanceName,
  uniqueFontName,
  matchingInstance,
  type FontEntry,
} from "@/lib/fonts"
import type { Doc, TextAlign } from "@/state/document"

/**
 * The Text section: the text, its font (built in, or uploaded) and the
 * settings you change often. The rest is in Type details, from the header.
 */
export function TextSection({
  doc,
  setDoc,
  fonts,
  font,
  onAddFont,
  fontStatus,
}: {
  doc: Doc
  setDoc: Dispatch<SetStateAction<Doc>>
  /** The fonts loaded so far */
  fonts: readonly FontEntry[]
  /** The font in use */
  font: Font
  onAddFont: (entry: FontEntry) => void
  /** While the chosen font loads (App loads it), or why it couldn't */
  fontStatus: { loading: boolean; error: string | null }
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  // A new font starts at its own defaults: axis values and features are the
  // previous font's, and may not exist in this one.
  const switchTo = (id: string) =>
    setDoc((d) =>
      d.font === id ? d : { ...d, font: id, variations: {}, features: {} },
    )

  // a built-in font loads when chosen: App sees that it isn't loaded yet
  const chooseFont = (id: string) => {
    setError(null)
    switchTo(id)
  }

  const uploadFont = async (file: File) => {
    setError(null)
    try {
      const font = Font.fromBytes(new Uint8Array(await file.arrayBuffer()))
      const id = `upload-${crypto.randomUUID()}`
      const taken = [...BUILTIN_FONTS, ...fonts].map((f) => f.name)
      const name = uniqueFontName(fontName(font, file.name), file.name, taken)
      onAddFont({ id, name, font })
      switchTo(id)
    } catch (e) {
      setError(`Couldn't read ${file.name}: ${e}`)
    }
  }

  // the built-in fonts, loaded or not, then the uploaded ones, each by name
  const byLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label)
  const builtinItems = BUILTIN_FONTS.map((f) => ({
    value: f.id,
    label: f.name,
  })).sort(byLabel)
  const uploadedItems = fonts
    .filter((f) => !BUILTIN_FONTS.some((b) => b.id === f.id))
    .map((f) => ({ value: f.id, label: f.name }))
    .sort(byLabel)
  const fontItems = [...builtinItems, ...uploadedItems]
  const instances = font.namedInstances()
  const instance = matchingInstance(font, doc.variations)
  const presetItems = [
    { value: "-1", label: "Custom" },
    ...instances.map((inst, i) => ({
      value: String(i),
      label: instanceName(inst, i),
    })),
  ]

  return (
    <PanelSection
      title="Text"
      actions={<TypeDetails font={font} doc={doc} setDoc={setDoc} />}
    >
      <Textarea
        aria-label="Text"
        name="text"
        value={doc.text}
        onChange={(e) => setDoc((d) => ({ ...d, text: e.target.value }))}
        spellCheck={false}
        className="max-h-48"
      />
      <div className="space-y-2">
        <div className="flex gap-1">
          <Select
            items={fontItems}
            value={doc.font}
            onValueChange={(id) => id && chooseFont(id)}
          >
            <SelectTrigger
              size="sm"
              className="min-w-0 flex-1"
              aria-label="Font"
            >
              <SelectValue />
            </SelectTrigger>
            {/* as wide as the longest name (up to max-w), not just the field */}
            <SelectContent className="w-auto max-w-80 min-w-(--anchor-width)">
              {builtinItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
              {uploadedItems.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Uploaded</SelectLabel>
                    {uploadedItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
          <Hint label="Upload a font (.ttf, .otf)">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Upload font"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
            </Button>
          </Hint>
          <input
            ref={fileRef}
            type="file"
            name="font-file"
            accept=".ttf,.otf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadFont(file)
              e.target.value = "" // the same file again counts as a change
            }}
          />
        </div>
        {instances.length > 0 && (
          <Select
            items={presetItems}
            value={String(instance)}
            onValueChange={(v) => {
              const chosen = instances[Number(v)]
              if (chosen) {
                setDoc((d) => ({ ...d, variations: { ...chosen.variations } }))
              }
            }}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presetItems
                // Custom is only an item while the axes match no preset
                .filter((item) => item.value !== "-1" || instance === -1)
                .map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    disabled={item.value === "-1"}
                  >
                    {item.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {fontStatus.loading && (
          <p className="text-xs text-muted-foreground">Loading font…</p>
        )}
        {(error ?? fontStatus.error) && (
          <p className="text-xs text-destructive">
            {error ?? fontStatus.error}
          </p>
        )}
      </div>
      <NumberInput
        label="Size"
        value={doc.size}
        min={10}
        max={400}
        unit="px"
        onChange={(v) => setDoc((d) => ({ ...d, size: v }))}
      />
      <NumberInput
        label="Line Height"
        value={doc.lineHeight}
        min={0}
        max={5}
        step={0.05}
        unit="×"
        onChange={(v) => setDoc((d) => ({ ...d, lineHeight: v }))}
      />
      <NumberInput
        label="Letter Spacing"
        value={doc.letterSpacing}
        min={-50}
        max={100}
        unit="px"
        onChange={(v) => setDoc((d) => ({ ...d, letterSpacing: v }))}
      />
      <NumberInput
        label="Word Spacing"
        value={doc.wordSpacing}
        min={-100}
        max={300}
        unit="px"
        onChange={(v) => setDoc((d) => ({ ...d, wordSpacing: v }))}
      />
      <div className="flex items-center justify-between">
        <Label>Align</Label>
        <ToggleGroup
          aria-label="Align"
          variant="outline"
          size="sm"
          spacing={0}
          value={[doc.align]}
          // [] when the pressed one is clicked again: keep it pressed
          onValueChange={([align]) =>
            align && setDoc((d) => ({ ...d, align: align as TextAlign }))
          }
        >
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <SwitchField
        label="Wrap"
        checked={doc.wrap}
        onChange={(wrap) => setDoc((d) => ({ ...d, wrap }))}
      />
      {doc.wrap && (
        <NumberInput
          label="Wrap Width"
          value={doc.wrapWidth}
          min={10}
          max={10000}
          unit="px"
          onChange={(v) => setDoc((d) => ({ ...d, wrapWidth: v }))}
        />
      )}
    </PanelSection>
  )
}
