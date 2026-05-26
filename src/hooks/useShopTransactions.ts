"use client"

/**
 * useShopTransactions — read-only TanStack Query hook for the
 * Shop_Transactions_UI ledger surface (`/shop-transactions`).
 *
 * Thin orchestration layer over `shopTransactionsService.list`: it owns the
 * query key (so the Shop_Switcher's predicate-based invalidation can locate
 * ledger entries via their `"shop-transactions"` first segment) and the
 * standard list-query options (`staleTime`, `placeholderData`) — nothing
 * else. The page-size cap of 100 (Req 9.2 / 14.4 / Property 12) is enforced
 * inside the service before the request is built.
 *
 * Read-only by construction. There is no companion mutation hook. Ledger
 * rows are append-only and written server-side by the orders, refunds, and
 * payout flows (Req 9.5 / 15.1); the Dashboard never POSTs / PATCHes /
 * DELETEs to `/shop-transactions`.
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §10 "Shop_Transactions_UI"
 *   - design.md §15 "Performance Budget" — list hooks pass
 *     `placeholderData: (prev) => prev` so paginated views don't flash
 *     empty between page / filter changes.
 *
 * Requirements:
 *   - 9.1  Shop_Transactions_UI requires Active_Shop_Id; the page renders
 *          an empty state otherwise. This hook ensures no request is
 *          issued by gating `enabled` on `mode === "STORE_MODE"`.
 *   - 9.2  Pagination 20/page, max 100 (cap enforced by the service).
 *   - 14.2 List hooks use TanStack `keepPreviousData` to avoid layout
 *          shift between pages.
 */

import { useQuery } from "@tanstack/react-query"

import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import {
  shopTransactionsService,
  type ShopTransactionsListParams,
} from "@/services/shop-transactions.service"

/**
 * How long a ledger query stays fresh before TanStack refetches.
 *
 * 30 seconds matches the design.md §15 budget for transaction-style
 * surfaces and aligns with `useReviews`, `useCustomers`, and the orders
 * hooks — short enough that newly written ledger rows surface promptly,
 * long enough to absorb rapid filter toggling without thrashing the
 * backend's Redis cache.
 */
const SHOP_TRANSACTIONS_STALE_TIME_MS = 30_000

/**
 * List shop-transaction ledger rows for the Active_Shop_Id, newest first.
 *
 * Cache key: `qk.shopTransactions(activeShopId, filters)` — the
 * `"shop-transactions"` first segment is in `SHOP_SCOPED_TAGS`, so the
 * Shop_Switcher's predicate-based invalidation (Req 3.4 / 10.3) drops every
 * ledger entry tied to the previously-active shop in one pass.
 *
 * Gating:
 *   - `enabled: mode === "STORE_MODE" && !!activeShopId` keeps the query
 *     from firing while the Shop_Context_Store is hydrating, while a
 *     Super_Admin is in `ALL_SHOPS` mode, or while no shop is selected
 *     (Req 9.1, Property 6).
 *   - The cache key uses `activeShopId ?? ""` so the query key stays
 *     deterministic in the disabled state without colliding with any real
 *     shop UUID; `enabled` ensures the empty-string key is never executed.
 *
 * @param filters — page, limit, type[], from/to, reference_type, search.
 *                  All optional; the service supplies defaults
 *                  (`limit = 20`, capped at 100).
 */
export function useShopTransactions(filters: ShopTransactionsListParams = {}) {
  const { activeShopId, mode } = useShopContext()

  return useQuery({
    queryKey: qk.shopTransactions(activeShopId ?? "", filters),
    queryFn: () => shopTransactionsService.list(filters),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: SHOP_TRANSACTIONS_STALE_TIME_MS,
  })
}
