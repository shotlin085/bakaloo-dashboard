"use client"

/**
 * Shop scope badge — non-removable scope confirmation chip.
 *
 * Renders `Shop: <shop name>` whenever the dashboard is operating against a
 * single shop. In `ALL_SHOPS` mode (Super_Admin viewing every shop) and
 * `UNSELECTED` mode (no scope yet), the component renders nothing and lets
 * each page decide whether to show its own empty state.
 *
 * The component is mounted once in the dashboard layout (task 12.7) so every
 * existing page picks up the badge without per-page wiring; this task only
 * creates the component.
 *
 * Requirements: 10.2
 * Design references:
 *   - design.md §11 "Shop Scoping on Existing Pages — Hook Approach"
 *   - design.md §"Folder & Module Layout" — component path
 */

import { Badge } from "@/components/ui/badge"
import { useShopContext } from "@/hooks/useShopContext"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ShopScopeBadgeProps {
  /** Optional class hook for layouts to position the chip in the header. */
  className?: string
}

export function ShopScopeBadge({ className }: ShopScopeBadgeProps) {
  const { mode, shopMeta } = useShopContext()

  // Per Req 10.2: only render when scoped to a single shop. In ALL_SHOPS or
  // UNSELECTED modes the chip would be misleading, so we render nothing.
  if (mode !== "STORE_MODE" || shopMeta == null) {
    return null
  }

  const label = t("shopScope.badge", { name: shopMeta.name })

  return (
    <Badge
      variant="secondary"
      // `aria-label` mirrors the visible text so screen readers announce the
      // full scope on focus/hover. `data-testid` lets layout/page tests assert
      // the chip is present without coupling to copy.
      aria-label={label}
      data-testid="shop-scope-badge"
      className={cn("font-medium", className)}
    >
      {label}
    </Badge>
  )
}
