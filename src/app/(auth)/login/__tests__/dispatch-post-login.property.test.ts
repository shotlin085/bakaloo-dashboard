/**
 * Property test for `dispatchPostLogin` — shop-count routing.
 *
 * **Feature: multi-vendor-dashboard-ui, Property 1: Shop-count routing**
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 *
 * Generator: `loginResponse` arbitrary with `shops[]` of length n ∈ [0, 5]
 *            and arbitrary `isSuperAdmin`.
 *
 * Spec table (asserted for every tuple):
 *
 *   | isSuperAdmin | shops.length | route          | active shop / store state              |
 *   |--------------|--------------|----------------|----------------------------------------|
 *   | true         | any          | /dashboard     | mode=ALL_SHOPS, activeShopId=null      |
 *   | false        | 0            | (no redirect)  | auth cleared, shop cleared, toast.err  |
 *   | false        | 1            | /dashboard     | mode=SINGLE_SHOP, activeShopId=shop[0] |
 *   | false        | ≥ 2          | /select-shop   | mode=UNSELECTED, assignedShopIds=ids   |
 *
 * Notes on the test boundary:
 *   - `selectShop` is mocked at the service-module boundary so the n=1
 *     branch is deterministic (no axios, no real network).
 *   - `sonner` is mocked so `toast.success/.error` calls are observable
 *     spies and never render anything.
 *   - The Zustand stores (`auth.store`, `shop-context.store`) are reset
 *     before each fast-check shrink iteration so the property does not
 *     accumulate state across runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fc from "fast-check"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the page module)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock `selectShop` so the n=1 branch resolves deterministically without
 * touching axios. `loginAdmin` and `validateSession` are preserved via
 * `importOriginal` for completeness, although neither is invoked from
 * `dispatchPostLogin` directly.
 */
vi.mock("@/services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth.service")>()
  return {
    ...actual,
    selectShop: vi.fn(),
  }
})

/**
 * Mock sonner so `toast.success` / `toast.error` are observable spies.
 * The login page imports `toast` from "sonner" at the module level, so we
 * mock the whole package to avoid dragging in the real Sonner runtime.
 */
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { dispatchPostLogin } from "@/app/(auth)/login/page"
import { selectShop } from "@/services/auth.service"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import type {
  AdminUser,
  AuthResponse,
  ShopAssignment,
  SelectShopResult,
} from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_REDIRECT = "/dashboard"

const ADMIN_USER: AdminUser = {
  id: "u-1",
  name: "Test User",
  email: "test@example.com",
  phone: "+1000",
  role: "ADMIN",
  permissions: [],
}

/** Minimal router surface matching `DispatchRouter` in `page.tsx`. */
function makeRouter() {
  const push = vi.fn<(url: string) => void>()
  const replace = vi.fn<(url: string) => void>()
  return { push, replace }
}

/** In-memory localStorage stub so the auth store's writes don't pollute jsdom. */
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
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  }
}

/** Reset cookies set by the auth + shop-context stores. */
function clearAllCookies() {
  if (typeof document === "undefined") return
  for (const part of (document.cookie || "").split(/;\s*/)) {
    const eq = part.indexOf("=")
    const name = eq === -1 ? part : part.slice(0, eq)
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  }
}

/** Reset the Zustand stores back to their initial unhydrated state. */
function resetStores() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isHydrated: false,
  })
  useShopContextStore.setState({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [],
    isHydrated: false,
  })
}

/**
 * Configure the mocked `selectShop` to resolve with a deterministic success
 * payload for whichever assignment the n=1 branch passes in. The store is
 * later expected to reflect those exact values.
 */
function primeSelectShopMock() {
  vi.mocked(selectShop).mockImplementation(
    async (
      _shopId: string,
      shopAssignment?: ShopAssignment,
    ): Promise<SelectShopResult> => ({
      token: "shop-scoped-jwt",
      shopRole: "SHOP_ADMIN",
      permissions: ["orders.read", "shop-products.read"],
      shop: shopAssignment ?? null,
    }),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

/** Single ShopAssignment with a generated UUID id. */
const shopAssignmentArb = (): fc.Arbitrary<ShopAssignment> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 32 }),
    branchCode: fc.string({ minLength: 1, maxLength: 16 }),
    city: fc.string({ minLength: 1, maxLength: 24 }),
    role: fc.constantFrom(
      "SHOP_ADMIN",
      "SHOP_MANAGER",
      "SHOP_STAFF",
      "SHOP_VIEWER",
    ) as fc.Arbitrary<ShopAssignment["role"]>,
    isActive: fc.boolean(),
  })

/**
 * `loginResponse` arbitrary: a full `AuthResponse` shape backed by a
 * uniquely-id'd `shops[]` of length n ∈ [0, 5] and an arbitrary
 * `isSuperAdmin` flag.
 */
