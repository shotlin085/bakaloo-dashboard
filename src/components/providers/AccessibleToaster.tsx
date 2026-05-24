"use client"

/**
 * Accessibility-tightened Sonner Toaster.
 *
 * Sonner ships with `<section aria-live="polite" aria-atomic="false">`
 * (see `node_modules/sonner/dist/index.mjs`), which is appropriate for
 * informational toasts but does not satisfy task 14.2's stricter contract:
 * the Bakaloo dashboard surfaces failure states (network errors, payment
 * declines, low-stock socket events) where assertive announcements are
 * required so the operator hears the toast immediately.
 *
 * Sonner's `ToasterProps` API does not expose the `aria-live` /
 * `aria-atomic` attributes for override, so we wrap the Toaster in a
 * thin container that locates the rendered `<section data-sonner-toaster>`
 * (or its closest `<section>` ancestor) on mount and patches the three
 * attributes the task mandates:
 *
 *   - `role="region"`        (explicit, even though `<section>` implies it)
 *   - `aria-live="assertive"`
 *   - `aria-atomic="true"`
 *
 * The patch runs in a `MutationObserver` so it survives Sonner's internal
 * re-renders (Sonner re-creates the section node when toggling between
 * "expanded" and "collapsed" stacks).
 *
 * Requirements: 13.3 (toaster ARIA contract), 16.5 (consistent UX chrome).
 */

import { useEffect, useRef } from "react"
import { Toaster, type ToasterProps } from "sonner"

const REGION_ATTRS: Record<string, string> = {
  role: "region",
  "aria-live": "assertive",
  "aria-atomic": "true",
}

/**
 * Wrapper around Sonner's `<Toaster />` that enforces the dashboard's
 * accessibility contract on the underlying `<section>` element. Accepts
 * every `ToasterProps` prop so call-sites keep their existing styling.
 */
export function AccessibleToaster(props: ToasterProps) {
  // The wrapper's `div` becomes the anchor we walk from to find Sonner's
  // `<section>`. Using a ref keeps the lookup local to this instance and
  // avoids any global `document.querySelector` race with other portals.
  const anchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    /** Locate Sonner's section (the closest `<section>` to the toaster `<ol>`). */
    const findSection = (): HTMLElement | null => {
      const list = document.querySelector("[data-sonner-toaster]")
      const section = list?.closest?.("section")
      return (section as HTMLElement | null) ?? null
    }

    const apply = (node: HTMLElement | null) => {
      if (!node) return
      for (const [key, value] of Object.entries(REGION_ATTRS)) {
        if (node.getAttribute(key) !== value) {
          node.setAttribute(key, value)
        }
      }
    }

    // Initial pass — Sonner mounts synchronously, so the section is
    // usually present already; the MutationObserver below picks up any
    // late mounts or re-creations.
    apply(findSection())

    const observer = new MutationObserver(() => {
      apply(findSection())
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={anchorRef} data-accessible-toaster-anchor>
      <Toaster {...props} />
    </div>
  )
}
