"use client"

/**
 * Shop_Selector search subcomponent.
 *
 * A controlled `Input` that owns its own immediate keystroke state and
 * propagates updates to the parent through a 300ms debounce. The actual
 * filtering (case-insensitive substring match against `name` and
 * `branchCode`) lives in the page so it stays purely presentational
 * here.
 *
 * Rendered by the page only when `shops.length > 1` per Req 2.6.
 *
 * Requirements: 2.6, 14.3
 * Design: design.md §15 (debounced text inputs) and "Folder & Module Layout"
 */

import { useEffect, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300

export interface ShopSearchProps {
  /** Current external (debounced) value. */
  value: string
  /** Called with the new value after the 300ms debounce settles. */
  onChange: (next: string) => void
  /** Optional placeholder override. */
  placeholder?: string
  /** Optional class for layout overrides. */
  className?: string
}

export function ShopSearch({
  value,
  onChange,
  placeholder = "Search by name or branch code",
  className,
}: ShopSearchProps) {
  // Local immediate state so the input stays responsive while typing.
  const [internal, setInternal] = useState(value)

  // Track the latest emitted value so we only re-sync `internal` when the
  // parent legitimately resets the field (external "clear search" action),
  // not in response to our own debounced emission.
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setInternal(value)
      lastEmitted.current = value
    }
  }, [value])

  const debounced = useDebouncedCallback((next: string) => {
    lastEmitted.current = next
    onChange(next)
  }, DEBOUNCE_MS)

  // Cancel any pending debounce on unmount so we don't fire stale
  // updates after the consumer has navigated away.
  useEffect(() => {
    return () => {
      debounced.cancel()
    }
  }, [debounced])

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        role="searchbox"
        placeholder={placeholder}
        aria-label={placeholder}
        value={internal}
        onChange={(e) => {
          const next = e.target.value
          setInternal(next)
          debounced(next)
        }}
        className="pl-9"
      />
    </div>
  )
}
