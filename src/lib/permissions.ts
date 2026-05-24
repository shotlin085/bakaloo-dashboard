/**
 * RBAC Permission Map — central source of truth for the multi-vendor dashboard.
 *
 * This module owns every route guard, every menu permission, and the role
 * default permission sets used by the staff invite dialog. It is the single
 * file a feature owner edits when adding a new shop-scoped permission.
 *
 * Design references:
 *   - design.md §3 "RBAC Permission Map"
 *   - design.md §7 "Shop_Staff_UI Dialog"
 *   - requirements.md 4.1 (RBAC_Layer permissions exposure)
 *   - requirements.md 4.7 (single configuration file)
 *
 * Note: The legacy `PermissionKey` union in `src/types/rbac.types.ts` (used by
 * the team/admin-roles surface — `orders.manage`, `products.view`, etc.) is
 * intentionally left untouched. `usePermissions.can()` accepts `string`, so the
 * two systems coexist: legacy admin permissions for the team page, and the new
 * `PermissionToken`s below for the shop-scoped JWT.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Role unions
// ─────────────────────────────────────────────────────────────────────────────

/** Role assigned to a user inside a single shop. */
export type ShopRole =
  | "SHOP_ADMIN"
  | "SHOP_MANAGER"
  | "SHOP_STAFF"
  | "SHOP_VIEWER"

/** Top-level role: either platform Super_Admin or one of the shop roles. */
export type Role = "SUPER_ADMIN" | ShopRole

// ─────────────────────────────────────────────────────────────────────────────
// Permission tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permission tokens carried in the shop-scoped JWT `permissions[]` array, used
 * to gate UI affordances and routes. Tokens follow the `<entity>.<action>`
 * convention with action ∈ { read | write | delete }.
 */
export type PermissionToken =
  // shops
  | "shops.read"
  | "shops.write"
  | "shops.delete"
  // shop staff
  | "shop-staff.read"
  | "shop-staff.write"
  | "shop-staff.delete"
  // shop products (per-shop inventory)
  | "shop-products.read"
  | "shop-products.write"
  | "shop-products.delete"
  // financials and transactions are read-only surfaces
  | "shop-financials.read"
  | "shop-transactions.read"
  // existing surfaces (shop-scoped read/write/delete)
  | "orders.read"
  | "orders.write"
  | "orders.delete"
  | "products.read"
  | "products.write"
  | "products.delete"
  | "customers.read"
  | "customers.write"
  | "activity-log.read"

// ─────────────────────────────────────────────────────────────────────────────
// Guard interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Guard rule applied to a single route pattern. */
export interface RouteGuard {
  /** Regex matched against the pathname (no query / hash). */
  pattern: RegExp
  /** Any one of these tokens is sufficient. */
  anyOf?: PermissionToken[]
  /** All of these tokens are required. */
  allOf?: PermissionToken[]
  /** Roles allowed; if omitted, role is not checked. */
  rolesAllowed?: Role[]
  /** Page requires a single-shop context (Active_Shop_Id set). */
  requiresActiveShop?: boolean
  /** Restricted to Super_Admin only. */
  superAdminOnly?: boolean
}

