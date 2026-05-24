"use client"

/**
 * ShopContextHydrator — invisible side-effect component that keeps the
 * Shop_Context_Store in sync with the auth lifecycle.
 *
 * Responsibilities (task 4.4):
 *   1. Call `useShopContextStore.getState().hydrate()` on mount so the
 *      persisted snapshot is read out of `localStorage` once the dashboard
 *      tree mounts. This is what makes a full reload restore the previously
 *      selected shop without prompting the user (Req 1.10, 3.4).
 *   2. Re-call `hydrate()` whenever the auth `accessToken` reference changes.
 *      This covers the re-login flow where the same dashboard layout instance
 *      stays mounted but the underlying token is swapped (e.g. selecting a
 *      shop after `/select-shop`, or a token refresh that lands a new JWT in
 *      `localStorage` without a full page reload).
 *   3. Mirror the authenticated user's shop assignments into the store's
 *      `assignedShopIds` lock list so the vendor tamper-guard kicks in for
 *      every subsequent shop change (Req 3.7, 1.6, 4.6). Super_Admin users
 *      always get an empty list — the absence of a locked set is what marks
 *      them as cross-shop operators throughout the dashboard.
 *   4. Mount `useShopRoom()` so the singleton `ShopRoomManager` is wired to
 *      both the live socket and the Shop_Context_Store the moment the
 *      dashboard tree mounts (task 13.1, Req 11.2, 11.7). The hook is
 *      idempotent — its store subscription is module-local and only attaches
 *      once across the app lifetime — so re-mounting this component (e.g.
 *      after a token swap) is safe.
 *
 * Render output is `null` — the component exists purely to host effects.
 *
 * Why a separate component?
 *   The dashboard layout is large enough that adding two more `useEffect`
 *   hooks inline would entangle the auth-validation flow with shop-context
 *   wiring. Extracting it keeps each concern testable in isolation and
 *   matches the design.md split between auth (`auth.store`) and shop scope
 *   (`shop-context.store`).
 *
 * Requirements: 3.1, 3.2, 4.6
 *
 * Design references:
 *   - design.md §1 "Shop_Context_Store (Zustand)" — `hydrate()` / `setAssignedShopIds`
 *   - design.md §"Auth Flow Sequence Diagram" — login → setAssignedShopIds wiring
 */

import { useEffect } from "react"

import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import { useShopRoom } from "@/hooks/useShopRoom"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roles the dashboard treats as cross-shop operators (Super_Admin). Mirrors
 * the whitelist in `services/auth.service.ts` and `auth.store.ts` so all
 * three modules agree on which roles bypass the vendor tamper guard.
 *
 * Until task 2.x lands a dedicated `SUPER_ADMIN` role on the issued JWT, the
 * existing `ADMIN` role is also accepted so current cross-shop operators
 * keep working.
 */
const SUPER_ADMIN_ROLES = new Set<string>(["SUPER_ADMIN", "ADMIN"])

/**
 * Optional fields the auth profile may carry once the backend embeds shop
 * assignments in `/admin/auth/me` and `/admin/auth/login`. We declare a
 * structural shape here instead of widening `AdminUser` so this component
 * stays decoupled from the wider type — the field is "best-effort" and
 * absence falls back to leaving `assignedShopIds` untouched (the login
 * dispatcher in `(auth)/login/page.tsx` is the primary writer in that case).
 */
interface AuthProfileWithAssignments {
  role?: string
  /** camelCase per the dashboard's normalization layer (`auth.types.ts`). */
  shopAssignments?: Array<{ id: string }>
}

/**
 * Shallow array equality. Avoids triggering a `setAssignedShopIds` write
 * (and its persistence side effects) when the derived list already matches
 * what the store holds.
 */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShopContextHydrator(): null {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  // Mount the Shop_Room manager so it picks up store transitions and the
  // current socket reference. The hook returns the singleton; we don't need
  // the value here — the side effects (store subscription + socket attach +
  // reconnect listener) are the point. Calling it from this hydrator keeps
  // all dashboard-wide bootstrap effects in one component (task 13.1).
  useShopRoom()

  // Effect 1 — `hydrate()` on mount and on every accessToken transition.
  //
  // `hydrate()` is idempotent (it reads `localStorage` and writes the
  // snapshot back into the store), so calling it on every accessToken
  // change is safe. The `accessToken` dependency covers:
  //   - first mount of the dashboard tree (initial localStorage read)
  //   - re-login → token swap without a full page reload
  //   - logout → token cleared (hydrate will see no snapshot and mark the
  //              store hydrated with the empty defaults)
  useEffect(() => {
    useShopContextStore.getState().hydrate()
  }, [accessToken])

  // Effect 2 — mirror the auth profile's shop assignments into the lock list.
  //
  // We deliberately key on `user` (the reference). The auth store replaces
  // the `user` object on every `login()` call, so a re-login with a fresh
  // profile triggers a fresh sync. When `user` is `null` (logged out), the
  // shop-context store has already been cleared by `clearAuth()` /
  // `logout()`, so this effect simply no-ops.
  useEffect(() => {
    if (!user) return

    const profile = user as AuthProfileWithAssignments
    const isSuperAdmin = SUPER_ADMIN_ROLES.has(profile.role ?? "")

    // Super_Admins always carry an empty `assignedShopIds`. If a leftover
    // vendor list survives a session change (e.g. fast user switch in dev),
    // clear it so the Shop_Switcher visibility check stays correct.
    if (isSuperAdmin) {
      const current = useShopContextStore.getState().assignedShopIds
      if (current.length > 0) {
        useShopContextStore.getState().setAssignedShopIds([])
      }
      return
    }

    // Vendor user: when the auth profile carries `shopAssignments`, mirror
    // them into the store. When it does not (current backend shape), leave
    // the persisted set untouched — the login dispatcher in
    // `(auth)/login/page.tsx` is the authoritative writer for that path.
    if (profile.shopAssignments) {
      const ids = profile.shopAssignments.map((s) => s.id)
      const current = useShopContextStore.getState().assignedShopIds
      if (!sameIds(ids, current)) {
        useShopContextStore.getState().setAssignedShopIds(ids)
      }
    }
  }, [user])

  return null
}
