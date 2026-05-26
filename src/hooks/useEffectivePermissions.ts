"use client"

/**
 * useEffectivePermissions — computes the effective permission set for the
 * current user based on their platform role (HQ) or active shop assignment
 * (store-scoped).
 *
 * HQ Mode (Super_Admin / ADMIN):
 *   The user gets the full `HQ_ROLE_PERMISSIONS` set — every permission token
 *   in the system. This mirrors the backend's behaviour where Super_Admins
 *   bypass per-shop permission checks.
 *
 * Store Mode (shop-scoped user):
 *   The effective permissions come from `auth.activeShopAssignment.permissions`
 *   — the `permissions[]` array stored in the Shop_Context_Store after
 *   `selectShop` completes. These are the tokens the backend granted for the
 *   chosen shop.
 *
 * The hook re-evaluates whenever the auth store or shop-context store changes,
 * so UI gating updates without a full page reload.
 *
 * Design references:
 *   - design.md §3 "RBAC Permission Map"
 *   - requirements.md 4.1 (RBAC_Layer permissions exposure)
 *
 * Tasks: 17.4
 */

import { useMemo } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useShopContext } from "@/hooks/useShopContext"
import {
  ROLE_DEFAULTS,
  type PermissionToken,
  type Role,
} from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────────────────────
// HQ Role Permissions — full permission set for platform Super_Admins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete permission set granted to HQ (Super_Admin) users. This is the
 * union of all ROLE_DEFAULTS entries — Super_Admins can do everything any
 * shop role can do, plus platform-level operations.
 *
 * Mirrors the backend's Super_Admin bypass: the JWT for a Super_Admin
 * carries all tokens, so the front-end should never hide an affordance
 * from them.
 */
export const HQ_ROLE_PERMISSIONS: readonly PermissionToken[] = (() => {
  const all = new Set<PermissionToken>()
  for (const perms of Object.values(ROLE_DEFAULTS)) {
    for (const p of perms) {
      all.add(p)
    }
  }
  return Object.freeze(Array.from(all))
})()

// ─────────────────────────────────────────────────────────────────────────────
// Mode detection
// ─────────────────────────────────────────────────────────────────────────────

/** Dashboard operating mode derived from the user's role. */
export type DashboardMode = "HQ_MODE" | "STORE_MODE"

/**
 * Roles treated as HQ (platform-level). Matches the whitelist in
 * `auth.store.ts` and `useIsSuperAdmin()`.
 */
const HQ_ROLES = new Set<string>(["SUPER_ADMIN", "ADMIN"])

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectivePermissions {
  /** Current dashboard operating mode. */
  mode: DashboardMode
  /** The effective permission token set for the current session. */
  permissions: readonly string[]
  /** Convenience: check if a specific permission is in the effective set. */
  has: (permission: string) => boolean
  /** Convenience: check if ANY of the listed permissions are present. */
  hasAny: (...permissions: string[]) => boolean
  /** Convenience: check if ALL of the listed permissions are present. */
  hasAll: (...permissions: string[]) => boolean
  /** True when the user is a SHOP_VIEWER (read-only, mutations disabled). */
  isViewer: boolean
  /** The normalized platform role. */
  role: Role
}

/**
 * Compute the effective permission set from the user's platform role (HQ)
 * or the active shop assignment's permissions (store-scoped).
 *
 * Re-evaluates on auth or shop-context store changes.
 */
export function useEffectivePermissions(): EffectivePermissions {
  const userRole = useAuthStore((s) => s.user?.role)
  const userPermissions = useAuthStore((s) => s.user?.permissions)
  const { permissions: shopPermissions, shopRole } = useShopContext()

  return useMemo(() => {
    const rawRole = (userRole as string) ?? ""
    const isHQ = HQ_ROLES.has(rawRole)
    const mode: DashboardMode = isHQ ? "HQ_MODE" : "STORE_MODE"

    // Normalize the role to the canonical Role union
    let normalizedRole: Role = "SHOP_VIEWER"
    if (rawRole === "SUPER_ADMIN" || rawRole === "ADMIN") {
      normalizedRole = "SUPER_ADMIN"
    } else if (shopRole) {
      normalizedRole = shopRole
    }

    // Compute effective permissions
    let effectivePerms: readonly string[]
    if (isHQ) {
      // HQ users get the full permission set
      effectivePerms = HQ_ROLE_PERMISSIONS
    } else {
      // Store-scoped users get their shop assignment permissions merged
      // with any top-level user permissions from the auth profile
      const merged = new Set<string>([
        ...(userPermissions ?? []),
        ...(shopPermissions ?? []),
      ])
      effectivePerms = Array.from(merged)
    }

    const permSet = new Set(effectivePerms)

    const has = (permission: string): boolean => permSet.has(permission)
    const hasAny = (...perms: string[]): boolean =>
      perms.some((p) => permSet.has(p))
    const hasAll = (...perms: string[]): boolean =>
      perms.every((p) => permSet.has(p))

    const isViewer = normalizedRole === "SHOP_VIEWER"

    return {
      mode,
      permissions: effectivePerms,
      has,
      hasAny,
      hasAll,
      isViewer,
      role: normalizedRole,
    }
  }, [userRole, userPermissions, shopPermissions, shopRole])
}
