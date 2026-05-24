/**
 * Shop staff types — mirrors `bakaloo-backend/src/modules/shop-staff` schemas.
 * See design.md §"Data Models" and Requirement 6.2.
 *
 * Note: `permissions` is typed as `string[]` here so this file does not
 * pull in `lib/permissions.ts` (created in task 1.2). Once the
 * `PermissionToken` union exists, call sites can narrow as needed.
 */

/** Per-shop role assigned to a staff member. */
export type ShopStaffRole =
  | "SHOP_ADMIN"
  | "SHOP_MANAGER"
  | "SHOP_STAFF"
  | "SHOP_VIEWER"

/** Embedded user summary returned alongside a staff record. */
export interface ShopStaffUser {
  name: string
  email: string
  phone: string
}

/** Full shop-staff record. */
export interface ShopStaff {
  id: string
  user_id: string
  shop_id: string
  role: ShopStaffRole
  /** Permission_Token list — see `lib/permissions.ts` `PermissionToken`. */
  permissions: string[]
  is_active: boolean
  joined_at: string
  user: ShopStaffUser
}
