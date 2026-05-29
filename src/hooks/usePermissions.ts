import { useCallback } from "react"
import { useAuthStore } from "@/store/auth.store"

const EMPTY_PERMISSIONS: string[] = []

/**
 * Top-level platform roles that hold unconditional authority across the
 * dashboard.
 *
 * This mirrors the backend contract exactly: every admin mutation route gates
 * on `authorize(['ADMIN'])` (see `src/middlewares/authorize.js`), and
 * `HQ_ROLE_PERMISSIONS` (see `src/utils/permissions.js`) grants both
 * `SUPER_ADMIN` and `ADMIN` the full 37-string canonical permission set.
 *
 * Crucially, the legacy gating strings used by the dashboard UI
 * (`products.manage`, `orders.manage`, …) are NOT part of the backend's
 * canonical vocabulary, so an HQ operator's JWT never literally contains
 * them. Without a role-aware bypass, `can("products.manage")` is always
 * `false` for an Admin/Super_Admin and the Add/Edit/Delete affordances stay
 * hidden even though the API would accept the request. Treating these two
 * roles as permission super-users keeps the client in lock-step with what the
 * server actually authorises. This is client-side affordance gating only —
 * the backend remains the real enforcement boundary on every request.
 *
 * Kept in sync with `SUPER_ADMIN_ROLES` in `store/auth.store.ts` and
 * `services/auth.service.ts`.
 */
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"])

/**
 * Hook to check permissions for the currently logged-in admin.
 *
 * Resolution order for every check:
 *   1. Platform Super_Admin / Admin → granted unconditionally (role bypass),
 *      matching the backend's `authorize(['ADMIN'])` authority.
 *   2. Otherwise → exact match against the permission strings carried in the
 *      auth store (sourced from the backend roles/shop-staff tables).
 *
 * Usage:
 *   const { can, canAny, canAll, isViewer, isSuperAdmin } = usePermissions()
 *   if (can("orders.manage")) { ... }
 *   if (isViewer) { // hide all edit buttons }
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions ?? EMPTY_PERMISSIONS

  /**
   * True when the signed-in user is a platform Super_Admin / Admin. These
   * roles bypass the granular permission-string checks below because the
   * backend already authorises them for every admin mutation route.
   */
  const isSuperAdmin = user ? SUPER_ADMIN_ROLES.has(user.role) : false

  /** Check if user has a specific permission */
  const can = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin) return true
      return permissions.includes(permission)
    },
    [permissions, isSuperAdmin]
  )

  /** Check if user has ANY of the listed permissions */
  const canAny = useCallback(
    (...perms: string[]): boolean => {
      if (isSuperAdmin) return true
      return perms.some((p) => permissions.includes(p))
    },
    [permissions, isSuperAdmin]
  )

  /** Check if user has ALL of the listed permissions */
  const canAll = useCallback(
    (...perms: string[]): boolean => {
      if (isSuperAdmin) return true
      return perms.every((p) => permissions.includes(p))
    },
    [permissions, isSuperAdmin]
  )

  /**
   * True if user has ONLY .view permissions (no .manage, .delete, .moderate,
   * .export). A Super_Admin / Admin is never a viewer — they hold full
   * mutation authority via the role bypass above.
   */
  const isViewer =
    !isSuperAdmin &&
    permissions.length > 0 &&
    permissions.every((p) => p.endsWith(".view"))

  return { can, canAny, canAll, isViewer, isSuperAdmin, permissions }
}
