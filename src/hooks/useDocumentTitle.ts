"use client"

/**
 * `useDocumentTitle` — set the browser tab `<title>` for the current route.
 *
 * Next.js App Router resolves `metadata.title` server-side, but every
 * dashboard page in this app is a client component (the layouts mount
 * stores, sockets, and other browser-only providers). Client components
 * cannot export `metadata`, so we mirror the same UX with a tiny effect
 * that updates `document.title` on mount and resets it when the
 * component unmounts.
 *
 * The page title is suffixed with the app name so the browser tab and
 * window list keep a stable trailer regardless of which surface is
 * focused — `Shops · Bakaloo Admin`, `Inventory · Bakaloo Admin`, etc.
 *
 * Requirements: 13.1 (per-route `<title>`), 16.5 (consistent app chrome).
 */

import { useEffect } from "react"

/** App name appended to every page title. Kept in sync with `RootLayout`. */
const APP_NAME = "Bakaloo Admin"

/**
 * Set `document.title` to `"<title> · Bakaloo Admin"` for the lifetime of
 * the calling component.
 *
 * The previous title is captured on mount and restored on unmount so a
 * brief flash through this route does not leak into adjacent surfaces
 * that have not yet had a chance to set their own title.
 *
 * Falsy `title` values are ignored — callers can pass a string that is
 * still loading without thrashing the tab to `"undefined · …"`.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (typeof document === "undefined") return
    if (!title) return

    const previous = document.title
    document.title = `${title} · ${APP_NAME}`

    return () => {
      document.title = previous
    }
  }, [title])
}
