/**
 * Submit-cooldown event hub — shared 5-second submit lockout surfaced from the
 * API_Client when the backend returns HTTP 429.
 *
 * The axios response interceptor calls {@link triggerSubmitCooldown} on 429
 * (per Req 15.4 / task 1.6). Pages that mount {@link useSubmitCooldown} can
 * disable their submit button while `isCoolingDown` is true.
 *
 * Implementation notes
 * --------------------
 *  - Backed by a tiny Zustand store so updates fan out to every subscriber
 *    without prop drilling, and so the interceptor (which lives outside React)
 *    can write through `getState()`.
 *  - The hook re-renders every 250 ms while a cooldown is active, then stops
 *    automatically. No global timer runs when no cooldown is in flight.
 *  - Successive triggers extend the cooldown if the new deadline is later;
 *    earlier deadlines are ignored so a fresh 429 can never *shorten* an
 *    in-flight cooldown.
 *
 * Requirements: 15.4
 * Design refs:  task 1.6 (cooldown event hub)
 */

import { useEffect, useState } from "react"
import { create } from "zustand"

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitCooldownState {
  /**
   * Unix-ms timestamp (`Date.now()`-based) at which the current cooldown
   * expires, or `null` when no cooldown is active.
   */
  cooldownUntil: number | null
  /** Internal setter — callers should use {@link triggerSubmitCooldown}. */
  _set: (until: number | null) => void
}

const useSubmitCooldownStore = create<SubmitCooldownState>((set) => ({
  cooldownUntil: null,
  _set: (until) => set({ cooldownUntil: until }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imperative API (used by the axios interceptor)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a submit cooldown lasting `ms` milliseconds from now.
 *
 * If a cooldown is already in flight, the deadline is moved forward only when
 * the new deadline is later than the existing one. This guarantees that a
 * fresh 429 can extend but never shorten an already-running lockout.
 */
export function triggerSubmitCooldown(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return
  const next = Date.now() + ms
  const current = useSubmitCooldownStore.getState().cooldownUntil
  if (current == null || next > current) {
    useSubmitCooldownStore.getState()._set(next)
  }
}

/**
 * Read the cooldown state imperatively (e.g. for guards that run outside
 * React, such as form-submit callbacks created in non-component code).
 */
export function getSubmitCooldownState(): {
  isCoolingDown: boolean
  msRemaining: number
} {
  const until = useSubmitCooldownStore.getState().cooldownUntil
  if (until == null) return { isCoolingDown: false, msRemaining: 0 }
  const remaining = Math.max(0, until - Date.now())
  return { isCoolingDown: remaining > 0, msRemaining: remaining }
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to the submit cooldown.
 *
 * Returns `{ isCoolingDown, msRemaining }`. The hook re-renders ~4×/s while
 * a cooldown is active so consumers can show a countdown and re-enable the
 * submit button automatically when `msRemaining` reaches 0.
 */
export function useSubmitCooldown(): {
  isCoolingDown: boolean
  msRemaining: number
} {
  const cooldownUntil = useSubmitCooldownStore((s) => s.cooldownUntil)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    // No active cooldown — bail; consumers will see msRemaining === 0.
    if (cooldownUntil == null) return
    if (cooldownUntil <= Date.now()) {
      useSubmitCooldownStore.getState()._set(null)
      return
    }

    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= cooldownUntil) {
        useSubmitCooldownStore.getState()._set(null)
        window.clearInterval(id)
      }
    }, 250)

    return () => window.clearInterval(id)
  }, [cooldownUntil])

  const msRemaining =
    cooldownUntil != null ? Math.max(0, cooldownUntil - now) : 0
  return { isCoolingDown: msRemaining > 0, msRemaining }
}
