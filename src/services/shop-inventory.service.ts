import api from "@/lib/api"
import type { ApiResponse, ListParams, Paginated } from "@/types"

export interface ShopInventoryItem {
  id: string
  shop_id: string
  product_id: string
  product_name: string
  product_sku: string
  product_image: string
  price: number
  sale_price: number | null
  stock_quantity: number
  low_stock_threshold: number
  is_available: boolean
  is_low_stock: boolean
}

export interface StockMovement {
  id: string
  shop_id: string
  product_id: string
  product_name: string
  type: "ADJUSTMENT" | "SALE" | "RESTOCK" | "RETURN" | "DAMAGE" | "TRANSFER"
  quantity_change: number
  quantity_before: number
  quantity_after: number
  reason: string | null
  created_by: string
  created_at: string
}

export interface ShopInventoryListParams extends ListParams {
  low_stock?: boolean
  is_available?: boolean
  category?: string
}

export interface StockMovementsListParams extends ListParams {
  type?: string
  product_id?: string
  from?: string
  to?: string
}

interface RawInventoryListResponse {
  items: ShopInventoryItem[]
  total: number
  page: number
  limit: number
}

interface RawStockMovementsResponse {
  items: StockMovement[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

function serializeBool(value: boolean | undefined): "true" | "false" | undefined {
  if (value === undefined) return undefined
  return value ? "true" : "false"
}

export const shopInventoryService = {
  async list(params: ShopInventoryListParams = {}): Promise<Paginated<ShopInventoryItem>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.category !== undefined) queryParams.category = params.category
    const lowStock = serializeBool(params.low_stock)
    if (lowStock !== undefined) queryParams.low_stock = lowStock
    const isAvailable = serializeBool(params.is_available)
    if (isAvailable !== undefined) queryParams.is_available = isAvailable

    const { data } = await api.get<ApiResponse<RawInventoryListResponse>>(
      "/shop-products",
      { params: queryParams },
    )
    const payload = data.data
    const limit = payload.limit ?? cappedLimit
    const total = payload.total ?? 0
    return {
      items: payload.items as unknown as ShopInventoryItem[],
      pagination: {
        page: payload.page ?? params.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  async adjustStock(
    productId: string,
    quantity: number,
    reason: string,
  ): Promise<void> {
    await api.patch<ApiResponse<null>>(
      `/shop-products/${productId}/stock`,
      { quantity, reason },
    )
  },

  async bulkUpdatePrice(
    updates: Array<{ id: string; price: number; sale_price?: number | null }>,
  ): Promise<void> {
    await api.patch<ApiResponse<null>>(
      "/shop-products/bulk-price",
      { updates },
    )
  },

  async listMovements(
    shopId: string,
    params: StockMovementsListParams = {},
  ): Promise<Paginated<StockMovement>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.type !== undefined) queryParams.type = params.type
    if (params.product_id !== undefined) queryParams.product_id = params.product_id
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const { data } = await api.get<ApiResponse<RawStockMovementsResponse>>(
      `/shops/${shopId}/stock-movements`,
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

  async getLowStockCount(): Promise<number> {
    const { data } = await api.get<ApiResponse<{ count: number }>>(
      "/shop-products/low-stock-count",
    )
    return data.data.count
  },
}
