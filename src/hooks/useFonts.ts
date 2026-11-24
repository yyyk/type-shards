import { useEffect, useRef, useState } from "react"
import { loadFont, type Font } from "text-shape"
import { BUILTIN_FONTS, type FontEntry } from "@/lib/fonts"

/**
 * The fonts loaded so far: the default, then any chosen or uploaded. A
 * built-in font loads when the document uses it (chosen, opened, or undone
 * to); until then, the default stands in. `fontId` is the document's font.
 */
export function useFonts(fontId: string, defaultFont: Font) {
  const [fonts, setFonts] = useState<FontEntry[]>(() => [
    { ...BUILTIN_FONTS[0], font: defaultFont },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const requested = useRef(new Set<string>())
  const builtin = BUILTIN_FONTS.find((f) => f.id === fontId)
  const loaded = fonts.some((f) => f.id === fontId)

  useEffect(() => {
    if (!builtin || loaded || requested.current.has(builtin.id)) {
      return
    }
    requested.current.add(builtin.id)
    loadFont(builtin.url).then(
      (font) => setFonts((f) => [...f, { ...builtin, font }]),
      (e) =>
        setErrors((all) => ({
          ...all,
          [builtin.id]: `Couldn't load ${builtin.name}: ${e}`,
        })),
    )
  }, [builtin, loaded])

  return {
    fonts,
    /** The document's font, or the default while it loads */
    font: (fonts.find((f) => f.id === fontId) ?? fonts[0]).font,
    status: {
      loading: !!builtin && !loaded && !errors[builtin.id],
      error: errors[fontId] ?? null,
    },
    addFont: (entry: FontEntry) => setFonts((f) => [...f, entry]),
    /** Whether a font id can be used: built in, or uploaded this session */
    isKnown: (id: string) =>
      BUILTIN_FONTS.some((f) => f.id === id) || fonts.some((f) => f.id === id),
  }
}
