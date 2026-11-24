import type { Font, Variations } from "text-shape"

/** A font the app can use: built in (loaded on first use) or uploaded. */
export interface FontEntry {
  id: string
  name: string
  font: Font
}

/**
 * The fonts in public/fonts. The first is the default, loaded at start. Under
 * the site's base path (BASE_URL), which is /<repo>/ on GitHub Pages.
 */
export const BUILTIN_FONTS = [
  {
    id: "roboto",
    name: "Roboto",
    url: `${import.meta.env.BASE_URL}fonts/Roboto-Regular.ttf`,
  },
  {
    id: "roboto-flex",
    name: "Roboto Flex",
    url: `${import.meta.env.BASE_URL}fonts/RobotoFlex.ttf`,
  },
] as const

/** The font's family (and style, unless Regular) name, or `fallback`. */
export function fontName(font: Font, fallback: string): string {
  const { family_name, subfamily_name } = font.info()
  if (!family_name) return fallback
  return subfamily_name && subfamily_name !== "Regular"
    ? `${family_name} ${subfamily_name}`
    : family_name
}

/**
 * `name`, made unique among `taken` names: as it is if free, else with the
 * file name, else numbered as well ("Roboto (Roboto.ttf) 2").
 */
export function uniqueFontName(
  name: string,
  fileName: string,
  taken: readonly string[],
): string {
  const isFree = (candidate: string) => !taken.includes(candidate)
  if (isFree(name)) return name
  const withFile = name === fileName ? name : `${name} (${fileName})`
  if (isFree(withFile)) return withFile
  let n = 2
  while (!isFree(`${withFile} ${n}`)) n++
  return `${withFile} ${n}`
}

const AXIS_NAMES: Record<string, string> = {
  wght: "Weight",
  wdth: "Width",
  slnt: "Slant",
  ital: "Italic",
  opsz: "Optical Size",
  GRAD: "Grade",
  XOPQ: "Thick Stroke",
  YOPQ: "Thin Stroke",
  XTRA: "Counter Width",
  YTUC: "Cap Height",
  YTLC: "x-Height",
  YTAS: "Ascender",
  YTDE: "Descender",
  YTFI: "Figure Height",
}

/** A readable name for a variation axis tag: "Weight" for wght. */
export function axisName(tag: string): string {
  return AXIS_NAMES[tag] ?? tag
}

const FEATURE_NAMES: Record<string, string> = {
  liga: "Ligatures",
  clig: "Contextual Ligatures",
  dlig: "Discretionary Ligatures",
  hlig: "Historical Ligatures",
  calt: "Contextual Alternates",
  salt: "Stylistic Alternates",
  swsh: "Swashes",
  smcp: "Small Caps",
  c2sc: "Caps to Small Caps",
  pcap: "Petite Caps",
  case: "Case-Sensitive Forms",
  cpsp: "Capital Spacing",
  lnum: "Lining Figures",
  onum: "Old-Style Figures",
  pnum: "Proportional Figures",
  tnum: "Tabular Figures",
  zero: "Slashed Zero",
  frac: "Fractions",
  numr: "Numerators",
  dnom: "Denominators",
  sups: "Superscript",
  subs: "Subscript",
  sinf: "Scientific Inferiors",
  ordn: "Ordinals",
}

/** A readable name for a feature tag: "Stylistic Set 1" for ss01. */
export function featureName(tag: string): string {
  const set = /^ss(\d\d)$/.exec(tag)
  if (set) return `Stylistic Set ${Number(set[1])}`
  const variant = /^cv(\d\d)$/.exec(tag)
  if (variant) return `Character Variant ${Number(variant[1])}`
  return FEATURE_NAMES[tag] ?? tag
}

/**
 * Features the shaper applies for the script to come out right, not for
 * style: no switch for them. (kern has its own switch.)
 */
const REQUIRED_FEATURES = new Set([
  "abvm",
  "blwm",
  "ccmp",
  "curs",
  "dist",
  "fina",
  "init",
  "isol",
  "kern",
  "locl",
  "mark",
  "medi",
  "mkmk",
  "rlig",
  "rvrn",
  "ljmo",
  "vjmo",
  "tjmo",
])

/** The features on unless turned off. */
const ON_BY_DEFAULT = new Set(["liga", "clig", "calt"])

/** The ones letter spacing turns off, as in CSS, unless turned on. */
const OFF_WITH_LETTER_SPACING = new Set(["liga", "clig", "calt"])

/** The font's features that make sense as switches, in the font's order. */
export function switchableFeatures(font: Pick<Font, "features">): string[] {
  return font.features().filter((tag) => !REQUIRED_FEATURES.has(tag))
}

/**
 * Whether a feature is on: as set in `features`, or else by default (with
 * letter spacing, ligatures are off by default).
 */
export function isFeatureOn(
  tag: string,
  features: Readonly<Record<string, boolean>>,
  letterSpacing: number,
): boolean {
  return (
    features[tag] ??
    (ON_BY_DEFAULT.has(tag) &&
      !(letterSpacing !== 0 && OFF_WITH_LETTER_SPACING.has(tag)))
  )
}

/** The features set on or off, as text-shape's fontFeatures: "ss01", "-liga". */
export function featureSettings(
  features: Readonly<Record<string, boolean>>,
): string[] {
  return Object.entries(features).map(([tag, on]) => (on ? tag : `-${tag}`))
}

/** Every axis's value: as set in `variations`, or else the axis default. */
export function axisValues(
  font: Pick<Font, "axes">,
  variations: Readonly<Variations>,
): Variations {
  return Object.fromEntries(
    font.axes.map((a) => [a.tag, variations[a.tag] ?? a.default]),
  )
}

/** The index of the named instance the variations match, or -1 for none. */
export function matchingInstance(
  font: Pick<Font, "axes" | "namedInstances">,
  variations: Readonly<Variations>,
): number {
  const values = axisValues(font, variations)
  return font
    .namedInstances()
    .findIndex((instance) =>
      font.axes.every(
        (a) =>
          Math.abs((instance.variations[a.tag] ?? a.default) - values[a.tag]) <
          1e-6,
      ),
    )
}

/** A named instance's name, or a numbered stand-in when it has none. */
export function instanceName(
  instance: { name: string | null; postscript_name: string | null },
  index: number,
): string {
  return instance.name ?? instance.postscript_name ?? `Instance ${index + 1}`
}
