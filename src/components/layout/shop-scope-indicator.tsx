"use client"

/**
 * ShopScopeIndicator — topbar indicator showing the active shop name and
 * branch_code whenever the dashboard is in STORE_MODE (single shop scope).
 *
 * Renders nothing in HQ_MODE / ALL_SHOPS / UNSELECTED modes. This provides
 * a persistent visual confirmation of which shop the user is operating in,
 * complementing the ShopSwitcher dropdown.
 *
 * Tasks: 17.6
 * Requirements: 10.2
 */

import { Store } from "lucide-react"
import { useShopContext } from "@/hooks/useShopContext"
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions"
import { cn } from "@/lib/utils"

export interface ShopScopeIndicatorProps {
  /** Optional class hook for positioning in the topbar. */
  className?: string
}

/**
 * Renders the active shop name + branch_code in the topbar when in STORE_MODE.
 * Self-gates: renders nothing when mode !== STORE_MODE or no shop is selected.
 */
export function ShopScopeIndicator({ className }: ShopScopeIndicatorProps) {
  const { mode: dashboardMode } = useEffectivePermissions()
  const { mode, shopMeta } = useShopContext()

  // Only show in STORE_MODE with an active shop
  if (dashboardMode !== "STORE_MODE") return null
  if (mode !== "STORE_MODE" || !shopMeta) return null

  return (
    <div
      role="status"
      aria-label={`Active shop: ${shopMeta.name} (${shopMeta.branchCode})`}
      data-testid="shop-scope-indicator"
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5",
        className,
      )}
    >
      <Store className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate text-sm font-medium text-foreground">
          {shopMeta.name}
        </span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground uppercase">
          {shopMeta.branchCode}
        </span>
      </div>
    </div>
  )
}
