/**
 * `SUPER_ADMIN` was added to the union as part of the multi-vendor dashboard
 * spec (Req 1.5, 3.1). Pre-existing customer/rider/admin code paths are
 * unaffected — the union is purely additive.
 */
export type UserRole = "CUSTOMER" | "ADMIN" | "DELIVERY" | "SUPER_ADMIN"

export interface User {
  id: string
  phone: string
  email: string | null
  name: string | null
  role: UserRole
  is_blocked: boolean
  block_reason: string | null
  created_at: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  role_name?: string
  permissions?: string[]
}

/**
 * Response of the dashboard's login endpoint.
 *
 * The original shape (`accessToken`, `user`) is preserved verbatim so existing
 * callers keep compiling. Two optional fields have been appended (additive,
 * defaulted by the service layer when missing) to drive the post-login routing
 * branch described in Req 1.2 / 1.3 / 1.4 / 1.5:
 *
 *   - `shops`         — the user's shop assignments; empty array means no
 *                       assignments and (combined with `isSuperAdmin === false`)
 *                       triggers the "No shop assigned" error.
 *   - `isSuperAdmin`  — true for cross-shop operators; the dashboard puts the
 *                       Shop_Context_Store into ALL_SHOPS mode for these users.
 *
 * `ShopAssignment` is imported lazily via `import type` to avoid any chance of
 * a circular dependency through `types/index.ts`.
 */
export interface AuthResponse {
  accessToken: string
  user: AdminUser
  shops?: import("./auth.types").ShopAssignment[]
  isSuperAdmin?: boolean
}
