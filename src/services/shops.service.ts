import api from "@/lib/api"
import type { ShopInput } from "@/lib/shop-validations"
import type { ApiResponse, ListParams, Paginated, Shop } from "@/types"

/**
 * Query params accepted by `GET /api/v1/shops`.
 *
 * Mirrors `listShopsQuerySchema` on the backend
 * (`bakaloo-backend/src/modules/shops/shops.schema.js`). Booleans are
 * accepted here for ergonomics and serialized to the `'true' | 'false'`
 * strings the backend expects before the request is built.
 */
export interface ShopsListParams extends ListParams {
  is_active?: boolean
  is_verified?: boolean
  city?: string
}

/**
 * Raw payload returned by `GET /api/v1/shops` inside `ApiResponse.data`.
 * The Dashboard normalizes this into a `Paginated<Shop>` so consumers can
 * rely on the canonical `{ items, pagination }` shape (see design.md
 * §"Central Query-Key Factory" and `Paginated<T>` in common.types.ts).
 */
interface RawShopsListResponse {
  shops: Shop[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

/** Serialize a boolean filter to the `'true' | 'false'` strings the backend accepts. */
function serializeBool(value: boolean | undefined): "true" | "false" | undefined {
  if (value === undefined) return undefined
  return value ? "true" : "false"
}

export const shopsService = {
  /**
   * List shops with filters + pagination.
   *
   * The `limit` parameter is capped at 100 BEFORE the request is built so
   * any user-supplied value (or the default 20) is bounded — see
   * Requirements 5.1 / 14.4 and design.md Property 12 (page-size cap).
   */
  async list(params: ShopsListParams = {}): Promise<Paginated<Shop>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.city !== undefined) queryParams.city = params.city

    const isActive = serializeBool(params.is_active)
    if (isActive !== undefined) queryParams.is_active = isActive

    const isVerified = serializeBool(params.is_verified)
    if (isVerified !== undefined) queryParams.is_verified = isVerified

    const { data } = await api.get<ApiResponse<RawShopsListResponse>>("/shops", {
      params: queryParams,
    })

    const payload = data.data
    const limit = payload.limit ?? cappedLimit
    const total = payload.total ?? 0

    return {
      items: payload.shops,
      pagination: {
        page: payload.page ?? params.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  /**
   * Active shops for the Super_Admin Shop_Switcher popover (Req 3.3).
   * Requests up to 100 active shops in a single round-trip so the popover
   * can render its full list without a follow-up page request.
   */
  listActive(): Promise<Paginated<Shop>> {
    return shopsService.list({ is_active: true, limit: MAX_LIMIT })
  },

  /** Get a single shop by id — feeds `/shops/[shopId]` detail tabs (Req 5.7). */
  async get(id: string): Promise<Shop> {
    const { data } = await api.get<ApiResponse<Shop>>(`/shops/${id}`)
    return data.data
  },

  /**
   * Create a new shop — POST /shops (Req 5.6).
   *
   * Returns the created `Shop` so callers can redirect to `/shops/[id]`.
   * The backend auto-generates `slug` and `branch_code`; any matching
   * fields on the form payload are silently ignored server-side
   * (`createShopSchema` strips unknown keys), so we forward the parsed
   * `ShopInput` as-is and let the form code stay flat.
   *
   * Cache invalidation (`qk.shops(*)`) is the caller's responsibility —
   * services stay free of TanStack Query concerns; mutation hooks in
   * `useShops.ts` (task 5.2) own that side-effect.
   */
  async create(body: ShopInput): Promise<Shop> {
    const { data } = await api.post<ApiResponse<Shop>>("/shops", body)
    return data.data
  },

  /**
   * Update an existing shop — PATCH /shops/:id (Req 5.10).
   *
   * Backend route is PATCH (not PUT); see
   * `bakaloo-backend/src/modules/shops/shops.routes.js`. The body is a
   * partial `ShopInput` because `updateShopSchema` marks every field
   * optional and additionally accepts `is_active` / `is_verified` toggles
   * (used by `reactivate` and `setVerified` below).
   *
   * Callers invalidate `qk.shop(id)` and `qk.shops(*)` on success.
   */
  async update(
    id: string,
    body: Partial<ShopInput> & { is_active?: boolean; is_verified?: boolean },
  ): Promise<Shop> {
    const { data } = await api.patch<ApiResponse<Shop>>(`/shops/${id}`, body)
    return data.data
  },

  /**
   * Soft-delete a shop — DELETE /shops/:id (Req 5.9).
   *
   * The backend marks the row deleted (it is excluded from list queries
   * unless `include_deleted=true`) and returns `success(null, ...)`, so
   * this resolves to `void`. Callers show a confirmation dialog before
   * invoking and invalidate `qk.shops(*)` + `qk.shop(id)` on success.
   */
  async softDelete(id: string): Promise<void> {
    await api.delete<ApiResponse<null>>(`/shops/${id}`)
  },

  /**
   * Reactivate a previously deactivated shop (Req 5.8).
   *
   * The backend does not expose a dedicated reactivate endpoint; the
   * `is_active` toggle lives on the standard PATCH update payload
   * (`updateShopSchema.is_active: z.boolean().optional()`). We delegate
   * to `update` with `{ is_active: true }` so a single code path drives
   * both deactivate and reactivate flows.
   */
  reactivate(id: string): Promise<Shop> {
    return shopsService.update(id, { is_active: true })
  },

  /**
   * Toggle the verified flag on a shop (Req 5.8).
   *
   * Same shape as `reactivate`: the backend folds `is_verified` into the
   * shared PATCH update endpoint rather than exposing a dedicated route,
   * so we PATCH with `{ is_verified: value }`. The boolean is forwarded
   * verbatim — the caller decides whether to verify or unverify.
   */
  setVerified(id: string, value: boolean): Promise<Shop> {
    return shopsService.update(id, { is_verified: value })
  },
}
