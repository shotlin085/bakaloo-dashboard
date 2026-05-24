"use client"

/**
 * Activity log hook — wraps the existing endpoint so each cache entry is
 * keyed by `qk.activityLog(shopKey, filters)` and therefore participates
 * in the Shop_Switcher's predicate-based invalidation (Req 3.4, 10.3).
 *
 * The list query is gated by `enabled: shopKey !== "NONE"` to mirror the
 * convention from `useOrders` / `useShopProductsList`. The shop scope is
 * forwarded to the backend via the `X-Shop-Id` header injected by the
 * axios interceptor — page-level callers may also pass an explicit
 * `shop_id` in `filters` (the `<ActivityTab />` on the shop detail page
 * does this), which is preserved in the query key so per-shop activity
 * tabs don't collide with the global activity-log page.
 *
 * Note: the legacy `["activity-logs", …]` cache prefix (plural) is no
 * longer in use — every reader now goes through the central `activity-log`
 * (singular) tag listed in `SHOP_SCOPED_TAGS` so the Shop_Switcher
 * predicate invalidation covers them in one pass.
 *
 * Requirements: 10.1, 10.3
 */

import { useQuery } from "@tanstack/react-query"

import { getActivityLogs } from "@/services/activity-log.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { ActivityLogFilters } from "@/types/activity-log.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

export function useActivityLogs(filters: ActivityLogFilters) {
  const { mode, activeShopId } = useShopContext()
  const shopKey =
    mode === "ALL_SHOPS" ? "ALL" : activeShopId ?? NONE_SHOP_KEY

  return useQuery({
    queryKey: qk.activityLog(shopKey, filters),
    queryFn: () => getActivityLogs(filters),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })
}
