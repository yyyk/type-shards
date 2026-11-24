import { init, type StrokeOutline } from "stroke-outline"
import strokeWasmUrl from "stroke-outline/stroke_outline.wasm?url"
import { type Font, initText, loadFont } from "text-shape"
import textWasmUrl from "text-shape/text_shape_bg.wasm?url"
import { BUILTIN_FONTS } from "./fonts"

export interface Engines {
  stroke: StrokeOutline
  /** The default font, BUILTIN_FONTS[0]; the others load when chosen */
  font: Font
}

async function loadEngines(): Promise<Engines> {
  initText(textWasmUrl)
  const stroke = await init(strokeWasmUrl)
  const font = await loadFont(BUILTIN_FONTS[0].url)
  return { stroke, font }
}

export const engines = loadEngines()
