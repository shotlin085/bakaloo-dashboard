import { useCallback } from "react"
import { useAuthStore } from "@/store/auth.store"

const EMPTY_PERMISSIONS: string[] = []

/**
 * Hook to check permissions for the currently logged-in admin.
 * Uses the permissions array stored in the auth store (from backend roles table).
 *
 * Usage:
 *   const { can, canAny, canAll, isViewer } = usePermissions()
 *   if (can("orders.manage")) { ... }
 *   if (isViewer) { // hide all edit buttons }
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions ?? EMPTY_PERMISSIONS

  /** Check if user has a specific permission */
  const can = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission)
    },
    [permissions]
  )

  /** Check if user has ANY of the listed permissions */
  const canAny = useCallback(
    (...perms: string[]): boolean => {
      return perms.some((p) => permissions.includes(p))
    },
    [permissions]
  )

  /** Check if user has ALL of the listed permissions */
  const canAll = useCallback(
    (...perms: string[]): boolean => {
      return perms.every((p) => permissions.includes(p))
    },
    [permissions]
  )

  /** True if user has ONLY .view permissions (no .manage, .delete, .moderate, .export) */
  const isViewer = permissions.length > 0 && permissions.every((p) => p.endsWith(".view"))

  return { can, canAny, canAll, isViewer, permissions }
}
