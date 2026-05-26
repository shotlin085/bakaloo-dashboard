/**
 * Unit tests for the route + menu RBAC hooks added in task 4.6.
 *
 * Covers:
 *   - `useRouteRBAC(pattern)` — `isAuthorized`, `canRead`, `canWrite` against
 *     the registered `ROUTE_GUARDS`, including the `requiresActiveShop` and
 *     `superAdminOnly` branches.
 *   - `useMenuRBAC(itemId)` — single-item lookup with shop-scope awareness.
 *   - `useMenuVisibility(ids[])` — batched lookup used by the sidebar.
 *   - Re-evaluation on Shop_Switcher selection change (Req 4.6) — toggling
 *     the Shop_Context_Store flips menu visibility without remounting.
 *
 * Validates: Requirements 4.1, 4.2, 4.5, 4.6, 4.7.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

import {
  useMenuRBAC,
  useMenuVisibility,
  useRouteRBAC,
} from "@/hooks/useRBAC"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import type { AdminUser } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: vi.fn((k: string) => (map.has(k) ? (map.get(k) as string) : null)),
    setItem: vi.fn((k: string, v: string) => {
      map.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      map.delete(k)
    }),
    clear: vi.fn(() => {
      map.clear()
    }),
    key: vi.fn((i: number) => Array.from(map.keys())[i] ?? null),
    get length() {
      return map.size
    },
  }
}

// `Partial<AdminUser>` for the role field is intentionally widened to `string`
// because the legacy `UserRole` union does not yet include the shop-role
// literals (`SHOP_ADMIN`, `SHOP_VIEWER`, ...). The auth profile broadens in
// task 2.x; until then `normalizeRole` accepts the wider set at runtime,
// which is the contract we exercise here.
type TestUser = Omit<Partial<AdminUser>, "role"> & { role?: string }

function setUser(user: TestUser | null) {
  useAuthStore.setState({
    user: user
      ? ({
          id: "u1",
          name: "Tester",
          email: "tester@example.com",
          phone: "+10",
          role: user.role,
          permissions: user.permissions,
        } as unknown as AdminUser)
      : null,
    accessToken: user ? "token" : null,
    isAuthenticated: !!user,
    isHydrated: true,
  })
}

function setShopContext(args: {
  mode: "HQ_MODE" | "STORE_MODE" | "UNSELECTED"
  permissions?: string[]
  assignedShopIds?: string[]
}) {
  useShopContextStore.setState({
    activeShopId: args.mode === "STORE_MODE" ? "shop-a" : null,
    mode: args.mode,
    shopRole: args.mode === "STORE_MODE" ? "SHOP_ADMIN" : null,
    permissions: args.permissions ?? [],
    shopMeta:
      args.mode === "STORE_MODE"
        ? {
            id: "shop-a",
            name: "Shop A",
            branchCode: "BR-A",
            city: "Mumbai",
            isActive: true,
          }
        : null,
    assignedShopIds: args.assignedShopIds ?? [],
    isHydrated: true,
  })
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeMockStorage())
  setUser(null)
  setShopContext({ mode: "UNSELECTED" })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// useRouteRBAC
// ─────────────────────────────────────────────────────────────────────────────

describe("useRouteRBAC", () => {
  it("authorizes a super admin with shops.read for /shops", () => {
    setUser({ role: "SUPER_ADMIN", permissions: ["shops.read"] })
    setShopContext({ mode: "HQ_MODE" })

    const { result } = renderHook(() => useRouteRBAC("/shops"))
    expect(result.current.isAuthorized).toBe(true)
    expect(result.current.canRead).toBe(true)
    expect(result.current.canWrite).toBe(false)
    expect(result.current.superAdminOnly).toBe(false)
  })

  it("denies a vendor for /shops/new (super-admin only)", () => {
    setUser({ role: "SHOP_ADMIN", permissions: ["shops.write"] })
    setShopContext({ mode: "STORE_MODE", assignedShopIds: ["shop-a"] })

    const { result } = renderHook(() => useRouteRBAC("/shops/new"))
    expect(result.current.isAuthorized).toBe(false)
    expect(result.current.superAdminOnly).toBe(true)
  })

  it("authorizes a super admin with shops.write for /shops/new and reports canWrite", () => {
    setUser({ role: "SUPER_ADMIN", permissions: ["shops.read", "shops.write"] })
    setShopContext({ mode: "HQ_MODE" })

    const { result } = renderHook(() => useRouteRBAC("/shops/new"))
    expect(result.current.isAuthorized).toBe(true)
    expect(result.current.canWrite).toBe(true)
  })

  it("denies access to /shop-products in ALL_SHOPS mode (requiresActiveShop)", () => {
    setUser({ role: "SUPER_ADMIN", permissions: ["shop-products.read"] })
    setShopContext({ mode: "HQ_MODE" })

    const { result } = renderHook(() => useRouteRBAC("/shop-products"))
    expect(result.current.isAuthorized).toBe(false)
    expect(result.current.requiresActiveShop).toBe(true)
    expect(result.current.canRead).toBe(true)
  })

  it("authorizes /shop-products once a single shop is selected", () => {
    setUser({ role: "SHOP_ADMIN", permissions: [] })
    setShopContext({
      mode: "STORE_MODE",
      permissions: ["shop-products.read"],
      assignedShopIds: ["shop-a"],
    })

    const { result } = renderHook(() => useRouteRBAC("/shop-products"))
    expect(result.current.isAuthorized).toBe(true)
    expect(result.current.canRead).toBe(true)
  })

  it("returns isAuthorized=true for unguarded paths", () => {
    setUser({ role: "SHOP_VIEWER", permissions: [] })
    const { result } = renderHook(() => useRouteRBAC("/dashboard"))
    expect(result.current.isAuthorized).toBe(true)
    expect(result.current.guard).toBeNull()
    expect(result.current.canRead).toBe(false)
    expect(result.current.canWrite).toBe(false)
  })

  it("treats legacy ADMIN role as SUPER_ADMIN for super-admin-only routes", () => {
    setUser({ role: "ADMIN", permissions: ["shops.write"] })
    setShopContext({ mode: "HQ_MODE" })

    const { result } = renderHook(() => useRouteRBAC("/shops/new"))
    expect(result.current.isAuthorized).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useMenuRBAC
// ─────────────────────────────────────────────────────────────────────────────

describe("useMenuRBAC", () => {
  it("returns true for legacy items not in MENU_PERMISSIONS", () => {
    setUser({ role: "SHOP_VIEWER", permissions: [] })
    const { result } = renderHook(() => useMenuRBAC("legacy-orders"))
    expect(result.current).toBe(true)
  })

  it("hides shops for non-super-admins", () => {
    setUser({ role: "SHOP_ADMIN", permissions: ["shops.read"] })
    const { result } = renderHook(() => useMenuRBAC("shops"))
    expect(result.current).toBe(false)
  })

  it("shows shops for super admins with shops.read", () => {
    setUser({ role: "SUPER_ADMIN", permissions: ["shops.read"] })
    setShopContext({ mode: "HQ_MODE" })
    const { result } = renderHook(() => useMenuRBAC("shops"))
    expect(result.current).toBe(true)
  })

  it("re-evaluates when the Shop_Switcher selection changes", () => {
    setUser({ role: "SUPER_ADMIN", permissions: ["shop-products.read"] })
    // Start in ALL_SHOPS — `requiresActiveShop` should hide the item.
    setShopContext({ mode: "HQ_MODE" })

    const { result } = renderHook(() => useMenuRBAC("shopProducts"))
    expect(result.current).toBe(false)

    // Pick a shop — the same hook instance must re-render and unhide.
    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "shop-a",
          name: "Shop A",
          branchCode: "BR-A",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        ["shop-products.read"],
      )
    })

    expect(result.current).toBe(true)

    // Switching back to ALL_SHOPS hides the item again — no remount needed.
    act(() => {
      useShopContextStore.getState().setAllShopsMode()
    })

    expect(result.current).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useMenuVisibility
// ─────────────────────────────────────────────────────────────────────────────

describe("useMenuVisibility", () => {
  it("returns visibility flags keyed by id", () => {
    setUser({
      role: "SUPER_ADMIN",
      permissions: ["shops.read", "shop-products.read"],
    })
    setShopContext({
      mode: "STORE_MODE",
      permissions: ["shop-products.read"],
    })

    const { result } = renderHook(() =>
      useMenuVisibility(["shops", "shopProducts", "shopFinancials"]),
    )
    expect(result.current.shops).toBe(true)
    expect(result.current.shopProducts).toBe(true)
    expect(result.current.shopFinancials).toBe(false) // missing permission
  })

  it("treats unknown ids as legacy (always allowed)", () => {
    setUser({ role: "SHOP_VIEWER", permissions: [] })
    const { result } = renderHook(() =>
      useMenuVisibility(["legacy-foo", "legacy-bar"]),
    )
    expect(result.current["legacy-foo"]).toBe(true)
    expect(result.current["legacy-bar"]).toBe(true)
  })

  it("treats empty-string id as legacy (always allowed)", () => {
    setUser({ role: "SHOP_VIEWER", permissions: [] })
    const { result } = renderHook(() => useMenuVisibility([""]))
    expect(result.current[""]).toBe(true)
  })
})
