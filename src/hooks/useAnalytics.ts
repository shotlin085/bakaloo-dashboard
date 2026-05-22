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
import type { GroupBy } from "@/types/analytics.types"

export function useSalesAnalytics(
  startDate: string,
  endDate: string,
  groupBy: GroupBy = "day"
) {
  return useQuery({
    queryKey: ["analytics", "sales", startDate, endDate, groupBy],
    queryFn: () => getSalesAnalytics(startDate, endDate, groupBy),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}

export function useProductPerformance(
  startDate: string,
  endDate: string,
  limit = 20
) {
  return useQuery({
    queryKey: ["analytics", "product-performance", startDate, endDate, limit],
    queryFn: () => getProductPerformance(startDate, endDate, limit),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}

export function useCustomerCohorts() {
  return useQuery({
    queryKey: ["analytics", "customer-cohorts"],
    queryFn: getCustomerCohorts,
    staleTime: 120_000,
  })
}

export function useDeliveryAnalytics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "delivery", startDate, endDate],
    queryFn: () => getDeliveryAnalytics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}

export function useFinancialReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "financial", startDate, endDate],
    queryFn: () => getFinancialReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}

export function useComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
) {
  return useQuery({
    queryKey: ["analytics", "comparison", period1Start, period1End, period2Start, period2End],
    queryFn: () => getComparison(period1Start, period1End, period2Start, period2End),
    enabled: !!period1Start && !!period1End && !!period2Start && !!period2End,
    staleTime: 60_000,
  })
}

export function useDeadStock(limit = 30) {
  return useQuery({
    queryKey: ["analytics", "dead-stock", limit],
    queryFn: () => getDeadStock(limit),
    staleTime: 5 * 60_000,
  })
}

export function useGeographicAnalytics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["analytics", "geographic", startDate, endDate],
    queryFn: () => getGeographicAnalytics(startDate ?? "", endDate ?? ""),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}

export function useCartEnhancementAnalytics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "cart-enhancements", startDate, endDate],
    queryFn: () => getCartEnhancementAnalytics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  })
}
