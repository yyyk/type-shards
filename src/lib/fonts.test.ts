import { describe, expect, it } from "vitest"
import {
  axisName,
  axisValues,
  featureName,
  featureSettings,
  instanceName,
  isFeatureOn,
  matchingInstance,
  switchableFeatures,
  uniqueFontName,
} from "./fonts"

const axis = (tag: string, min: number, def: number, max: number) => ({
  tag,
  min,
  default: def,
  max,
  hidden: false,
})

const font = {
  axes: [axis("wght", 100, 400, 900), axis("wdth", 50, 100, 150)],
  namedInstances: () => [
    {
      name: "Regular",
      postscript_name: null,
      variations: { wght: 400, wdth: 100 },
    },
    {
      name: "Bold",
      postscript_name: null,
      variations: { wght: 700, wdth: 100 },
    },
    {
      name: "Bold Condensed",
      postscript_name: null,
      variations: { wght: 700, wdth: 75 },
    },
  ],
  features: () => ["ccmp", "kern", "liga", "locl", "smcp", "ss01", "tnum"],
}

describe("names", () => {
  it("names known axes, and keeps unknown tags", () => {
    expect(axisName("wght")).toBe("Weight")
    expect(axisName("XOPQ")).toBe("Thick Stroke")
    expect(axisName("ABCD")).toBe("ABCD")
  })

  it("names features, numbering stylistic sets and character variants", () => {
    expect(featureName("smcp")).toBe("Small Caps")
    expect(featureName("ss01")).toBe("Stylistic Set 1")
    expect(featureName("ss12")).toBe("Stylistic Set 12")
    expect(featureName("cv03")).toBe("Character Variant 3")
    expect(featureName("abcd")).toBe("abcd")
  })

  it("names an unnamed instance", () => {
    const unnamed = { name: null, postscript_name: null }
    expect(instanceName(unnamed, 2)).toBe("Instance 3")
    expect(instanceName({ name: null, postscript_name: "X-Bold" }, 0)).toBe(
      "X-Bold",
    )
  })
})

describe("features", () => {
  it("leaves out the features the script needs, and kern", () => {
    expect(switchableFeatures(font)).toEqual(["liga", "smcp", "ss01", "tnum"])
  })

  it("has ligatures on by default, and the rest off", () => {
    expect(isFeatureOn("liga", {}, 0)).toBe(true)
    expect(isFeatureOn("smcp", {}, 0)).toBe(false)
  })

  it("has ligatures off by default with letter spacing, as in CSS", () => {
    expect(isFeatureOn("liga", {}, 18)).toBe(false)
    expect(isFeatureOn("liga", { liga: true }, 18)).toBe(true)
  })

  it("follows what was set", () => {
    expect(isFeatureOn("liga", { liga: false }, 0)).toBe(false)
    expect(isFeatureOn("smcp", { smcp: true }, 0)).toBe(true)
  })

  it("turns settings into fontFeatures strings", () => {
    expect(featureSettings({ ss01: true, liga: false })).toEqual([
      "ss01",
      "-liga",
    ])
    expect(featureSettings({})).toEqual([])
  })
})

describe("axes and instances", () => {
  it("fills in the axis defaults", () => {
    expect(axisValues(font, { wght: 700 })).toEqual({ wght: 700, wdth: 100 })
    expect(axisValues(font, {})).toEqual({ wght: 400, wdth: 100 })
  })

  it("finds the instance the values match, defaults included", () => {
    expect(matchingInstance(font, {})).toBe(0)
    expect(matchingInstance(font, { wght: 700 })).toBe(1)
    expect(matchingInstance(font, { wght: 700, wdth: 75 })).toBe(2)
  })

  it("finds none for values in between", () => {
    expect(matchingInstance(font, { wght: 650 })).toBe(-1)
  })

  it("finds none for a font without axes", () => {
    expect(matchingInstance({ axes: [], namedInstances: () => [] }, {})).toBe(
      -1,
    )
  })
})

describe("uniqueFontName", () => {
  it("keeps a name nothing else has", () => {
    expect(uniqueFontName("Inter", "Inter.ttf", ["Roboto"])).toBe("Inter")
  })

  it("adds the file name to a name that's taken", () => {
    expect(uniqueFontName("Roboto", "Roboto-Regular.ttf", ["Roboto"])).toBe(
      "Roboto (Roboto-Regular.ttf)",
    )
  })

  it("numbers it when that's taken too: the same file uploaded again", () => {
    const taken = ["Roboto", "Roboto (R.ttf)"]
    expect(uniqueFontName("Roboto", "R.ttf", taken)).toBe("Roboto (R.ttf) 2")
    expect(
      uniqueFontName("Roboto", "R.ttf", [...taken, "Roboto (R.ttf) 2"]),
    ).toBe("Roboto (R.ttf) 3")
  })

  it("doesn't repeat a file name that is the name (a font without names)", () => {
    expect(uniqueFontName("x.ttf", "x.ttf", ["x.ttf"])).toBe("x.ttf 2")
  })
})
