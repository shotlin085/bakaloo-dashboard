/**
 * HQ (Headquarters) service — API calls for cross-shop admin views.
 *
 * All endpoints are under `/api/v1/admin/*` and require Super_Admin JWT.
 * The service layer stays free of TanStack Query concerns; hooks in
 * `useHQ.ts` own caching and invalidation.
 *
 * Tasks: 20.1–20.7
 */

import api from "@/lib/api"
import type { ApiResponse, Paginated } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HQDashboardKPI {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalShops: number
  activeShops: number
  totalRiders: number
  onlineRiders: number
  avgOrderValue: number
  pendingOrders: number
  todayRevenue: number
  todayOrders: number
  revenueChange: number
  ordersChange: number
}

export interface HQOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  shop_id: string
  shop_name: string
  status: string
  total_amount: number
  payment_method: string
  payment_status: string
  created_at: string
  rider_name: string | null
}

export interface HQOrderFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  shop_id?: string
  startDate?: string
  endDate?: string
}

export interface HQTransaction {
  id: string
  shop_id: string
  shop_name: string
  type: string
  amount: number
  description: string
  reference_id: string | null
  created_at: string
}

export interface HQFinancial {
  id: string
  shop_id: string
  shop_name: string
  period_type: string
  period_start: string
  period_end: string
  total_revenue: number
  total_orders: number
  commission_amount: number
  payout_amount: number
  payout_status: string
}

export interface HQFinanceFilters {
  page?: number
  limit?: number
  shop_id?: string
  type?: string
  startDate?: string
  endDate?: string
  payout_status?: string
}

export interface RunSettlementPayload {
  /** Settle only this shop; omit to settle every active shop. */
  shopId?: string
  /** UTC day to settle, 'YYYY-MM-DD'; defaults to today server-side. */
  periodDate?: string
}

export interface RunSettlementResult {
  mode: "SINGLE_SHOP" | "ALL_SHOPS"
  periodStart: string
  shopId?: string
  summary?: { settled: number; skipped: number; failed: number; periodStart: string }
}

export interface HQReportType {
  id: string
  name: string
  description: string
}

export interface HQReportFilters {
  report_type: string
  shop_id?: string
  startDate: string
  endDate: string
  format?: "json" | "csv"
}

export interface HQAuditLog {
  id: string
  admin_id: string
  admin_name: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string
  user_agent: string
  created_at: string
}

export interface HQAuditLogFilters {
  page?: number
  limit?: number
  admin_id?: string
  action?: string
  entity_type?: string
  startDate?: string
  endDate?: string
}

export interface HQRider {
  id: string
  name: string
  phone: string
  email: string | null
  avatar_url: string | null
  vehicle_type: string
  vehicle_number: string
  is_active: boolean
  is_approved: boolean
  is_online: boolean
  rating: number
  total_deliveries: number
  created_at: string
}

export interface HQRiderFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  is_approved?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

function capLimit(limit?: number): number {
  return Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
}

