import api from "@/lib/api"
import type {
  ApiResponse,
  ListParams,
  Paginated,
  Product,
  ShopProduct,
} from "@/types"

/**
 * Query params accepted by `GET /api/v1/shop-products`.
 *
 * Mirrors `listShopProductsQuerySchema` on the backend
 * (`bakaloo-backend/src/modules/shop-products/shop-products.schema.js`).
 * Booleans are accepted here for ergonomics and serialized to the
 * `'true' | 'false'` strings the backend expects before the request is built.
 *
 * `category` is passed through per task 8.1 and Req 7.3 — surfacing the
 * value here keeps the dashboard hook contract stable when the backend
 * adds the filter and is harmless until then (Fastify ignores unknown
 * querystring properties unless the route schema sets
 * `additionalProperties: false`).
 */
export interface ShopProductsListParams extends ListParams {
  is_available?: boolean
  low_stock?: boolean
  category?: string
}

/**
 * Body accepted by `POST /api/v1/shop-products`.
 * Matches `createShopProductSchema` on the backend plus `is_featured`,
 * which the dashboard's `shopProductSchema` carries (Req 7.4, 7.5).
 *
 * `shop_id` is intentionally absent — the backend derives shop scope from
 * the `X-Shop-Id` header injected by the axios request interceptor.
 */
export interface ShopProductCreateBody {
  product_id: string
  price?: number | null
  sale_price?: number | null
  cost_price?: number | null
  stock_quantity?: number
  low_stock_threshold?: number
  max_order_qty?: number
  is_available?: boolean
  is_featured?: boolean
}

/**
 * Body accepted by `PATCH /api/v1/shop-products/[id]`.
 * Matches `updateShopProductSchema` on the backend (partial update, must
 * carry at least one field). `stock_quantity` is excluded because the
 * backend exposes a dedicated `PATCH /:id/stock` endpoint with row-level
 * locking — see backend service `updateStock` (Req 7.9, design §8).
 */
export interface ShopProductUpdateBody {
  price?: number | null
  sale_price?: number | null
  cost_price?: number | null
  low_stock_threshold?: number
  max_order_qty?: number
  is_available?: boolean
  is_featured?: boolean
}

/**
 * Raw payload returned by `GET /api/v1/shop-products` inside
 * `ApiResponse.data`. The Dashboard normalizes this into a
 * `Paginated<ShopProduct>` so consumers can rely on the canonical
 * `{ items, pagination }` shape (matches `shops.service.ts` and
 * `shop-financials.service.ts`).
 */
interface RawShopProductsListResponse {
  items: ShopProduct[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const CATALOG_SEARCH_LIMIT = 20

/** Serialize a boolean filter to the `'true' | 'false'` strings the backend accepts. */
function serializeBool(value: boolean | undefined): "true" | "false" | undefined {
  if (value === undefined) return undefined
  return value ? "true" : "false"
}

export const shopProductsService = {
  /**
   * List shop products for the Active_Shop_Id (Req 7.1, 7.3).
   *
   * The backend reads the shop scope from the `X-Shop-Id` header that the
   * axios request interceptor injects from `Shop_Context_Store`; this
   * service therefore never sets the header explicitly. Callers that hit
   * this method while the store is in `ALL_SHOPS` mode would receive a
   * 400 from the backend, so the hook (`useShopProductsList`) gates the
   * query with `enabled: mode === "SINGLE_SHOP"` — see design §8.
   *
   * The `limit` parameter is capped at 100 BEFORE the request is built so
   * any user-supplied value (or the default 20) is bounded — see
   * Requirements 7.1, 14.4 and design Property 12 (page-size cap).
   */
  async list(
    params: ShopProductsListParams = {},
  ): Promise<Paginated<ShopProduct>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.category !== undefined) queryParams.category = params.category

    const isAvailable = serializeBool(params.is_available)
    if (isAvailable !== undefined) queryParams.is_available = isAvailable

    const lowStock = serializeBool(params.low_stock)
    if (lowStock !== undefined) queryParams.low_stock = lowStock

    const { data } = await api.get<ApiResponse<RawShopProductsListResponse>>(
      "/shop-products",
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

  /**
   * Search the master product catalog for the Add_Product_Dialog typeahead
   * (Req 7.4, design §8). Returns at most 20 master-catalog products; the
   * dialog then lets the operator pick one and post the per-shop fields
   * via `add()`.
   *
   * NOTE on URL params — task 8.1 names `GET /api/v1/products?q=<query>`.
   * The backend `/products` list endpoint
   * (`bakaloo-backend/src/modules/products/products.schema.js` →
   * `listProductsSchema`) accepts `search` (not `q`) for substring
   * filtering; we send `search` so the call actually filters the
   * catalog. The result shape is the standard `Product[]` envelope
   * (`{ data, pagination }`) used elsewhere in the dashboard
   * (`products.service.ts`).
   */
  async searchCatalog(query: string): Promise<Product[]> {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []

    const { data } = await api.get<{
      success: boolean
      message: string
      data: Product[]
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>("/products", {
      params: { search: trimmed, limit: CATALOG_SEARCH_LIMIT },
    })

    return Array.isArray(data.data) ? data.data : []
  },

  /**
   * Add a master-catalog product to the active shop's inventory (Req 7.4).
   * The backend derives shop scope from the `X-Shop-Id` header injected
   * by the axios interceptor.
   */
  async add(body: ShopProductCreateBody): Promise<ShopProduct> {
    const { data } = await api.post<ApiResponse<ShopProduct>>(
      "/shop-products",
      body,
    )
    return data.data
  },

  /**
   * Update non-stock fields on a shop product (Req 7.9).
   *
   * NOTE on HTTP verb — task 8.1 names `PUT /api/v1/shop-products/[id]`.
   * The backend route is mounted as `PATCH` (see
   * `bakaloo-backend/src/modules/shop-products/shop-products.routes.js`
   * → `fastify.patch('/:id', …)`) because the body is a partial update.
   * We therefore use `PATCH` so the call actually reaches the handler;
   * stock changes go through the dedicated `PATCH /:id/stock` endpoint
   * which is owned by a future task.
   */
  async update(id: string, body: ShopProductUpdateBody): Promise<ShopProduct> {
    const { data } = await api.patch<ApiResponse<ShopProduct>>(
      `/shop-products/${id}`,
      body,
    )
    return data.data
  },

  /**
   * Soft-delete a shop product (Req 7.10). The backend keeps the row
   * with `deleted_at` set so historical orders still resolve.
   */
  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse<null>>(`/shop-products/${id}`)
  },
}
