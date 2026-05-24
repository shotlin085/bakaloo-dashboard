"use client"

/**
 * Shop_Products row badges — wave 8.4 of the multi-vendor dashboard.
 *
 * Renders the inventory state badge for a shop-product row. A single
 * component owns both the `Low stock` and `Sold out` cases so the
 * decision tree (which is exhaustive across `stock_quantity`) lives in
 * one place and the row cell is reduced to a tiny call site.
 *
 * Behaviour:
 *   - `stock_quantity === 0` (Req 7.7) → renders a `Sold out` badge with a
 *     muted `opacity-60` styling and wraps it in a shadcn `Tooltip` whose
 *     content surfaces `sold_out_at` formatted via {@link formatDate}.
 *   - `0 < stock_quantity <= low_stock_threshold` (Req 7.6) → renders a
 *     `Low stock` badge. The shadcn Badge primitive ships only
 *     `default | secondary | destructive | outline` variants, so we use
 *     `destructive` to satisfy the design's "warning" intent (per the
 *     design fallback noted in design §13).
 *   - Otherwise → renders nothing.
 *
 * Both badges include the literal English text in addition to colour, so
 * users with colour-vision differences can perceive the state (Req 13.6,
 * design §13 "Color + text").
 *
 * Requirements: 7.6, 7.7, 13.6
 */

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDate, t } from "@/lib/i18n"
import type { ShopProduct } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primitive props for callers that drive the badge from individual fields
 * (for example, optimistic-update preview surfaces that don't have a full
 * `ShopProduct` in hand).
 */
export interface StockBadgeProps {
  /** Current on-hand stock for the shop-product. */
  stockQuantity: number
  /** Threshold at or below which the row is considered "low stock". */
  lowStockThreshold: number
  /**
   * ISO-8601 timestamp recorded by the backend when stock first hit zero.
   * Surfaced in the tooltip when the row is sold out; ignored otherwise.
   */
  soldOutAt: string | null
}

/**
 * Convenience prop shape for the canonical caller (the row in
 * `shop-products/page.tsx`) that already has a full {@link ShopProduct}.
 */
export interface StockBadgeForProductProps {
  product: ShopProduct
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stock-state badge for a shop-product row.
 *
 * Returns `null` when the row is neither sold out nor low. Calling sites
 * should wrap the badge with the numeric `stock_quantity` value if they
 * also need to display the count; this component intentionally renders
 * only the badge so it composes cleanly into the table cell and any
 * future card / detail surface.
 */
export function StockBadge({
  stockQuantity,
  lowStockThreshold,
  soldOutAt,
}: StockBadgeProps): React.ReactElement | null {
  // Sold out takes precedence over low stock — a row at 0 is *also* "at or
  // below threshold", but Req 7.7 requires the sold-out treatment.
  const isSoldOut = stockQuantity === 0
  const isLow = !isSoldOut && stockQuantity <= lowStockThreshold

  if (isSoldOut) {
    // Tooltip body: the formatted `sold_out_at` timestamp when present,
    // otherwise the bare label so the trigger still has accessible content.
    const tooltipText = soldOutAt
      ? t("shopProducts.tooltip.soldOutAt", {
          when: formatDate(soldOutAt, "long"),
        })
      : t("shopProducts.badge.soldOut")

    return (
      // `delayDuration={150}` matches the snappy feel used elsewhere in the
      // dashboard (see `Sidebar` / `Header`). The provider is co-located
      // because the shop-products page does not yet wrap its tree in one,
      // and a provider is required by Radix for the tooltip to mount.
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* The trigger needs a focusable wrapper so keyboard users can
                summon the tooltip. `tabIndex={0}` exposes it in the tab
                order; `role="button"` is intentionally omitted because the
                element is purely informational and does not act on click. */}
            <span
              tabIndex={0}
              data-testid="stock-badge-sold-out"
              className="inline-flex"
            >
              <Badge variant="secondary" className="opacity-60">
                {t("shopProducts.badge.soldOut")}
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (isLow) {
    return (
      // Shadcn's stock Badge has no `warning` variant, so `destructive` is
      // the closest fit per the task fallback. Literal text guarantees the
      // state is perceivable without colour (Req 13.6).
      <Badge variant="destructive" data-testid="stock-badge-low">
        {t("shopProducts.badge.lowStock")}
      </Badge>
    )
  }

  return null
}

/**
 * Thin adapter that drives {@link StockBadge} from a {@link ShopProduct}
 * record. Kept as a separate export so the row cell stays a one-liner.
 */
export function StockBadgeForProduct({
  product,
}: StockBadgeForProductProps): React.ReactElement | null {
  return (
    <StockBadge
      stockQuantity={product.stock_quantity}
      lowStockThreshold={product.low_stock_threshold}
      soldOutAt={product.sold_out_at}
    />
  )
}
