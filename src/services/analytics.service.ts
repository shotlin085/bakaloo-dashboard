import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  SalesAnalytics,
  ProductPerformance,
  CustomerCohort,
  DeliveryAnalytics,
  FinancialReport,
  ComparisonAnalytics,
  DeadStockProduct,
  GeographicData,
  CartEnhancementAnalytics,
  GroupBy,
} from "@/types/analytics.types"

export async function getSalesAnalytics(
  startDate: string,
  endDate: string,
  groupBy: GroupBy = "day"
): Promise<SalesAnalytics> {
  const { data } = await api.get<ApiResponse<SalesAnalytics>>(
    "/admin/analytics/sales",
    { params: { startDate, endDate, groupBy } }
  )
  return data.data
}

export async function getProductPerformance(
  startDate: string,
  endDate: string,
  limit = 20
): Promise<ProductPerformance[]> {
  const { data } = await api.get<ApiResponse<ProductPerformance[]>>(
    "/admin/analytics/product-performance",
    { params: { startDate, endDate, limit } }
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function getCustomerCohorts(): Promise<CustomerCohort[]> {
  const { data } = await api.get<ApiResponse<CustomerCohort[]>>(
    "/admin/analytics/customer-cohorts"
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function getDeliveryAnalytics(
  startDate: string,
  endDate: string
): Promise<DeliveryAnalytics> {
  const { data } = await api.get<ApiResponse<DeliveryAnalytics>>(
    "/admin/analytics/delivery",
    { params: { startDate, endDate } }
  )
  return data.data
}

export async function getFinancialReport(
  startDate: string,
  endDate: string
): Promise<FinancialReport> {
  const { data } = await api.get<ApiResponse<FinancialReport>>(
    "/admin/analytics/financial",
    { params: { startDate, endDate } }
  )
  return data.data
}

export async function getComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): Promise<ComparisonAnalytics> {
  const { data } = await api.get<ApiResponse<ComparisonAnalytics>>(
    "/admin/analytics/comparison",
    { params: { period1Start, period1End, period2Start, period2End } }
  )
  return data.data
}

export async function exportPdf(
  startDate: string,
  endDate: string
): Promise<Blob> {
  const { data } = await api.get("/admin/analytics/export-pdf", {
    params: { startDate, endDate },
    responseType: "blob",
  })
  return data
}

export async function exportExcel(
  startDate: string,
  endDate: string
): Promise<Blob> {
  const { data } = await api.get("/admin/analytics/export-excel", {
    params: { startDate, endDate },
    responseType: "blob",
  })
  return data
}

export async function getDeadStock(limit = 20): Promise<DeadStockProduct[]> {
  const { data } = await api.get<ApiResponse<DeadStockProduct[]>>(
    "/admin/analytics/dead-stock",
    { params: { limit } }
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function getGeographicAnalytics(
  startDate: string,
  endDate: string
): Promise<GeographicData[]> {
  const { data } = await api.get<ApiResponse<GeographicData[]>>(
    "/admin/analytics/geographic",
    { params: { startDate, endDate } }
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function getCartEnhancementAnalytics(
  startDate: string,
  endDate: string
): Promise<CartEnhancementAnalytics> {
  const { data } = await api.get<ApiResponse<CartEnhancementAnalytics>>(
    "/admin/analytics/cart-enhancements",
    { params: { startDate, endDate } }
  )
  return data.data
}
