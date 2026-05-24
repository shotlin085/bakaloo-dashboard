/**
 * Auth-flow types specific to the multi-vendor dashboard.
 *
 * `ShopAssignment` is the user-facing shop summary returned by
 * `GET /api/v1/auth/my-shops` and embedded in the `/auth/login` response when
 * the user is shop-staff. It carries just enough metadata to render the
 * Shop_Selector cards (Req 2.1) and seed the Shop_Context_Store after a
 * successful `selectShop` call (Req 1.3, 2.4).
 *
 * Design references:
 *   - design.md "Auth Flow Sequence Diagram"
 *   - tasks.md 2.1 (service-layer contract)
 *   - requirements.md 1.1, 2.1
 */

import type { ShopStaffRole } from "./shop-staff.types"

/**
 * A single shop a user is assigned to. Matches the `Shop_Context_Store`
 * `ShopMeta` shape on the four common fields (`id`, `name`, `branchCode`,
 * `city`, `isActive`) plus the user's per-shop `role`, so it can be passed
 * straight into `setActiveShop(shopMeta, role, permissions)`.
 *
 * Note: field names use camelCase even though the backend currently emits
 * snake_case (`branch_code`, `is_active`); the service layer normalizes.
 */
export interface ShopAssignment {
  /** Shop UUID — matches `shop_staff.shop_id`. */
  id: string
  /** Display name of the shop. */
  name: string
  /** Operator-facing branch code (unique per shop). */
  branchCode: string
  /** City the shop operates in. */
  city: string
  /** Per-shop role granted to this user. */
  role: ShopStaffRole
  /** Whether the shop itself is currently active. */
  isActive: boolean
}

/**
 * Result of `POST /api/v1/auth/select-shop`. Carries the new shop-scoped JWT
 * plus the role/permissions the backend granted for the chosen shop, and the
 * shop summary the caller will hand to `setActiveShop`.
 *
 * `shop` may be `null` when the backend response does not embed the full
 * shop object — today, callers resolve it from `getMyShops()` and pass it
 * forward. See the deviation note in tasks.md task 2.1.
 */
export interface SelectShopResult {
  /** Shop-scoped JWT — replaces the access token in the auth store. */
  token: string
  /** Per-shop role granted by the backend. */
  shopRole: ShopStaffRole
  /** Permission_Token list granted to the user for this shop. */
  permissions: string[]
  /** Shop summary; null until the backend embeds it in the response. */
  shop: ShopAssignment | null
}
