"use client"

/**
 * PermissionGate — permission-aware wrapper component.
 *
 * Takes a `permission` prop and hides children when the permission is absent
 * from the user's effective permission set. For SHOP_VIEWER users, mutation
 * controls are rendered disabled with `aria-disabled="true"` instead of being
 * hidden entirely, providing a visible but non-interactive state.
 *
 * This component uses `useEffectivePermissions` which computes permissions
 * from either the HQ role (Super_Admin → all permissions) or the active
 * shop assignment's permission array (store-scoped users).
 *
 * Tasks: 17.3
 * Requirements: 4.1, 4.2
 */

import { type ReactNode } from "react"
import { Lock } from "lucide-react"
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionGateProps {
  /**
   * Permission token(s) required. If a single string, that permission must
   * be present. If an array, ANY one of the listed permissions is sufficient.
   */
  permission: string | string[]
  /**
   * Behaviour when the user lacks the permission:
   * - "hide" (default): render nothing
   * - "disable": render children with `aria-disabled="true"` and reduced opacity
   * - "message": render a "no access" message
   */
  behavior?: "hide" | "disable" | "message"
  /** Custom fallback to render when permission is absent (overrides behavior). */
  fallback?: ReactNode
  /** Children to render when permission is granted. */
  children: ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conditionally render children based on the user's effective permissions.
 *
 * Usage:
 *   // Hide when permission absent
 *   <PermissionGate permission="products.write">
 *     <Button>Create Product</Button>
 *   </PermissionGate>
 *
 *   // Disable for SHOP_VIEWER (read-only users)
 *   <PermissionGate permission="orders.write" behavior="disable">
 *     <Button>Update Order</Button>
 *   </PermissionGate>
 *
 *   // Show "no access" message
 *   <PermissionGate permission="shop-staff.write" behavior="message">
 *     <StaffManagement />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  behavior = "hide",
  fallback,
  children,
}: PermissionGateProps) {
  const { hasAny, isViewer } = useEffectivePermissions()

  const perms = Array.isArray(permission) ? permission : [permission]
  const allowed = hasAny(...perms)

  // Permission granted — render children normally
  if (allowed) {
    return <>{children}</>
  }

  // Custom fallback takes precedence over behavior
  if (fallback) {
    return <>{fallback}</>
  }

  // SHOP_VIEWER with "disable" behavior: render children as disabled
  // This provides visual feedback that the control exists but is not
  // actionable for read-only users.
  if (behavior === "disable" || isViewer) {
    return (
      <DisabledWrapper>
        {children}
      </DisabledWrapper>
    )
  }

  // "message" behavior: show a styled no-access message
  if (behavior === "message") {
    return <NoPermissionMessage />
  }

  // Default "hide" behavior: render nothing
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps children with disabled styling and aria-disabled attribute.
 * Prevents pointer events and reduces opacity to signal non-interactivity.
 */
function DisabledWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      aria-disabled="true"
      role="group"
      aria-label="This action requires additional permissions"
      className="relative pointer-events-none opacity-50 select-none"
      tabIndex={-1}
    >
      {children}
      {/* Overlay to prevent any click-through */}
      <div
        className="absolute inset-0 z-10 cursor-not-allowed"
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * Styled message shown when the user lacks permission and behavior="message".
 */
function NoPermissionMessage() {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground"
    >
      <Lock className="h-4 w-4 shrink-0" />
      <span>You don&apos;t have permission to access this feature.</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook-based permission check for cases where a wrapper component is awkward.
 * Returns `true` if the user has the specified permission(s).
 */
export function useHasPermission(permission: string | string[]): boolean {
  const { hasAny } = useEffectivePermissions()
  const perms = Array.isArray(permission) ? permission : [permission]
  return hasAny(...perms)
}
