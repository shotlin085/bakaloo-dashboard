import api from "@/lib/api"
import type {
  ApiResponse,
  ListParams,
  Paginated,
  ShopStaff,
  ShopStaffRole,
  User,
} from "@/types"

/**
 * Shop_Staff_UI service — wraps the path-segmented backend endpoints documented
 * in design.md §"Folder & Module Layout" and Requirement 6.1 / 6.5 / 6.8 / 6.9:
 *
 *   GET    /api/v1/shops/[shopId]/staff
 *   GET    /api/v1/users?q=<query>
 *   POST   /api/v1/shops/[shopId]/staff
 *   PUT    /api/v1/shops/[shopId]/staff/[staffId]
 *   DELETE /api/v1/shops/[shopId]/staff/[staffId]
 *
 * Mirrors the structure of `shops.service.ts`:
 *   - the `limit` parameter is capped at 100 BEFORE the request is built so any
 *     user-supplied value (or the default 20) is bounded — Req 6.1 / 14.4 /
 *     design Property 12 (page-size cap);
 *   - the raw `{ staff, total, page, limit }` payload is normalized into a
 *     canonical `Paginated<ShopStaff>` so consumers can rely on the same
 *     `{ items, pagination }` shape used elsewhere in the dashboard;
 *   - request bodies are snake_case to match the backend Zod schemas
 *     (`createShopStaffSchema` / `updateShopStaffSchema`).
 *
 * The `X-Shop-Id` header is injected automatically by the axios request
 * interceptor from `useShopContextStore`; the path-segmented `shopId` here is
 * what the backend authoritatively scopes against.
 */

/** Hard ceiling on the number of rows the dashboard ever requests in one page. */
const MAX_LIMIT = 100

/** Default page size used when callers omit `limit`. */
const DEFAULT_LIMIT = 20

/** Page size for the user picker in the invite dialog (Req 6.3). */
const USER_SEARCH_LIMIT = 20

/**
 * Query params accepted by `GET /api/v1/shops/:shopId/staff`.
 * Mirrors `listShopStaffQuerySchema` on the backend
 * (`bakaloo-backend/src/modules/shop-staff/shop-staff.schema.js`).
 */
export interface ShopStaffListParams extends ListParams {
  role?: ShopStaffRole
  is_active?: boolean
}

/**
 * Raw payload returned by `GET /api/v1/shops/:shopId/staff` inside
 * `ApiResponse.data`. Normalized into `Paginated<ShopStaff>` before being
 * handed back to consumers.
 */
interface RawShopStaffListResponse {
  staff: ShopStaff[]
  total: number
  page: number
  limit: number
}

/**
 * Body for `POST /api/v1/shops/:shopId/staff`. snake_case is intentional —
 * the backend `createShopStaffSchema` validates these field names directly.
 */
export interface ShopStaffInviteBody {
  user_id: string
  role: ShopStaffRole
  permissions: string[]
  is_active: boolean
}

/**
 * Body for `PUT /api/v1/shops/:shopId/staff/:staffId`. All fields optional —
 * the backend requires at least one of `role`, `permissions`, `is_active`.
 */
export interface ShopStaffUpdateBody {
  role?: ShopStaffRole
  permissions?: string[]
  is_active?: boolean
}

/** Serialize a boolean filter to the `'true' | 'false'` strings the backend accepts. */
function serializeBool(value: boolean | undefined): "true" | "false" | undefined {
  if (value === undefined) return undefined
  return value ? "true" : "false"
}

export const shopStaffService = {
  /**
   * List staff for a shop with filters + pagination.
   *
   * The `limit` parameter is capped at 100 BEFORE the request is built so any
   * user-supplied value (or the default 20) is bounded — see Req 6.1 / 14.4
   * and design.md Property 12 (page-size cap).
   */
  async list(
    shopId: string,
    params: ShopStaffListParams = {},
  ): Promise<Paginated<ShopStaff>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const queryParams: Record<string, string | number> = { limit: cappedLimit }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined) queryParams.search = params.search
    if (params.role !== undefined) queryParams.role = params.role

    const isActive = serializeBool(params.is_active)
    if (isActive !== undefined) queryParams.is_active = isActive

    const { data } = await api.get<ApiResponse<RawShopStaffListResponse>>(
      `/shops/${shopId}/staff`,
      { params: queryParams },
    )

    const payload = data.data
    const limit = payload.limit ?? cappedLimit
    const total = payload.total ?? 0

    return {
      items: Array.isArray(payload.staff) ? payload.staff : [],
      pagination: {
        page: payload.page ?? params.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },

  /**
   * Search platform users for the staff invite picker (Req 6.3).
   *
   * Wraps `GET /api/v1/users?q=<query>&limit=20`. An empty / whitespace-only
   * query short-circuits to `[]` so the picker never issues a no-op request.
   * Both `{ users: [...] }` and a bare array under `data` are accepted to
   * remain forward-compatible with either response shape.
   */
  async searchUsers(query: string): Promise<User[]> {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []

    const { data } = await api.get<
      ApiResponse<{ users: User[] } | User[]>
    >("/users", {
      params: { q: trimmed, limit: USER_SEARCH_LIMIT },
    })

    const payload = data.data
    if (Array.isArray(payload)) return payload
    return Array.isArray(payload?.users) ? payload.users : []
  },

  /**
   * Invite (assign) a user to a shop as staff (Req 6.5).
   * Backend rejects with `STAFF_ALREADY_ASSIGNED` (409) when the user is
   * already on this shop and `STAFF_LIMIT_REACHED` / `STAFF_SHOP_LIMIT` (422)
   * when the 50-staff or 10-shop caps are hit; both surface to the caller as
   * axios errors (Req 6.6 / 6.10).
   */
  async invite(shopId: string, body: ShopStaffInviteBody): Promise<ShopStaff> {
    const { data } = await api.post<ApiResponse<ShopStaff>>(
      `/shops/${shopId}/staff`,
      body,
    )
    return data.data
  },

  /**
   * Update a staff record's role / permissions / is_active flag (Req 6.8).
   * The backend requires at least one of the three fields to be present.
   *
   * NOTE: Uses PATCH (not PUT) — the backend route is mounted as PATCH
   * because the body is a partial update. The previous `api.put` call was
   * a bug that caused 404s against the backend's PATCH-only handler.
   */
  async update(
    shopId: string,
    staffId: string,
    body: ShopStaffUpdateBody,
  ): Promise<ShopStaff> {
    const { data } = await api.patch<ApiResponse<ShopStaff>>(
      `/shops/${shopId}/staff/${staffId}`,
      body,
    )
    return data.data
  },

  /**
   * Reset a staff member's password (generates a temporary password).
   * Returns the temp password — must be shown once and never persisted.
   */
  async resetPassword(
    shopId: string,
    staffId: string,
  ): Promise<{ temp_password: string }> {
    const { data } = await api.post<ApiResponse<{ temp_password: string }>>(
      `/shops/${shopId}/staff/${staffId}/reset-password`,
    )
    return data.data
  },

  /**
   * Soft-delete (deactivate) a staff member (Req 6.9). The backend returns
   * `null` data on success; the dashboard collapses that to `void`.
   */
  async remove(shopId: string, staffId: string): Promise<void> {
    await api.delete<ApiResponse<null>>(`/shops/${shopId}/staff/${staffId}`)
  },
}
