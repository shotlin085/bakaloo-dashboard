"use client"

import { type ReactNode } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { ShieldAlert } from "lucide-react"

interface PermissionGateProps {
  /** Permission(s) required. If multiple, ANY one is sufficient. */
  require: string | string[]
  /** What to render if the user lacks permission. Defaults to nothing. */
  fallback?: ReactNode
  /** If true, show a styled "no access" message instead of hiding. */
  showDenied?: boolean
  children: ReactNode
}

/**
 * Conditionally render children based on user permissions.
 *
 * Usage:
 *   <PermissionGate require="products.manage">
 *     <Button>Delete Product</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate require={["orders.manage", "orders.delete"]} showDenied>
 *     <OrderActions />
 *   </PermissionGate>
 */
export function PermissionGate({ require, fallback, showDenied, children }: PermissionGateProps) {
  const { canAny } = usePermissions()

  const perms = Array.isArray(require) ? require : [require]
  const allowed = canAny(...perms)

  if (allowed) return <>{children}</>

  if (showDenied) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>You don&apos;t have permission to access this feature.</span>
      </div>
    )
  }

  return fallback ? <>{fallback}</> : null
}

/**
 * Read-only banner shown to Viewer users at the top of pages.
 */
export function ViewerBanner() {
  const { isViewer } = usePermissions()

  if (!isViewer) return null

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>
        <strong>View-only access.</strong> You can browse the dashboard but cannot create, edit, or delete anything.
      </span>
    </div>
  )
}
