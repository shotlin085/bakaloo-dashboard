"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Generic linear undo/redo history with a fixed-size capped past stack.
 *
 * Used by the theme builder to wrap `localSections` mutations.
 * The hook never persists or talks to the network — it's pure local state.
 *
 * Invariants:
 *   - `present` always reflects the current value.
 *   - `past[length-1]` is the most recent prior value (top of undo stack).
 *   - `future[0]` is the first redo target.
 *   - Calling `set(next)` with a value equal (===) to `present` is a no-op.
 *   - Calling `reset(next)` clears past and future.
 */
export interface BuilderHistory<T> {
  present: T
  /** Replace the present value, pushing the previous one onto past. */
  set: (next: T) => void
  /** Functional updater variant. */
  update: (updater: (prev: T) => T) => void
  /** Move one step back (no-op if `!canUndo`). */
  undo: () => void
  /** Move one step forward (no-op if `!canRedo`). */
  redo: () => void
  /** Reset history with a new baseline (e.g. after Save Draft / Push Live). */
  reset: (next: T) => void
  canUndo: boolean
  canRedo: boolean
}

const DEFAULT_LIMIT = 50

export function useBuilderHistory<T>(
  initial: T,
  options: { limit?: number } = {}
): BuilderHistory<T> {
  const limit = options.limit ?? DEFAULT_LIMIT
  const [past, setPast] = useState<T[]>([])
  const [present, setPresent] = useState<T>(initial)
  const [future, setFuture] = useState<T[]>([])

  const presentRef = useRef(present)
  presentRef.current = present

  const set = useCallback(
    (next: T) => {
      if (next === presentRef.current) return
      setPast((prev) => {
        const appended = [...prev, presentRef.current]
        return appended.length > limit
          ? appended.slice(appended.length - limit)
          : appended
      })
      setPresent(next)
      setFuture([])
    },
    [limit]
  )

  const update = useCallback(
    (updater: (prev: T) => T) => {
      const next = updater(presentRef.current)
      set(next)
    },
    [set]
  )

  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev
      const previous = prev[prev.length - 1]
      setFuture((f) => [presentRef.current, ...f])
      setPresent(previous)
      return prev.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const [next, ...rest] = f
      setPast((p) => {
        const appended = [...p, presentRef.current]
        return appended.length > limit
          ? appended.slice(appended.length - limit)
          : appended
      })
      setPresent(next)
      return rest
    })
  }, [limit])

  const reset = useCallback((next: T) => {
    setPast([])
    setFuture([])
    setPresent(next)
  }, [])

  return {
    present,
    set,
    update,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}