const loginResponseArb = (): fc.Arbitrary<AuthResponse> =>
  fc.record({
    accessToken: fc.string({ minLength: 8, maxLength: 32 }),
    user: fc.constant(ADMIN_USER),
    isSuperAdmin: fc.boolean(),
    shops: fc.uniqueArray(shopAssignmentArb(), {
      minLength: 0,
      maxLength: 5,
      selector: (s) => s.id,
    }),
  })

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: makeMockStorage(),
    writable: true,
  })
  clearAllCookies()
  resetStores()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  vi.mocked(selectShop).mockReset()
  primeSelectShopMock()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("dispatchPostLogin — shop-count routing", () => {
  it("routes per the spec table for every (isSuperAdmin, shopCount) tuple", async () => {
    await fc.assert(
      fc.asyncProperty(loginResponseArb(), async (data) => {
        // Reset state before every shrink iteration so each invocation
        // starts from a clean baseline (the lifecycle hook above only fires
        // once per `it`, not once per fast-check run).
        Object.defineProperty(window, "localStorage", {
          value: makeMockStorage(),
          writable: true,
        })
        clearAllCookies()
        resetStores()
        vi.mocked(toast.success).mockClear()
        vi.mocked(toast.error).mockClear()
        vi.mocked(selectShop).mockClear()
        primeSelectShopMock()

        const router = makeRouter()
        await dispatchPostLogin(data, DEFAULT_REDIRECT, router)

        const authState = useAuthStore.getState()
        const shopState = useShopContextStore.getState()
        const shops = data.shops ?? []
        const n = shops.length

        // ── Branch A: Super_Admin (Req 1.5) ──────────────────────────────
        if (data.isSuperAdmin) {
          expect(shopState.mode).toBe("ALL_SHOPS")
          expect(shopState.activeShopId).toBeNull()
          expect(shopState.assignedShopIds).toEqual([])
          expect(shopState.shopMeta).toBeNull()
          expect(router.push).toHaveBeenCalledTimes(1)
          expect(router.push).toHaveBeenCalledWith(DEFAULT_REDIRECT)
          // Auth store carries the unscoped token
          expect(authState.accessToken).toBe(data.accessToken)
          expect(authState.isAuthenticated).toBe(true)
          // selectShop must NOT be invoked for super admins
          expect(selectShop).not.toHaveBeenCalled()
          return
        }

        // ── Branch B: Vendor with no shops (Req 1.2) ─────────────────────
        if (n === 0) {
          // Auth + shop stores both cleared
          expect(authState.user).toBeNull()
          expect(authState.accessToken).toBeNull()
          expect(authState.isAuthenticated).toBe(false)
          expect(shopState.mode).toBe("UNSELECTED")
          expect(shopState.activeShopId).toBeNull()
          expect(shopState.assignedShopIds).toEqual([])
          // No redirect, error toast displayed
          expect(router.push).not.toHaveBeenCalled()
          expect(toast.error).toHaveBeenCalledTimes(1)
          expect(selectShop).not.toHaveBeenCalled()
          return
        }

        // ── Branch C: Vendor with exactly one shop (Req 1.3) ─────────────
        if (n === 1) {
          const only = shops[0]
          expect(shopState.mode).toBe("SINGLE_SHOP")
          expect(shopState.activeShopId).toBe(only.id)
          expect(shopState.shopMeta).toEqual({
            id: only.id,
            name: only.name,
            branchCode: only.branchCode,
            city: only.city,
            isActive: only.isActive,
          })
          expect(shopState.shopRole).toBe("SHOP_ADMIN")
          expect(shopState.permissions).toEqual([
            "orders.read",
            "shop-products.read",
          ])
          // Tamper-guard list is locked to the single assigned shop
          expect(shopState.assignedShopIds).toEqual([only.id])
          expect(router.push).toHaveBeenCalledTimes(1)
          expect(router.push).toHaveBeenCalledWith(DEFAULT_REDIRECT)
          // Auth store carries the shop-scoped token from the mock
          expect(authState.accessToken).toBe("shop-scoped-jwt")
          expect(selectShop).toHaveBeenCalledTimes(1)
          expect(selectShop).toHaveBeenCalledWith(only.id, only)
          return
        }

        // ── Branch D: Vendor with two or more shops (Req 1.4) ────────────
        // n >= 2
        expect(shopState.activeShopId).toBeNull()
        expect(shopState.mode).toBe("UNSELECTED")
        expect(shopState.shopMeta).toBeNull()
        // Tamper-guard list seeded with every assigned shop's id, in order
        expect(shopState.assignedShopIds).toEqual(shops.map((s) => s.id))
        expect(router.push).toHaveBeenCalledTimes(1)
        expect(router.push).toHaveBeenCalledWith("/select-shop")
        // selectShop must NOT be invoked — that happens later on the
        // Shop_Selector page (task 2.4).
        expect(selectShop).not.toHaveBeenCalled()
        // Auth store carries the unscoped login token
        expect(authState.accessToken).toBe(data.accessToken)
        expect(authState.isAuthenticated).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})
