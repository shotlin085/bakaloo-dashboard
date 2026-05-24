import api from "@/lib/api"
import type { ApiResponse, Paginated } from "@/types"
import type {
  ShopFinancialPeriod,
  ShopFinancialPeriodType,
} from "@/types/shop-financial.types"

/**
 * Query params accepted by `GET /api/v1/shop-financials` (Req 8.3, 8.6).
 *
 * Mirrors `listShopFinancialsQuerySchema` on the backend
 * (`bakaloo-backend/src/modules/shop-financials/shop-financials.schema.js`).
 *
 * Shop scope: the backend derives the shop from the `X-Shop-Id` header (set
 * automatically by the axios request interceptor from `Shop_Context_Store`)
 * or from the JWT `shop_id`. We still accept `shop_id` here so the hook
 * (`useShopFinancials`) can pass `Active_Shop_Id` explicitly; we then
 * forward it via an explicit `X-Shop-Id` header so each call is independent
 * of whatever value is in the shared store at request time
 * (defence-in-depth around design.md Property 4 — X-Shop-Id invariant).
 *
 * `from` / `to` are inclusive `YYYY-MM-DD` calendar dates (the backend
 * rejects timezone-suffixed ISO strings).
 */
export interface ShopFinancialsListParams {
  shop_id: string
  period_type: ShopFinancialPeriodType
  from?: string
  to?: string
  page?: number
  limit?: number
}

/**
 * Raw payload returned by `GET /api/v1/shop-financials` inside
 * `ApiResponse.data`. The Dashboard normalizes this into a
 * `Paginated<ShopFinancialPeriod>` so consumers can rely on the canonical
 * `{ items, pagination }` shape (matches `shops.service.ts`).
 */
interface RawShopFinancialsListResponse {
  items: ShopFinancialPeriod[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const shopFinancialsService = {
  /**
   * List shop-financial period rows for `shop_id`, optionally filtered by
   * period type and date range. Returns a paginated envelope so the period
   * table at `/shop-financials` (design.md §9, Req 8.6) can drive its
   * 20/page pager directly.
   *
   * The `limit` parameter is capped at 100 BEFORE the request is built so
   * any user-supplied value (or the default 20) is bounded — see
   * Requirements 8.3, 14.4 and design.md Property 12 (page-size cap).
   *
   * Read-only by construction — there are no create / update / delete
   * methods on this service. Writes are owned by the backend
   * Settlement_Worker and Payout_Worker (Req 8.9).
   */
  async list(
    params: ShopFinancialsListParams,
  ): Promise<Paginated<ShopFinancialPeriod>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const queryParams: Record<string, string | number> = {
      period_type: params.period_type,
      limit: cappedLimit,
    }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to

    const { data } = await api.get<ApiResponse<RawShopFinancialsListResponse>>(
      "/shop-financials",
      {
        params: queryParams,
        headers: { "X-Shop-Id": params.shop_id },
      },
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
