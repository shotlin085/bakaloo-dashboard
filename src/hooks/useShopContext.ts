"use client"

/**
 * useShopContext — selector facade over the Shop_Context_Store.
 *
 * Pages never read shop scope directly from the Zustand store; they call
 * `useShopContext()` so the dependency surface stays narrow and the returned
 * value shape is stable across the dashboard.
 *
 * The companion helper `useIsSuperAdmin()` reads the auth store and returns
 * true for platform Super_Admin users. This is the single source of truth
 * the topbar Shop_Switcher and `<EmptyShopState />` consult to decide
 * between vendor and super-admin UX paths.
 *
 * Design references:
 *   - design.md §1 "Shop_Context_Store (Zustand)" — canonical snippet
 *   - requirements.md 3.1, 3.2, 4.1
 */

import { useShallow } from "zustand/react/shallow"

import { useAuthStore } from "@/store/auth.store"
import {
  useShopContextStore,
  type ShopMeta,
  type ShopMode,
} from "@/store/shop-context.store"
import type { ShopRole } from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────────────────────
// useShopContext
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read-only view of the current shop scope. The returned object is reference-
 * stable across renders (via `useShallow`) so consumers that destructure into
 * effect deps don't trigger spurious re-runs.
 *
 * Note: `isReady` aliases the store's `isHydrated` flag — the contract pages
 * gate on while waiting for the persisted snapshot to be restored.
 */
export interface ShopContextView {
  activeShopId: string | null
  mode: ShopMode
  shopRole: ShopRole | null
  permissions: string[]
  shopMeta: ShopMeta | null
  /** True once `hydrate()` has run on the client. Maps to store `isHydrated`. */
  isReady: boolean
}

export function useShopContext(): ShopContextView {
  return useShopContextStore(
    useShallow((s) => ({
      activeShopId: s.activeShopId,
      mode: s.mode,
      shopRole: s.shopRole,
      permissions: s.permissions,
      shopMeta: s.shopMeta,
      isReady: s.isHydrated,
    })),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsSuperAdmin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when the authenticated user is a platform Super_Admin.
 *
 * Recognizes both the canonical `"SUPER_ADMIN"` value used by the permissions
 * module and the legacy `"ADMIN"` value carried by the existing `AdminUser`
 * profile (`UserRole`). The backend currently issues `role: "ADMIN"` for
 * platform super admins until the shop-aware auth profile lands in task 2.x;
 * this hook bridges both shapes so callers don't need to know which one is
 * active.
 */
export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => {
    // Compare via `string` to admit values outside the current `UserRole`
    // literal union ("CUSTOMER" | "ADMIN" | "DELIVERY"); the auth profile is
    // broadened to include "SUPER_ADMIN" once task 2.1 lands.
    const role = s.user?.role as string | undefined
    return role === "SUPER_ADMIN" || role === "ADMIN"
  })
}
