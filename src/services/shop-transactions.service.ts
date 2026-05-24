import api from "@/lib/api"
import type {
  ApiResponse,
  ListParams,
  Paginated,
  ShopTransaction,
  ShopTransactionType,
} from "@/types"

/**
 * Shop_Transactions service — read-only, append-only ledger for the
 * Active_Shop_Id.
 *
 * Reads `GET /api/v1/shop-transactions`, which is scoped by the
 * `X-Shop-Id` header injected by the axios interceptor (see
 * `src/lib/api.ts`) — vendors are pinned by their JWT and Super_Admin in
 * SINGLE_SHOP mode supplies the header through `Shop_Context_Store`. There
 * is no `shop_id` query param to set here (Requirement 9.2 / design §10).
 *
 * READ-ONLY by design — Requirements 9.5 and 15.1 require the Dashboard to
 * expose no create / edit / delete affordance for ledger rows. This service
 * therefore exports only `list()`. The backend module
 * (`bakaloo-backend/src/modules/shop-transactions`) likewise registers GET
 * handlers only; internal callers (orders, refunds, payouts) write through
 * `LedgerWriteService.append()` server-side.
 *
 * Pagination: the page-size cap of 100 (Requirements 9.2 / 14.4) is
 * enforced HERE before the request is built so any user-supplied or
 * defaulted limit is bounded — mirrors `shops.service.ts` and validates
 * design.md Property 12 (page-size cap).
 */

/**
 * Backend-supported `reference_type` filter values. Mirrors the
 * `REFERENCE_TYPES` enum in
 * `bakaloo-backend/src/modules/shop-transactions/shop-transactions.schema.js`.
 * The dashboard `ShopTransaction.reference_type` field is `string | null`
 * on read, so we keep this union scoped to filter inputs only — the wire
 * format remains permissive for forward compatibility.
 */
export type ShopTransactionReferenceType =
  | "ORDER"
  | "PAYOUT"
  | "ADJUSTMENT"
  | "EXPENSE"

/**
 * Filter shape accepted by `shopTransactionsService.list()`. Matches the
 * Shop_Transactions_UI page filters from Requirement 9.4 (`type`
 * multi-select, date range, `reference_type`, free-text search across
 * description debounced 300 ms on the page), plus the standard
 * page/limit/search inherited from `ListParams`.
 *
 * Notes:
 *   - `type` is an array (multi-select on the page). When the array carries
 *     a single value it is sent as a plain string to match the backend's
 *     enum schema; multi-value selection is sent via axios's default
 *     repeated-key serialization (`?type=A&type=B`).
 *   - `from` / `to` accept ISO 8601 date-time strings (e.g.
 *     `2024-12-25T00:00:00Z`). Forwarded verbatim — the backend coerces
 *     them into Date.
 *   - `search` is forwarded as `search` and aligns with `ListParams.search`
 *     so the page-level 300 ms debounce flows straight through.
 */
export interface ShopTransactionsListParams extends ListParams {
  type?: ShopTransactionType[]
  from?: string
  to?: string
  reference_type?: ShopTransactionReferenceType
}

/**
 * Raw payload returned by `GET /api/v1/shop-transactions` inside
 * `ApiResponse.data` (see backend controller `list()`):
 *   `{ items, total, page, limit }`
 * The dashboard normalizes this into the canonical `Paginated<T>` shape
 * (`{ items, pagination }`) so consumers can rely on a single envelope.
 */
interface RawShopTransactionsListResponse {
  items: ShopTransaction[]
  total: number
  page: number
  limit: number
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const shopTransactionsService = {
  /**
   * List ledger entries for the Active_Shop_Id, newest first.
   *
   * Behavior:
   *   - `limit = Math.min(params.limit ?? 20, 100)` is computed BEFORE the
   *     request is built (Requirements 9.2 / 14.4 / design Property 12).
   *   - Filters are forwarded only when present so we never produce empty
   *     query keys that defeat the backend's Redis cache.
   *   - `type` is forwarded as a repeated query param when more than one
   *     value is supplied; a single value is sent as a plain string for
   *     symmetry with the backend's single-value enum schema.
   *
   * @param params — page, limit, type[], from/to, reference_type, search
   * @returns `Paginated<ShopTransaction>` — a `{ items, pagination }` envelope
   */
  async list(
    params: ShopTransactionsListParams = {},
  ): Promise<Paginated<ShopTransaction>> {
    const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const queryParams: Record<string, string | number | string[]> = {
      limit: cappedLimit,
    }
    if (params.page !== undefined) queryParams.page = params.page
    if (params.search !== undefined && params.search !== "") {
      queryParams.search = params.search
    }
    if (params.from !== undefined) queryParams.from = params.from
    if (params.to !== undefined) queryParams.to = params.to
    if (params.reference_type !== undefined) {
      queryParams.reference_type = params.reference_type
    }
    if (params.type !== undefined && params.type.length > 0) {
      queryParams.type = params.type.length === 1 ? params.type[0] : params.type
    }

    const { data } = await api.get<
      ApiResponse<RawShopTransactionsListResponse>
    >("/shop-transactions", { params: queryParams })

    const payload = data.data
    const limit = payload.limit ?? cappedLimit
    const total = payload.total ?? 0

    return {
      items: payload.items ?? [],
      pagination: {
        page: payload.page ?? params.page ?? 1,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  },
}
