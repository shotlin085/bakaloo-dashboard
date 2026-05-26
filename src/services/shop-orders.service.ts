import api from "@/lib/api"
import type { ApiResponse, ListParams, Paginated } from "@/types"

/** Order status enum matching backend */
export type ShopOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"

export interface ShopOrder {
  id: string
  order_number: string
  shop_id: string
  customer_name: string
  customer_phone: string
  items_count: number
  total_amount: number
  status: ShopOrderStatus
  payment_method: string
  rider_id: string | null
  rider_name: string | null
  created_at: string
  updated_at: string
}

export interface ShopOrdersListParams extends ListParams {
  status?: ShopOrderStatus
  from?: string
  to?: string
  payment_method?: string
}

interface RawShopOrdersListResponse {
  items: ShopOrder[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const shopOrdersService = {
  async list(params: ShopOrdersListParams = {}): Promise<Paginated<ShopOrder>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.status !== undefined) queryParams.status = params.status
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to
    if (params.payment_method !== undefined) queryParams.payment_method = params.payment_method

    const { data } = await api.get<ApiResponse<RawShopOrdersListResponse>>(
      "/shop-orders",
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

  async updateStatus(orderId: string, status: ShopOrderStatus): Promise<ShopOrder> {
    const { data } = await api.patch<ApiResponse<ShopOrder>>(
      `/shop-orders/${orderId}/status`,
      { status },
    )
    return data.data
  },

  async assignRider(orderId: string, riderId: string): Promise<ShopOrder> {
    const { data } = await api.patch<ApiResponse<ShopOrder>>(
      `/shop-orders/${orderId}/assign-rider`,
      { rider_id: riderId },
    )
    return data.data
  },

  async cancel(orderId: string, reason: string): Promise<ShopOrder> {
    const { data } = await api.post<ApiResponse<ShopOrder>>(
      `/shop-orders/${orderId}/cancel`,
      { reason },
    )
    return data.data
  },

  async refund(orderId: string, amount: number, reason: string): Promise<ShopOrder> {
    const { data } = await api.post<ApiResponse<ShopOrder>>(
      `/shop-orders/${orderId}/refund`,
      { amount, reason },
    )
    return data.data
  },

  async getPackingSlip(orderId: string): Promise<Blob> {
    const response = await api.get(`/shop-orders/${orderId}/packing-slip`, {
      responseType: "blob",
    })
    return response.data
  },

  async exportCsv(params: ShopOrdersListParams = {}): Promise<Blob> {
    const queryParams: Record<string, string | number> = {}
    if (params.status !== undefined) queryParams.status = params.status
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const response = await api.get("/shop-orders/export", {
      params: queryParams,
      responseType: "blob",
    })
    return response.data
  },
}
