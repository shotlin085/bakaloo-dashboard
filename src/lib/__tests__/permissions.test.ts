/**
 * Unit tests for `satisfies()` — the pure RBAC guard predicate.
 *
 * Covers each guard branch (`superAdminOnly`, `rolesAllowed`, `allOf`,
 * `anyOf`) and the composite case where multiple branches combine.
 *
 * Validates: Requirements 4.1 (RBAC permission map), 4.7 (single source).
 */

import { describe, it, expect } from "vitest"

import {
  satisfies,
  type PermissionSubject,
  type Role,
} from "@/lib/permissions"

function user(role: Role, permissions: string[] = []): PermissionSubject {
  return { role, permissions }
}

describe("satisfies — superAdminOnly branch", () => {
  it("denies a SHOP_ADMIN", () => {
    expect(satisfies(user("SHOP_ADMIN"), { superAdminOnly: true })).toBe(false)
  })

  it("denies a SHOP_VIEWER", () => {
    expect(satisfies(user("SHOP_VIEWER"), { superAdminOnly: true })).toBe(false)
  })

  it("allows a SUPER_ADMIN", () => {
    expect(satisfies(user("SUPER_ADMIN"), { superAdminOnly: true })).toBe(true)
  })
})

describe("satisfies — rolesAllowed branch", () => {
  it("allows SHOP_ADMIN when SHOP_ADMIN is permitted", () => {
    expect(
      satisfies(user("SHOP_ADMIN"), { rolesAllowed: ["SHOP_ADMIN"] }),
    ).toBe(true)
  })

  it("denies SHOP_VIEWER when only SHOP_ADMIN is permitted", () => {
    expect(
      satisfies(user("SHOP_VIEWER"), { rolesAllowed: ["SHOP_ADMIN"] }),
    ).toBe(false)
  })

  it("allows any role in the list", () => {
    const guard = { rolesAllowed: ["SHOP_ADMIN", "SHOP_MANAGER"] as Role[] }
    expect(satisfies(user("SHOP_ADMIN"), guard)).toBe(true)
    expect(satisfies(user("SHOP_MANAGER"), guard)).toBe(true)
    expect(satisfies(user("SHOP_STAFF"), guard)).toBe(false)
  })
})

describe("satisfies — allOf branch", () => {
  it("allows when every required permission is present", () => {
    expect(
      satisfies(user("SHOP_ADMIN", ["a", "b"]), { allOf: ["a", "b"] }),
    ).toBe(true)
  })

  it("denies when any required permission is missing", () => {
    expect(satisfies(user("SHOP_ADMIN", ["a"]), { allOf: ["a", "b"] })).toBe(
      false,
    )
    expect(satisfies(user("SHOP_ADMIN", []), { allOf: ["a", "b"] })).toBe(false)
  })
})

describe("satisfies — anyOf branch", () => {
  it("allows when at least one permission is present", () => {
    expect(satisfies(user("SHOP_ADMIN", ["a"]), { anyOf: ["a", "b"] })).toBe(
      true,
    )
    expect(satisfies(user("SHOP_ADMIN", ["b"]), { anyOf: ["a", "b"] })).toBe(
      true,
    )
    expect(
      satisfies(user("SHOP_ADMIN", ["a", "b"]), { anyOf: ["a", "b"] }),
    ).toBe(true)
  })

  it("denies when none of the permissions are present", () => {
    expect(satisfies(user("SHOP_ADMIN", ["c"]), { anyOf: ["a", "b"] })).toBe(
      false,
    )
    expect(satisfies(user("SHOP_ADMIN", []), { anyOf: ["a", "b"] })).toBe(false)
  })
})

