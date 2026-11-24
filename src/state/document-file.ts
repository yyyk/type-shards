import { defaultDoc, type Doc } from "./document"

/** Identifies the app's files; the version is for changes that need a migration. */
const FORMAT = "type-shards"
const VERSION = 1

/** The document as the text of a .json file. */
export function serializeDoc(doc: Doc): string {
  return (
    JSON.stringify({ format: FORMAT, version: VERSION, doc }, null, 2) + "\n"
  )
}

/**
 * The document in a .json file's text. Settings it doesn't have (an older
 * file) are the defaults; values of the wrong type are ignored, as are colours
 * that aren't hex (#rrggbb). Throws for text that isn't one of the app's files.
 */
export function parseDoc(text: string): Doc {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }
  if (!isRecord(data) || data.format !== FORMAT || !isRecord(data.doc)) {
    throw new Error("This file isn't a type-shards document.")
  }
  if (typeof data.version !== "number" || data.version > VERSION) {
    throw new Error("This document is from a newer version of the app.")
  }
  return merge(defaultDoc, renamed(data.doc))
}

/** A document from before a setting was renamed, with the new names. */
function renamed(doc: Record<string, unknown>): Record<string, unknown> {
  const appearance = doc.appearance
  // appearance.fill became appearance.color (and mode went: the edge decides)
  if (
    isRecord(appearance) &&
    "fill" in appearance &&
    !("color" in appearance)
  ) {
    return { ...doc, appearance: { ...appearance, color: appearance.fill } }
  }
  return doc
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const HEX = /^#[0-9a-f]{6}$/i

/** Settings that are one of a few values: anything else is ignored. */
const CHOICES: Record<string, readonly string[]> = {
  align: ["left", "center", "right"],
  lineCap: ["butt", "round", "square"],
  lineJoin: ["miter", "round", "bevel"],
  format: ["svg", "png"],
}

/**
 * `defaults` with what `value` has of the same shape: section by section,
 * keeping only values of the default's type. Maps of any keys (variations,
 * features: empty by default) keep entries whose values have the right type.
 */
function merge<T>(defaults: T, value: unknown, key = ""): T {
  if (!isRecord(defaults) || !isRecord(value)) {
    return sameType(defaults, value, key) ? (value as T) : defaults
  }
  if (key === "variations" || key === "features") {
    const type = key === "variations" ? "number" : "boolean"
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => typeof v === type),
    ) as T
  }
  const result: Record<string, unknown> = { ...defaults }
  for (const k of Object.keys(defaults)) {
    if (k in value) {
      result[k] = merge(defaults[k], value[k], k)
    }
  }
  return result as T
}

function sameType(defaults: unknown, value: unknown, key: string): boolean {
  if (typeof value !== typeof defaults) return false
  if (typeof value === "number") return Number.isFinite(value)
  // the colours go into SVG and the colour picker, which take hex
  if (["color", "edge", "background"].includes(key)) {
    return HEX.test(value as string)
  }
  return !(key in CHOICES) || CHOICES[key].includes(value as string)
}
