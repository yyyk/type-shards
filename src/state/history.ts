/** Undo and redo for a value that's replaced as a whole on every change. */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
  /** When the present was set (ms), to merge changes that come in a burst */
  changedAt: number
}

/** The most undo steps kept */
export const HISTORY_LIMIT = 200

/**
 * ms: a change this soon after the last one is part of the same step. Scrubbing
 * a field or typing sends many changes a second, and one ⌘Z should undo the
 * whole scrub, not one pixel of it.
 */
export const MERGE_WINDOW = 500

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], changedAt: -Infinity }
}

/**
 * The history with `next` as the present, at time `now` (ms). A new undo step,
 * unless the last change was less than MERGE_WINDOW ago (or `merge` is false:
 * always a new step). Redo is gone after a change. The same value is no change.
 */
export function change<T>(
  history: History<T>,
  next: T,
  now: number,
  merge = true,
): History<T> {
  if (next === history.present) {
    return history
  }
  if (merge && now - history.changedAt < MERGE_WINDOW) {
    return { ...history, present: next, future: [], changedAt: now }
  }
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    changedAt: now,
  }
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) {
    return history
  }
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    changedAt: -Infinity, // the next change is a step of its own
  }
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...future] = history.future
  if (next === undefined) {
    return history
  }
  return {
    past: [...history.past, history.present],
    present: next,
    future,
    changedAt: -Infinity,
  }
}