describe("satisfies — composite guards", () => {
  it("requires both superAdminOnly and anyOf to pass", () => {
    // SUPER_ADMIN with the right permission → allowed
    expect(
      satisfies(user("SUPER_ADMIN", ["shops.write"]), {
        superAdminOnly: true,
        anyOf: ["shops.write"],
      }),
    ).toBe(true)

    // SUPER_ADMIN without the permission → denied (anyOf fails)
    expect(
      satisfies(user("SUPER_ADMIN", []), {
        superAdminOnly: true,
        anyOf: ["shops.write"],
      }),
    ).toBe(false)

    // Non-super with the permission → denied (superAdminOnly fails)
    expect(
      satisfies(user("SHOP_ADMIN", ["shops.write"]), {
        superAdminOnly: true,
        anyOf: ["shops.write"],
      }),
    ).toBe(false)
  })

  it("an empty guard always allows", () => {
    expect(satisfies(user("SHOP_VIEWER"), {})).toBe(true)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// findRouteGuard
// ─────────────────────────────────────────────────────────────────────────────

import {
  findRouteGuard,
  entityOf,
  primaryEntityFor,
  isMenuItemAllowed,
} from "@/lib/permissions"

describe("findRouteGuard", () => {
  it("matches /shops to the shops list guard", () => {
    const g = findRouteGuard("/shops")
    expect(g).not.toBeNull()
    expect(g?.anyOf).toEqual(["shops.read"])
    expect(g?.superAdminOnly).toBeUndefined()
  })

  it("matches /shops/new to the create guard before falling through to detail", () => {
    const g = findRouteGuard("/shops/new")
    expect(g?.superAdminOnly).toBe(true)
    expect(g?.anyOf).toEqual(["shops.write"])
  })

  it("matches /shops/abc-123/edit to the edit guard, not the detail guard", () => {
    const g = findRouteGuard("/shops/abc-123/edit")
    expect(g?.superAdminOnly).toBe(true)
    expect(g?.anyOf).toEqual(["shops.write"])
  })

  it("matches /shops/abc-123/staff to the staff guard", () => {
    const g = findRouteGuard("/shops/abc-123/staff")
    expect(g?.anyOf).toEqual(["shop-staff.read"])
  })

  it("matches /shops/abc-123 to the detail guard", () => {
    const g = findRouteGuard("/shops/abc-123")
    expect(g?.anyOf).toEqual(["shops.read"])
    expect(g?.superAdminOnly).toBeUndefined()
  })

  it("matches /shop-products with requiresActiveShop", () => {
    const g = findRouteGuard("/shop-products")
    expect(g?.requiresActiveShop).toBe(true)
    expect(g?.anyOf).toEqual(["shop-products.read"])
  })

  it("returns null for unguarded paths", () => {
    expect(findRouteGuard("/dashboard")).toBeNull()
    expect(findRouteGuard("/orders")).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// entityOf / primaryEntityFor
// ─────────────────────────────────────────────────────────────────────────────

describe("entityOf", () => {
  it("extracts the entity prefix from a permission token", () => {
    expect(entityOf("shop-products.read")).toBe("shop-products")
    expect(entityOf("orders.write")).toBe("orders")
    expect(entityOf("activity-log.read")).toBe("activity-log")
  })

  it("returns null for malformed tokens", () => {
    expect(entityOf("malformed")).toBeNull()
    expect(entityOf("")).toBeNull()
    expect(entityOf(".read")).toBeNull()
  })
})

describe("primaryEntityFor", () => {
  it("derives the entity from anyOf when present", () => {
    expect(
      primaryEntityFor({
        pattern: /^\/x$/,
        anyOf: ["shop-products.read"],
      }),
    ).toBe("shop-products")
  })

  it("falls back to allOf when anyOf is missing", () => {
    expect(
      primaryEntityFor({
        pattern: /^\/x$/,
        allOf: ["orders.read", "orders.write"],
      }),
    ).toBe("orders")
  })

  it("returns null when neither list is present", () => {
    expect(primaryEntityFor({ pattern: /^\/x$/ })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isMenuItemAllowed
// ─────────────────────────────────────────────────────────────────────────────

describe("isMenuItemAllowed", () => {
  it("allows legacy items (no entry in MENU_PERMISSIONS)", () => {
    const subject = user("SHOP_VIEWER", [])
    expect(isMenuItemAllowed("legacy-item", subject, { hasActiveShop: false })).toBe(
      true,
    )
  })

  it("hides shops menu for non-super-admins", () => {
    const shopAdmin = user("SHOP_ADMIN", ["shops.read"])
    expect(
      isMenuItemAllowed("shops", shopAdmin, { hasActiveShop: true }),
    ).toBe(false)
  })

  it("shows shops menu for super-admins with the read permission", () => {
    const superAdmin = user("SUPER_ADMIN", ["shops.read"])
    expect(
      isMenuItemAllowed("shops", superAdmin, { hasActiveShop: false }),
    ).toBe(true)
  })

  it("hides shopProducts when no active shop is selected", () => {
    const subject = user("SHOP_ADMIN", ["shop-products.read"])
    expect(
      isMenuItemAllowed("shopProducts", subject, { hasActiveShop: false }),
    ).toBe(false)
  })

  it("shows shopProducts when active shop is selected and permission is held", () => {
    const subject = user("SHOP_ADMIN", ["shop-products.read"])
    expect(
      isMenuItemAllowed("shopProducts", subject, { hasActiveShop: true }),
    ).toBe(true)
  })

  it("hides shopFinancials when permission is missing even with active shop", () => {
    const subject = user("SHOP_STAFF", ["orders.read"])
    expect(
      isMenuItemAllowed("shopFinancials", subject, { hasActiveShop: true }),
    ).toBe(false)
  })

  it("hides shopTransactions for super-admins in ALL_SHOPS mode", () => {
    const superAdmin = user("SUPER_ADMIN", ["shop-transactions.read"])
    expect(
      isMenuItemAllowed("shopTransactions", superAdmin, {
        hasActiveShop: false,
      }),
    ).toBe(false)
  })
})
