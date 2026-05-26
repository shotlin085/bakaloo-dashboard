import api from "@/lib/api"
import type { ApiResponse, ListParams, Paginated } from "@/types"

export interface ShopReport {
  id: string
  shop_id: string
  type: "SALES" | "INVENTORY" | "ORDERS" | "REVENUE" | "PERFORMANCE"
  title: string
  period_start: string
  period_end: string
  data: Record<string, unknown>
  created_at: string
}

export interface ShopReportsListParams extends ListParams {
  type?: string
  from?: string
  to?: string
}

interface RawReportsResponse {
  items: ShopReport[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const shopReportsService = {
  async list(params: ShopReportsListParams = {}): Promise<Paginated<ShopReport>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.type !== undefined) queryParams.type = params.type
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const { data } = await api.get<ApiResponse<RawReportsResponse>>(
      "/shop-reports",
      { params: queryParams },
    )
    const payload = data.data
    const limit = payload.limit ?? cappedLimit
    const total = payload.total ?? 0
    return {
      items: payload.items,
      pagination: {
        page: payload.page ?? params.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  async exportCsv(params: ShopReportsListParams = {}): Promise<Blob> {
    const queryParams: Record<string, string | number> = {}
    if (params.type !== undefined) queryParams.type = params.type
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const response = await api.get("/shop-reports/export", {
      params: queryParams,
      responseType: "blob",
    })
    return response.data
  },
}
