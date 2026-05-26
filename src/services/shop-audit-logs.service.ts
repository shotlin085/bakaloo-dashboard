import api from "@/lib/api"
import type { ApiResponse, ListParams, Paginated } from "@/types"

export interface ShopAuditLog {
  id: string
  shop_id: string
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface ShopAuditLogsListParams extends ListParams {
  action?: string
  entity_type?: string
  user_id?: string
  from?: string
  to?: string
}

interface RawAuditLogsResponse {
  items: ShopAuditLog[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const shopAuditLogsService = {
  async list(params: ShopAuditLogsListParams = {}): Promise<Paginated<ShopAuditLog>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.action !== undefined) queryParams.action = params.action
    if (params.entity_type !== undefined) queryParams.entity_type = params.entity_type
    if (params.user_id !== undefined) queryParams.user_id = params.user_id
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const { data } = await api.get<ApiResponse<RawAuditLogsResponse>>(
      "/shop-audit-logs",
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
}