/** Guard rule applied to a sidebar menu item. */
export interface MenuPermission {
  /** Stable id used as a lookup key (matches sidebar item id). */
  key: string
  /** Any one of these tokens is sufficient. */
  anyOf?: PermissionToken[]
  /** All of these tokens are required. */
  allOf?: PermissionToken[]
  /** Restricted to Super_Admin only. */
  superAdminOnly?: boolean
  /** Hidden when there is no Active_Shop_Id. */
  requiresActiveShop?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Route guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered list of route guards. More specific patterns precede less specific
 * ones so a first-match strategy resolves correctly:
 *   /shops/new         → before /shops/[id]
 *   /shops/[id]/edit   → before /shops/[id]
 *   /shops/[id]/staff  → before /shops/[id]
 */
export const ROUTE_GUARDS: RouteGuard[] = [
  // shops list
  {
    pattern: /^\/shops$/,
    anyOf: ["shops.read"],
  },
  // shop create — Super_Admin only
  {
    pattern: /^\/shops\/new$/,
    superAdminOnly: true,
    anyOf: ["shops.write"],
  },
  // shop edit — Super_Admin only
  {
    pattern: /^\/shops\/[^/]+\/edit$/,
    superAdminOnly: true,
    anyOf: ["shops.write"],
  },
  // shop staff list
  {
    pattern: /^\/shops\/[^/]+\/staff$/,
    anyOf: ["shop-staff.read"],
  },
  // shop detail (must come after the more specific /edit and /staff patterns)
  {
    pattern: /^\/shops\/[^/]+$/,
    anyOf: ["shops.read"],
  },
  // shop products inventory
  {
    pattern: /^\/shop-products$/,
    anyOf: ["shop-products.read"],
    requiresActiveShop: true,
  },
  // shop financials (read-only)
  {
    pattern: /^\/shop-financials$/,
    anyOf: ["shop-financials.read"],
    requiresActiveShop: true,
  },
  // shop transactions ledger (read-only)
  {
    pattern: /^\/shop-transactions$/,
    anyOf: ["shop-transactions.read"],
    requiresActiveShop: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Menu permissions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sidebar menu gating, keyed by sidebar item id. The sidebar renderer hides any
 * item whose guard is not satisfied by the current user + shop context.
 */
export const MENU_PERMISSIONS: Record<string, MenuPermission> = {
  shops: {
    key: "shops",
    superAdminOnly: true,
    anyOf: ["shops.read"],
  },
  shopProducts: {
    key: "shopProducts",
    anyOf: ["shop-products.read"],
    requiresActiveShop: true,
  },
  shopFinancials: {
    key: "shopFinancials",
    anyOf: ["shop-financials.read"],
    requiresActiveShop: true,
  },
  shopTransactions: {
    key: "shopTransactions",
    anyOf: ["shop-transactions.read"],
    requiresActiveShop: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subject of a permission check. Decoupled from any concrete user shape so this
 * function stays pure and unit-testable.
 */
export interface PermissionSubject {
  role: Role
  permissions: string[]
}

/**
 * Pure predicate: does the user satisfy the given guard?
 *
 * Evaluation order:
 *   1. `superAdminOnly`  — short-circuits if user is not SUPER_ADMIN
 *   2. `rolesAllowed`    — short-circuits if user role is not in the list
 *   3. `allOf`           — every listed permission must be present
 *   4. `anyOf`           — at least one listed permission must be present
 *
 * `RouteGuard` and `MenuPermission` share the same shape for these four fields,
 * so this single function works for both.
 */
export function satisfies(
  user: PermissionSubject,
  guard: Pick<
    RouteGuard,
    "superAdminOnly" | "rolesAllowed" | "allOf" | "anyOf"
  >,
): boolean {
  if (guard.superAdminOnly && user.role !== "SUPER_ADMIN") return false
  if (guard.rolesAllowed && !guard.rolesAllowed.includes(user.role)) return false
  if (guard.allOf && !guard.allOf.every((p) => user.permissions.includes(p))) {
    return false
  }
  if (guard.anyOf && !guard.anyOf.some((p) => user.permissions.includes(p))) {
    return false
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookups & convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the first `RouteGuard` whose pattern matches the given pathname.
 * Returns `null` when no guard is registered for that path (treat as
 * unguarded — the caller decides whether to allow or deny by default).
 */
export function findRouteGuard(pathname: string): RouteGuard | null {
  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) return guard
  }
  return null
}

/**
 * Extract the entity prefix from a permission token.
 * `shop-products.read` → `shop-products`, `orders.write` → `orders`.
 * Returns `null` if the token is malformed.
 */
export function entityOf(token: string): string | null {
  const idx = token.indexOf(".")
  return idx > 0 ? token.slice(0, idx) : null
}

/**
 * Derive the route's primary entity from its guard. Picks the entity prefix
 * of the first listed permission token (anyOf preferred, then allOf). Used
 * by `useRouteRBAC` to compute `canRead` / `canWrite`.
 */
export function primaryEntityFor(guard: RouteGuard): string | null {
  const first = guard.anyOf?.[0] ?? guard.allOf?.[0]
  return first ? entityOf(first) : null
}

/**
 * Is the menu item identified by `itemId` allowed for this user + shop scope?
 *
 * Decision order (any false => hidden):
 *   1. If no entry in `MENU_PERMISSIONS` for `itemId`, the item is treated
 *      as legacy and is always visible (the caller — typically the sidebar —
 *      handles legacy items unconditionally).
 *   2. `superAdminOnly` and the user is not SUPER_ADMIN → hidden.
 *   3. `requiresActiveShop` and there is no active shop → hidden.
 *      A "single-shop" scope satisfies this; ALL_SHOPS does not (Req 4.5).
 *   4. `satisfies(user, menuPerm)` evaluates `anyOf` / `allOf` / `rolesAllowed`.
 *
 * Validates Requirements 4.2, 4.5, 4.6, 4.7.
 */
export function isMenuItemAllowed(
  itemId: string,
  user: PermissionSubject,
  ctx: { hasActiveShop: boolean },
): boolean {
  const perm = MENU_PERMISSIONS[itemId]
  if (!perm) return true

  if (perm.superAdminOnly && user.role !== "SUPER_ADMIN") return false
  if (perm.requiresActiveShop && !ctx.hasActiveShop) return false
  return satisfies(user, perm)
}

// ─────────────────────────────────────────────────────────────────────────────
// Role default permission sets (staff invite dialog)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default permission tokens applied when an operator picks a role in the staff
 * invite dialog. Operators may toggle individual tokens after the role is
 * selected; these defaults are only the starting point.
 *
 * Sourced from design.md §7 "Shop_Staff_UI Dialog".
 */
export const ROLE_DEFAULTS: Record<ShopRole, PermissionToken[]> = {
  SHOP_ADMIN: [
    "shops.read",
    "shop-staff.read",
    "shop-staff.write",
    "shop-staff.delete",
    "shop-products.read",
    "shop-products.write",
    "shop-products.delete",
    "shop-financials.read",
    "shop-transactions.read",
    "orders.read",
    "orders.write",
    "orders.delete",
    "products.read",
    "products.write",
    "customers.read",
    "customers.write",
    "activity-log.read",
  ],
  SHOP_MANAGER: [
    "orders.read",
    "orders.write",
    "shop-products.read",
    "shop-products.write",
    "shop-financials.read",
  ],
  SHOP_STAFF: [
    "orders.read",
    "orders.write",
    "shop-products.read",
    "shop-products.write",
  ],
  SHOP_VIEWER: [
    "orders.read",
    "shop-products.read",
    "shop-financials.read",
    "shop-transactions.read",
  ],
}
