import { describe, expect, it } from "vitest"
import {
  change,
  createHistory,
  HISTORY_LIMIT,
  MERGE_WINDOW,
  redo,
  undo,
} from "./history"

const later = MERGE_WINDOW + 1

describe("history", () => {
  it("undoes and redoes changes", () => {
    let h = createHistory("a")
    h = change(h, "b", 0)
    h = change(h, "c", later)
    h = undo(h)
    expect(h.present).toBe("b")
    h = undo(h)
    expect(h.present).toBe("a")
    h = redo(h)
    expect(h.present).toBe("b")
    h = redo(h)
    expect(h.present).toBe("c")
  })

  it("does nothing with nothing to undo or redo", () => {
    const h = createHistory("a")
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it("merges a burst of changes into one step", () => {
    let h = createHistory(1)
    for (let t = 0; t < 2000; t += 50) h = change(h, h.present + 1, t)
    expect(h.past).toEqual([1])
    expect(undo(h).present).toBe(1)
  })

  it("starts a new step after a pause", () => {
    let h = createHistory(1)
    h = change(h, 2, 0)
    h = change(h, 3, 100) // part of the same step
    h = change(h, 4, 100 + later)
    expect(h.past).toEqual([1, 3])
  })

  it("starts a new step when told not to merge", () => {
    let h = createHistory(1)
    h = change(h, 2, 0)
    h = change(h, 3, 10, false)
    expect(h.past).toEqual([1, 2])
  })

  it("makes the first change after an undo a step of its own", () => {
    let h = createHistory("a")
    h = change(h, "b", 0)
    h = undo(h)
    h = change(h, "c", 10) // soon after, but after an undo
    expect(h.past).toEqual(["a"])
    expect(undo(h).present).toBe("a")
  })

  it("forgets redo after a change", () => {
    let h = createHistory("a")
    h = change(h, "b", 0)
    h = undo(h)
    h = change(h, "c", later)
    expect(h.future).toEqual([])
    expect(redo(h)).toBe(h)
  })

  it("ignores a change to the same value", () => {
    const h = change(createHistory({ x: 1 }), { x: 2 }, 0)
    expect(change(h, h.present, later)).toBe(h)
  })

  it("keeps at most HISTORY_LIMIT steps", () => {
    let h = createHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 50; i++) h = change(h, i, i * later)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(50) // the oldest ones went
  })
})
