"use client"

/**
 * useShopFinancials — read-only TanStack Query hook for the
 * Shop_Financials_UI period-list surface (`/shop-financials`).
 *
 * The hook is a thin orchestration layer over `shopFinancialsService.list`:
 * it owns the query key (so cross-cutting concerns like the
 * Shop_Switcher invalidation predicate can find financial entries via their
 * `"shop-financials"` first segment) and standard list-query options
 * (`staleTime`, `placeholderData`) — nothing else.
 *
 * Read-only by construction: there is no companion mutation hook. Period
 * rows are written by the backend Settlement_Worker and Payout_Worker
 * (Req 8.9), so the dashboard never POSTs / PATCHes / DELETEs to
 * `/shop-financials`.
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §15 "Performance Budget" — list hooks pass
 *     `placeholderData: (prev) => prev` so paginated views don't flash
 *     empty between range / page changes.
 *
 * Requirements:
 *   - 8.1  Shop_Financials_UI is shop-scoped and read-only
 *   - 8.3  Server-side pagination with `limit` capped at 100
 *   - 14.2 List hooks use TanStack `keepPreviousData` to avoid layout shift
 */

import { useQuery } from "@tanstack/react-query"

import { qk } from "@/lib/query-keys"
import { shopFinancialsService } from "@/services/shop-financials.service"
import type { ShopFinancialPeriodType } from "@/types/shop-financial.types"

/**
 * Default page / limit used both for the `range` cache-key segment and as
 * fallbacks passed to the service. The service caps `limit` at 100
 * (Req 14.4 / Property 12) so any user-supplied value is bounded before
 * the request leaves the dashboard.
 */
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

/** How long a financials query stays fresh before TanStack refetches. */
const SHOP_FINANCIALS_STALE_TIME_MS = 60_000

export interface UseShopFinancialsParams {
  /**
   * Active shop UUID. The query is gated on this being truthy so we never
   * fire a request while the Shop_Context_Store is hydrating or while a
   * Super_Admin is in `ALL_SHOPS` mode (Req 8.1).
   */
  shopId: string | null | undefined
  /** Settlement bucket — DAILY / WEEKLY / MONTHLY (Req 8.6). */
  period_type: ShopFinancialPeriodType
  /** Inclusive `YYYY-MM-DD` start of the visible range, if any. */
  from?: string
  /** Inclusive `YYYY-MM-DD` end of the visible range, if any. */
  to?: string
  /** 1-indexed page number for the period table; defaults to 1. */
  page?: number
  /** Page size for the period table; capped at 100 by the service. */
  limit?: number
}

/**
 * Build the `range` segment of the cache key. Encoding all of
 * `from`, `to`, `page`, and `limit` into a single deterministic string
 * keeps the central key factory's `qk.shopFinancials(shopId, period, range)`
 * signature stable while still yielding a fresh cache entry whenever any
 * of those filters change — which is what `placeholderData: (prev) => prev`
 * relies on to swap the previous result in during refetch.
 *
 * Empty `from` / `to` slots are encoded as the empty string so a partial
 * range still produces a stable, distinct key (e.g. `"_2025-01-31_1_20"`).
 */
function buildRangeKey(params: UseShopFinancialsParams): string {
  return `${params.from ?? ""}_${params.to ?? ""}_${params.page ?? DEFAULT_PAGE}_${params.limit ?? DEFAULT_LIMIT}`
}

/**
 * List shop-financial period rows for the active shop, filtered by period
 * type and (optionally) a `from` / `to` calendar range.
 *
 * Cache key: `qk.shopFinancials(shopId, period_type, range)` — the
 * `"shop-financials"` first segment is in `SHOP_SCOPED_TAGS`, so the
 * Shop_Switcher's predicate-based invalidation (Req 3.4, 10.3) drops every
 * entry tied to the previously-active shop in one pass.
 *
 * Gating:
 *   - `enabled: !!shopId` defends against the App Router's transient
 *     `undefined` params during route transitions and against the
 *     `ALL_SHOPS` Super_Admin mode where `activeShopId` is `null`.
 */
export function useShopFinancials(params: UseShopFinancialsParams) {
  const { shopId, period_type } = params
  const range = buildRangeKey(params)

  return useQuery({
    queryKey: qk.shopFinancials(shopId ?? "", period_type, range),
    queryFn: () =>
      shopFinancialsService.list({
        shop_id: shopId as string,
        period_type,
        from: params.from,
        to: params.to,
        page: params.page,
        limit: params.limit,
      }),
    enabled: !!shopId,
    placeholderData: (prev) => prev,
    staleTime: SHOP_FINANCIALS_STALE_TIME_MS,
  })
}
