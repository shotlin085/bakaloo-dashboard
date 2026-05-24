"use client"

/**
 * Analytics hooks — wraps the existing analytics endpoints so each cache
 * entry is keyed under the central `analytics` tag with `shopKey` as the
 * second segment, allowing the Shop_Switcher's predicate-based
 * invalidation to reach them on every pivot (Req 3.4, 10.3).
 *
 * Analytics is one of the ALL_SHOPS-friendly surfaces (Req 10.4) — when
 * `mode === "ALL_SHOPS"` the axios interceptor omits the `X-Shop-Id`
 * header and the backend returns cross-shop aggregates. The hooks
 * therefore key by `"ALL"` in that mode and by `activeShopId` in
 * `SINGLE_SHOP` mode; while the Shop_Context_Store is hydrating
 * (`UNSELECTED`) the queries are gated off via `enabled`.
 *
 * Requirements: 10.1, 10.3, 10.4
 */

import { useQuery } from "@tanstack/react-query"

import {
  getSalesAnalytics,
  getProductPerformance,
  getCustomerCohorts,
  getDeliveryAnalytics,
  getFinancialReport,
  getComparison,
  getDeadStock,
  getGeographicAnalytics,
  getCartEnhancementAnalytics,
} from "@/services/analytics.service"
import { useShopContext } from "@/hooks/useShopContext"
import type { GroupBy } from "@/types/analytics.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

/**
 * Resolve the `shopKey` used by every analytics query. `ALL_SHOPS` →
 * `"ALL"`; `SINGLE_SHOP` → `activeShopId`; otherwise the sentinel `"NONE"`
 * (which gates the query off via `enabled`).
 */
function useShopKey(): string {
  const { mode, activeShopId } = useShopContext()
  return mode === "ALL_SHOPS" ? "ALL" : activeShopId ?? NONE_SHOP_KEY
}

export function useSalesAnalytics(
  startDate: string,
  endDate: string,
  groupBy: GroupBy = "day"
) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "sales", startDate, endDate, groupBy] as const,
    queryFn: () => getSalesAnalytics(startDate, endDate, groupBy),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useProductPerformance(
  startDate: string,
  endDate: string,
  limit = 20
) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "product-performance", startDate, endDate, limit] as const,
    queryFn: () => getProductPerformance(startDate, endDate, limit),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useCustomerCohorts() {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "customer-cohorts"] as const,
    queryFn: getCustomerCohorts,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
  })
}

export function useDeliveryAnalytics(startDate: string, endDate: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "delivery", startDate, endDate] as const,
    queryFn: () => getDeliveryAnalytics(startDate, endDate),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useFinancialReport(startDate: string, endDate: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "financial", startDate, endDate] as const,
    queryFn: () => getFinancialReport(startDate, endDate),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: [
      "analytics",
      shopKey,
      "comparison",
      period1Start,
      period1End,
      period2Start,
      period2End,
    ] as const,
    queryFn: () => getComparison(period1Start, period1End, period2Start, period2End),
    enabled:
      shopKey !== NONE_SHOP_KEY &&
      !!period1Start &&
      !!period1End &&
      !!period2Start &&
      !!period2End,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useDeadStock(limit = 30) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "dead-stock", limit] as const,
    queryFn: () => getDeadStock(limit),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useGeographicAnalytics(startDate?: string, endDate?: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "geographic", startDate, endDate] as const,
    queryFn: () => getGeographicAnalytics(startDate ?? "", endDate ?? ""),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useCartEnhancementAnalytics(startDate: string, endDate: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["analytics", shopKey, "cart-enhancements", startDate, endDate] as const,
    queryFn: () => getCartEnhancementAnalytics(startDate, endDate),
    enabled: shopKey !== NONE_SHOP_KEY && !!startDate && !!endDate,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
