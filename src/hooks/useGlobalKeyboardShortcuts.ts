"use client"

/**
 * `useGlobalKeyboardShortcuts` — register process-wide keyboard handlers.
 *
 * Today the only shortcut owned at this level is the `?` help opener
 * (task 14.2 — "global `?` shortcut opening a `<Sheet>` listing keyboard
 * shortcuts"). Other shortcuts (`⌘K` for global search, `Esc` for
 * dismissing dialogs) are owned by their respective components and just
 * surfaced in the help sheet for discoverability.
 *
 * The hook intentionally:
 *   - Ignores the keystroke when the user is typing in an editable
 *     field (`<input>`, `<textarea>`, `contentEditable`) so search forms
 *     can keep using `?` literally.
 *   - Ignores it when a modifier key is held so `Shift+?` (US keyboard)
 *     fires once but `Ctrl+?` / browser shortcuts pass through.
 *   - Idempotent across re-renders thanks to the stable `onOpen`
 *     reference — callers should `useCallback` the handler.
 *
 * Requirements: 13.7 (global keyboard shortcuts).
 */

import { useEffect } from "react"

/** Returns `true` if the focused element accepts free-text input. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Wire up the global `?` keystroke. Calls `onOpen` whenever the user
 * presses `?` outside an editable element with no modifier other than
 * `Shift`.
 */
export function useGlobalKeyboardShortcuts(onOpen: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // `?` arrives as `event.key === "?"` (Shift held on US layouts).
      // We tolerate Shift but not Ctrl/Alt/Meta so browser shortcuts
      // (e.g. macOS `⌘?` opens Help in some browsers) are not stolen.
      if (event.key !== "?") return
      if (event.ctrlKey || event.altKey || event.metaKey) return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      onOpen()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onOpen])
}
