import { useQuery } from "@tanstack/react-query"
import {
  getDashboardStats,
  getRevenueChart,
  getOrdersByHour,
  getTopProducts,
  getLowStockAlerts,
  getPendingActions,
  getLiveStats,
  getRecentOrders,
  getCategoryRevenue,
} from "@/services/dashboard.service"

export function useDashboardStats(period: "today" | "week" | "month" | "year" = "week") {
  return useQuery({
    queryKey: ["dashboard", "stats", period],
    queryFn: () => getDashboardStats(period),
    staleTime: 60 * 1000,
  })
}

export function useRevenueChart(days: number = 30) {
  return useQuery({
    queryKey: ["dashboard", "revenue-chart", days],
    queryFn: () => getRevenueChart(days),
    staleTime: 5 * 60 * 1000,
  })
}

export function useOrdersByHour() {
  return useQuery({
    queryKey: ["dashboard", "orders-by-hour"],
    queryFn: getOrdersByHour,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTopProducts(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboard", "top-products", limit],
    queryFn: () => getTopProducts(limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLowStockAlerts(threshold: number = 10) {
  return useQuery({
    queryKey: ["dashboard", "low-stock", threshold],
    queryFn: () => getLowStockAlerts(threshold),
    staleTime: 2 * 60 * 1000,
  })
}

export function usePendingActions() {
  return useQuery({
    queryKey: ["dashboard", "pending-actions"],
    queryFn: getPendingActions,
    staleTime: 30 * 1000,
  })
}

export function useLiveStats() {
  return useQuery({
    queryKey: ["dashboard", "live-stats"],
    queryFn: getLiveStats,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,  // Auto-refresh every 15s
  })
}

export function useRecentOrders(limit: number = 10) {
  return useQuery({
    queryKey: ["dashboard", "recent-orders", limit],
    queryFn: () => getRecentOrders(limit),
    staleTime: 30 * 1000,
  })
}

export function useCategoryRevenue() {
  return useQuery({
    queryKey: ["dashboard", "category-revenue"],
    queryFn: getCategoryRevenue,
    staleTime: 5 * 60 * 1000,
  })
}
