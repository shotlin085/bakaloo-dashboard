import api from "@/lib/api"
import type {
  ApiResponse,
  AuthResponse,
  AdminUser,
  ShopAssignment,
  SelectShopResult,
} from "@/types"
import type { ShopStaffRole } from "@/types/shop-staff.types"

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw shape the backend currently returns from `/admin/auth/login`. Future
 * iterations may embed `shops` and `isSuperAdmin` directly; this service
 * accepts both shapes and falls back to client-side derivation for the
 * additive fields when the backend has not yet been updated.
 */
interface RawLoginResponse {
  accessToken: string
  user: AdminUser
  shops?: RawShopAssignment[]
  isSuperAdmin?: boolean
}

/** Backend snake_case shape for an embedded shop assignment. */
interface RawShopAssignment {
  id: string
  name: string
  branch_code: string
  city: string
  role: ShopStaffRole
  is_active: boolean
}

/**
 * Whitelist of admin roles that should be treated as Super_Admin in the
 * dashboard until the backend starts emitting `isSuperAdmin` directly. The
 * existing dashboard already issues `ADMIN`-role JWTs for cross-shop
 * operators, so this preserves current behaviour while letting the new spec
 * value (`SUPER_ADMIN`) take precedence once the backend ships it (Req 1.5).
 */
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"])

/** Convert a backend `RawShopAssignment` into the camelCase domain type. */
function normalizeShopAssignment(raw: RawShopAssignment): ShopAssignment {
  return {
    id: raw.id,
    name: raw.name,
    branchCode: raw.branch_code,
    city: raw.city,
    role: raw.role,
    isActive: raw.is_active,
  }
}

/**
 * Log in with email and password and return the dashboard auth payload.
 *
 * Return shape:
 *   - `accessToken`, `user`  — preserved from the original contract.
 *   - `shops`                — user's shop assignments (Req 1.2 / 1.3 / 1.4).
 *                              When the backend has not yet been updated, this
 *                              is `[]` and post-login routing falls back to
 *                              the Super_Admin / "no shop assigned" branches.
 *   - `isSuperAdmin`         — `true` for cross-shop operators (Req 1.5).
 *                              Falls back to a role-based derivation when the
 *                              backend does not provide the field directly.
 *
 * The endpoint URL is unchanged (`/admin/auth/login`) — only the response is
 * widened. Old callers that destructure `{ accessToken, user }` keep working.
 */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<RawLoginResponse>>(
    "/admin/auth/login",
    { email, password },
  )
  const raw = data.data

  const shops: ShopAssignment[] = Array.isArray(raw.shops)
    ? raw.shops.map(normalizeShopAssignment)
    : []

  const isSuperAdmin =
    typeof raw.isSuperAdmin === "boolean"
      ? raw.isSuperAdmin
      : SUPER_ADMIN_ROLES.has(raw.user.role)

  return {
    accessToken: raw.accessToken,
    user: raw.user,
    shops,
    isSuperAdmin,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session / logout / password (existing endpoints — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the current token against the backend and return the admin profile
 * if it is still valid. On 401 the axios interceptor clears auth and
 * redirects to `/login` (see `lib/api.ts`).
 */
export async function validateSession(): Promise<AdminUser> {
  const { data } = await api.get<ApiResponse<AdminUser>>("/admin/auth/me")
  return data.data
}

export async function logoutAdmin(): Promise<void> {
  try {
    await api.post("/admin/auth/logout")
  } catch {
    // Ignore errors — local state is cleared regardless.
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.put("/admin/auth/password", { currentPassword, newPassword })
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-vendor: my-shops + select-shop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's shop assignments.
 *
 * Backed by `GET /api/v1/auth/my-shops` (Req 2.1). The route returns the same
 * `RawShopAssignment` shape the login response carries, so the same
 * normalizer is reused. Both `{ shops: [...] }` and a bare array under `data`
 * are accepted to remain forward-compatible with either response shape.
 *
 * Note: the backend route is being landed alongside this client work; until
 * it ships, the call will surface a 404 from the API client. The
 * Shop_Selector page (task 2.4) renders that as an error state with a Retry
 * button (Req 2.3).
 */
export async function getMyShops(): Promise<ShopAssignment[]> {
  const { data } = await api.get<ApiResponse<{ shops: RawShopAssignment[] }>>(
    "/auth/my-shops",
  )
  const payload = data.data as
    | { shops: RawShopAssignment[] }
    | RawShopAssignment[]
  const raw = Array.isArray(payload) ? payload : payload?.shops ?? []
  return raw.map(normalizeShopAssignment)
}

/** Backend response payload for `POST /auth/select-shop`. */
interface RawSelectShopResponse {
  token: string
  shop_id: string
  shop_role: ShopStaffRole
  permissions: string[]
}

/**
 * Select a shop and receive a shop-scoped JWT.
 *
 * Wraps `POST /api/v1/auth/select-shop` (body `{ shop_id }`, see backend
 * `auth.schema.js → selectShopSchema`). The response is normalized into the
 * dashboard's camelCase `SelectShopResult` shape.
 *
 * `shopAssignment` is the caller-held `ShopAssignment` (typically the card
 * the operator clicked on the Shop_Selector). It is folded into the result
 * as `shop` so callers can pass the result straight into
 * `useShopContextStore.setActiveShop(result.shop, result.shopRole, result.permissions)`
 * without a second round-trip.
 *
 * When the caller does not have a `shopAssignment` on hand (e.g. a deep-link
 * flow), pass `undefined` and resolve the shop separately via `getMyShops()`.
 *
 * Errors:
 *   - `STAFF_NOT_FOUND` (404) — user is not assigned to the requested shop.
 *   - `STAFF_INACTIVE`  (403) — user's account is inactive.
 *   These propagate as axios errors; the calling hook surfaces the message
 *   from `error.response?.data?.message` per Req 2.5.
 */
export async function selectShop(
  shopId: string,
  shopAssignment?: ShopAssignment,
): Promise<SelectShopResult> {
  const { data } = await api.post<ApiResponse<RawSelectShopResponse>>(
    "/auth/select-shop",
    { shop_id: shopId },
  )
  const raw = data.data
  return {
    token: raw.token,
    shopRole: raw.shop_role,
    permissions: raw.permissions,
    // Embed the caller-held assignment when available; otherwise null and
    // the caller is expected to resolve the shop summary separately.
    shop: shopAssignment ?? null,
  }
}
