"use client"

/**
 * `<KeyboardShortcutsSheet />` — global keyboard shortcuts cheatsheet.
 *
 * Opens via the `?` shortcut (registered through
 * {@link useGlobalKeyboardShortcuts}) and lists every cross-surface
 * keyboard contract the dashboard supports today. The sheet is
 * deliberately a *reference* surface — pressing the listed keys still
 * has to go through their owning components — so the help is decoupled
 * from any individual feature.
 *
 * The list is hard-coded here because keyboard shortcuts are part of
 * the application contract, not user-configurable data. New shortcuts
 * should be added to `SHORTCUTS` when they ship so the help stays
 * in sync.
 *
 * Requirements: 13.7 (global keyboard shortcuts), 16.5 (consistent
 * UX chrome).
 */

import { useCallback, useState } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts"

interface ShortcutEntry {
  /** Key labels rendered as `<kbd>` chips, joined with `+`. */
  keys: string[]
  /** Action that the keystroke performs. */
  description: string
}

/**
 * Source of truth for the shortcuts cheatsheet. Order is the order
 * shown to the user — keep frequently-used shortcuts near the top.
 */
const SHORTCUTS: ShortcutEntry[] = [
  { keys: ["?"], description: "Open this keyboard shortcuts list" },
  { keys: ["⌘", "K"], description: "Open global search (orders, products, customers)" },
  { keys: ["Ctrl", "K"], description: "Open global search (Windows / Linux)" },
  { keys: ["Esc"], description: "Close the active dialog, drawer, or popover" },
]

export function KeyboardShortcutsSheet() {
  const [open, setOpen] = useState(false)

  // Stable callback so the underlying `useEffect` in
  // `useGlobalKeyboardShortcuts` doesn't re-bind on every render.
  const handleOpen = useCallback(() => setOpen(true), [])
  useGlobalKeyboardShortcuts(handleOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        data-testid="keyboard-shortcuts-sheet"
      >
        <SheetHeader>
          <SheetTitle>Keyboard shortcuts</SheetTitle>
          <SheetDescription>
            Quick reference for the keystrokes available across the
            dashboard. Press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>{" "}
            anywhere to reopen this list.
          </SheetDescription>
        </SheetHeader>

        <ul
          className="mt-6 space-y-3"
          aria-label="Available keyboard shortcuts"
        >
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.keys.join("+")}
              className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2"
            >
              <span className="text-sm text-foreground">
                {shortcut.description}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((key, index) => (
                  <span
                    key={`${key}-${index}`}
                    className="flex items-center gap-1"
                  >
                    {index > 0 ? (
                      <span
                        className="text-xs text-muted-foreground"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    ) : null}
                    <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border bg-background px-1.5 py-0.5 font-mono text-xs font-medium text-foreground shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