export const hqService = {
  // ── Dashboard KPIs (20.1) ─────────────────────────────────────────────────
  async getDashboardKPIs(): Promise<HQDashboardKPI> {
    const { data } = await api.get<ApiResponse<HQDashboardKPI>>(
      "/admin/dashboard/kpis",
    )
    return data.data
  },

  // ── Orders (20.3) ─────────────────────────────────────────────────────────
  async getOrders(filters: HQOrderFilters = {}): Promise<Paginated<HQOrder>> {
    const params: Record<string, string | number> = {
      limit: capLimit(filters.limit),
    }
    if (filters.page) params.page = filters.page
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.shop_id) params.shop_id = filters.shop_id
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const { data } = await api.get<
      ApiResponse<{ orders: HQOrder[]; total: number; page: number; limit: number }>
    >("/admin/orders", { params })

    const payload = data.data
    const limit = payload.limit ?? capLimit(filters.limit)
    const total = payload.total ?? 0

    return {
      items: payload.orders,
      pagination: {
        page: payload.page ?? filters.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  // ── Finance (20.4) ────────────────────────────────────────────────────────
  async getTransactions(
    filters: HQFinanceFilters = {},
  ): Promise<Paginated<HQTransaction>> {
    const params: Record<string, string | number> = {
      limit: capLimit(filters.limit),
    }
    if (filters.page) params.page = filters.page
    if (filters.shop_id) params.shop_id = filters.shop_id
    if (filters.type) params.type = filters.type
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const { data } = await api.get<
      ApiResponse<{
        transactions: HQTransaction[]
        total: number
        page: number
        limit: number
      }>
    >("/admin/finance/transactions", { params })

    const payload = data.data
    const limit = payload.limit ?? capLimit(filters.limit)
    const total = payload.total ?? 0

    return {
      items: payload.transactions,
      pagination: {
        page: payload.page ?? filters.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  async getFinancials(
    filters: HQFinanceFilters = {},
  ): Promise<Paginated<HQFinancial>> {
    const params: Record<string, string | number> = {
      limit: capLimit(filters.limit),
    }
    if (filters.page) params.page = filters.page
    if (filters.shop_id) params.shop_id = filters.shop_id
    if (filters.payout_status) params.payout_status = filters.payout_status
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const { data } = await api.get<
      ApiResponse<{
        financials: HQFinancial[]
        total: number
        page: number
        limit: number
      }>
    >("/admin/finance/financials", { params })

    const payload = data.data
    const limit = payload.limit ?? capLimit(filters.limit)
    const total = payload.total ?? 0

    return {
      items: payload.financials,
      pagination: {
        page: payload.page ?? filters.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  async markPaid(financialId: string): Promise<void> {
    await api.post(`/admin/finance/financials/${financialId}/mark-paid`)
  },

  async runSettlementNow(
    payload: RunSettlementPayload = {},
  ): Promise<RunSettlementResult> {
    const { data } = await api.post<ApiResponse<RunSettlementResult>>(
      "/admin/finance/settlement/run",
      payload,
    )
    return data.data
  },

  async exportPayoutReport(filters: HQFinanceFilters = {}): Promise<Blob> {
    const params: Record<string, string | number> = {}
    if (filters.shop_id) params.shop_id = filters.shop_id
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const { data } = await api.get("/admin/finance/payout-report", {
      params,
      responseType: "blob",
    })
    return data as Blob
  },

  // ── Reports (20.5) ────────────────────────────────────────────────────────
  async getReportTypes(): Promise<HQReportType[]> {
    const { data } = await api.get<ApiResponse<{ reports: HQReportType[] }>>(
      "/admin/reports/types",
    )
    return data.data.reports
  },

  async generateReport(
    filters: HQReportFilters,
  ): Promise<Record<string, unknown>[]> {
    const { data } = await api.get<
      ApiResponse<{ rows: Record<string, unknown>[] }>
    >("/admin/reports/generate", { params: filters })
    return data.data.rows
  },

  async exportReportCSV(filters: HQReportFilters): Promise<Blob> {
    const { data } = await api.get("/admin/reports/generate", {
      params: { ...filters, format: "csv" },
      responseType: "blob",
    })
    return data as Blob
  },

  // ── Audit Logs (20.6) ─────────────────────────────────────────────────────
  async getAuditLogs(
    filters: HQAuditLogFilters = {},
  ): Promise<Paginated<HQAuditLog>> {
    const params: Record<string, string | number> = {
      limit: capLimit(filters.limit),
    }
    if (filters.page) params.page = filters.page
    if (filters.admin_id) params.admin_id = filters.admin_id
    if (filters.action) params.action = filters.action
    if (filters.entity_type) params.entity_type = filters.entity_type
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const { data } = await api.get<
      ApiResponse<{
        logs: HQAuditLog[]
        total: number
        page: number
        limit: number
      }>
    >("/admin/audit-logs", { params })

    const payload = data.data
    const limit = payload.limit ?? capLimit(filters.limit)
    const total = payload.total ?? 0

    return {
      items: payload.logs,
      pagination: {
        page: payload.page ?? filters.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  // ── Riders (20.7) ─────────────────────────────────────────────────────────
  async getRiders(filters: HQRiderFilters = {}): Promise<Paginated<HQRider>> {
    const params: Record<string, string | number | boolean> = {
      limit: capLimit(filters.limit),
    }
    if (filters.page) params.page = filters.page
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.is_approved !== undefined)
      params.is_approved = filters.is_approved

    const { data } = await api.get<
      ApiResponse<{
        riders: HQRider[]
        total: number
        page: number
        limit: number
      }>
    >("/admin/riders", { params })

    const payload = data.data
    const limit = payload.limit ?? capLimit(filters.limit)
    const total = payload.total ?? 0

    return {
      items: payload.riders,
      pagination: {
        page: payload.page ?? filters.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  async approveRider(riderId: string): Promise<void> {
    await api.post(`/admin/riders/${riderId}/approve`)
  },

  async rejectRider(riderId: string, reason: string): Promise<void> {
    await api.post(`/admin/riders/${riderId}/reject`, { reason })
  },
}
