"use client"

import { useEffect, useRef } from "react"

/**
 * Per-tab local-only autosave for the builder draft.
 *
 * Writes a JSON payload to localStorage under a tab-scoped key, debounced 3s.
 * Never talks to the API. Never calls Save Draft. Designed to recover after
 * an accidental reload — the page-level effect can read this on mount, prompt
 * the user, and either restore or discard.
 */

export interface BuilderAutosavePayload<T> {
  tabId: string
  data: T
  timestamp: number
}

export const AUTOSAVE_KEY_PREFIX = "bakaloo:builder:autosave:"

export function autosaveKey(tabId: string) {
  return `${AUTOSAVE_KEY_PREFIX}${tabId}`
}

export function readAutosaveDraft<T>(
  tabId: string | null
): BuilderAutosavePayload<T> | null {
  if (!tabId || typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(autosaveKey(tabId))
    if (!raw) return null
    return JSON.parse(raw) as BuilderAutosavePayload<T>
  } catch {
    return null
  }
}

export function clearAutosaveDraft(tabId: string | null) {
  if (!tabId || typeof window === "undefined") return
  try {
    window.localStorage.removeItem(autosaveKey(tabId))
  } catch {
    /* swallow — quota or privacy mode */
  }
}

interface UseBuilderAutosaveOptions {
  enabled?: boolean
  debounceMs?: number
}

/**
 * Debounced writer. Pass `enabled=false` to skip writes (e.g. while a
 * Save Draft / Push Live mutation is in flight).
 */
export function useBuilderAutosave<T>(
  tabId: string | null,
  data: T,
  isDirty: boolean,
  { enabled = true, debounceMs = 3000 }: UseBuilderAutosaveOptions = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !tabId || typeof window === "undefined") return
    if (!isDirty) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      try {
        const payload: BuilderAutosavePayload<T> = {
          tabId,
          data,
          timestamp: Date.now(),
        }
        window.localStorage.setItem(autosaveKey(tabId), JSON.stringify(payload))
      } catch {
        /* swallow — quota or privacy mode */
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, tabId, data, isDirty, debounceMs])
}
