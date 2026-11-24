/**
 * Whether a key press goes to a text field, where keys type (Space, -, ⌘Z)
 * rather than act as the app's shortcuts.
 */
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))
