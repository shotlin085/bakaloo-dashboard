/**
 * Deterministic parametrized unit tests for `dispatchPostLogin`.
 *
 * Companion to `dispatch-post-login.property.test.ts` (task 2.8): the
 * property test sweeps the input space with fast-check, while this file
 * locks in concrete examples for each row of the spec table so a regression
 * shows up with a clear, named failure.
 *
 * Spec table (Req 1.2 / 1.3 / 1.4 / 1.5):
 *
 *   | isSuperAdmin | shops.length | route          | active shop / store state              |
 *   |--------------|--------------|----------------|----------------------------------------|
 *   | true         | 0            | /dashboard     | mode=ALL_SHOPS, activeShopId=null      |
 *   | true         | 3            | /dashboard     | mode=ALL_SHOPS, activeShopId=null      |
 *   | false        | 0            | (no redirect)  | auth cleared, shop cleared, toast.err  |
 *   | false        | 1            | /dashboard     | mode=SINGLE_SHOP, activeShopId=shop[0] |
 *   | false        | 2            | /select-shop   | mode=UNSELECTED, assignedShopIds=ids   |
 *   | false        | 3            | /select-shop   | mode=UNSELECTED, assignedShopIds=ids   |
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the page module)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock `selectShop` so the n=1 branch resolves deterministically without
 * touching axios. Other exports are preserved via `importOriginal` so
 * unrelated imports keep working.
 */
vi.mock("@/services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth.service")>()
  return {
    ...actual,
    selectShop: vi.fn(),
  }
})

/**
 * Mock sonner so `toast.success` / `toast.error` are observable spies. The
 * login page imports `toast` from "sonner" at module level, so we mock the
 * whole package to avoid dragging in the real Sonner runtime.
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
  SelectShopResult,
  ShopAssignment,
} from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
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

function makeShop(i: number): ShopAssignment {
  return {
    id: `shop-${i}`,
    name: `Bakaloo ${i}`,
    branchCode: `BR-${i}`,
    city: "Mumbai",
    role: "SHOP_MANAGER",
    isActive: true,
  }
}

function makeAuthResponse(
  isSuperAdmin: boolean,
  shopCount: number,
): AuthResponse {
  return {
    accessToken: "unscoped-jwt",
    user: ADMIN_USER,
    isSuperAdmin,
    shops: Array.from({ length: shopCount }, (_, i) => makeShop(i)),
  }
}

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

/** Reset the Zustand stores between cases. */
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

/** Reset every cookie set by either store. */
function clearAllCookies() {
  if (typeof document === "undefined") return
  for (const part of (document.cookie || "").split(/;\s*/)) {
    const eq = part.indexOf("=")
    const name = eq === -1 ? part : part.slice(0, eq)
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  }
}

/**
 * Configure the mocked `selectShop` to resolve with a deterministic success
 * payload that folds the caller-provided assignment into `result.shop`,
 * matching the real service contract.
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
// Parametrized cases — the spec table from the task brief
// ─────────────────────────────────────────────────────────────────────────────

interface Case {
  isSuperAdmin: boolean
  shops: number
  /** Expected `router.push` argument; `null` means no redirect. */
  expectedRoute: string | null
  expectedMode: "ALL_SHOPS" | "SINGLE_SHOP" | "UNSELECTED"
}

const CASES: Case[] = [
  // (true, 0) and (true, 3): super admin always lands in ALL_SHOPS regardless of n
  { isSuperAdmin: true, shops: 0, expectedRoute: "/dashboard", expectedMode: "ALL_SHOPS" },
  { isSuperAdmin: true, shops: 3, expectedRoute: "/dashboard", expectedMode: "ALL_SHOPS" },
  // (false, 0): no shop assigned — error toast, no redirect
  { isSuperAdmin: false, shops: 0, expectedRoute: null, expectedMode: "UNSELECTED" },
  // (false, 1): single shop — auto-select, redirect home
  { isSuperAdmin: false, shops: 1, expectedRoute: "/dashboard", expectedMode: "SINGLE_SHOP" },
  // (false, 2) and (false, 3): redirect to /select-shop
  { isSuperAdmin: false, shops: 2, expectedRoute: "/select-shop", expectedMode: "UNSELECTED" },
  { isSuperAdmin: false, shops: 3, expectedRoute: "/select-shop", expectedMode: "UNSELECTED" },
]

describe("dispatchPostLogin — deterministic spec-table cases", () => {
  it.each(CASES)(
    "(isSuperAdmin=$isSuperAdmin, shops=$shops) → route=$expectedRoute, mode=$expectedMode",
    async ({ isSuperAdmin, shops, expectedRoute, expectedMode }) => {
      const data = makeAuthResponse(isSuperAdmin, shops)
      const router = makeRouter()

      await dispatchPostLogin(data, DEFAULT_REDIRECT, router)

      const auth = useAuthStore.getState()
      const shop = useShopContextStore.getState()

      // ── Mode invariant: every case has a deterministic resulting mode ──
      expect(shop.mode).toBe(expectedMode)

      // ── Route invariant: either we redirected or we did not ────────────
      if (expectedRoute === null) {
        expect(router.push).not.toHaveBeenCalled()
      } else {
        expect(router.push).toHaveBeenCalledTimes(1)
        expect(router.push).toHaveBeenCalledWith(expectedRoute)
      }

      // ── Per-branch detailed assertions ─────────────────────────────────
      if (isSuperAdmin) {
        // Branch A: Super_Admin (Req 1.5)
        expect(shop.activeShopId).toBeNull()
        expect(shop.shopMeta).toBeNull()
        expect(shop.assignedShopIds).toEqual([])
        // Auth carries the unscoped login token; selectShop never called
        expect(auth.accessToken).toBe(data.accessToken)
        expect(auth.isAuthenticated).toBe(true)
        expect(selectShop).not.toHaveBeenCalled()
        return
      }

      if (shops === 0) {
        // Branch B: Vendor with no shops (Req 1.2)
        expect(auth.user).toBeNull()
        expect(auth.accessToken).toBeNull()
        expect(auth.isAuthenticated).toBe(false)
        expect(shop.activeShopId).toBeNull()
        expect(shop.assignedShopIds).toEqual([])
        // Error toast surfaced; no success toast
        expect(toast.error).toHaveBeenCalledTimes(1)
        expect(toast.success).not.toHaveBeenCalled()
        expect(selectShop).not.toHaveBeenCalled()
        return
      }

      if (shops === 1) {
        // Branch C: Vendor with exactly one shop (Req 1.3)
        const only = (data.shops ?? [])[0]
        expect(shop.activeShopId).toBe(only.id)
        expect(shop.shopMeta).toEqual({
          id: only.id,
          name: only.name,
          branchCode: only.branchCode,
          city: only.city,
          isActive: only.isActive,
        })
        expect(shop.shopRole).toBe("SHOP_ADMIN")
        expect(shop.permissions).toEqual([
          "orders.read",
          "shop-products.read",
        ])
        // Tamper-guard list locked to the single assigned shop
        expect(shop.assignedShopIds).toEqual([only.id])
        // Auth carries the shop-scoped JWT from the mock
        expect(auth.accessToken).toBe("shop-scoped-jwt")
        expect(selectShop).toHaveBeenCalledTimes(1)
        expect(selectShop).toHaveBeenCalledWith(only.id, only)
        return
      }

      // Branch D: Vendor with two or more shops (Req 1.4)
      expect(shop.activeShopId).toBeNull()
      expect(shop.shopMeta).toBeNull()
      expect(shop.assignedShopIds).toEqual(
        (data.shops ?? []).map((s) => s.id),
      )
      // selectShop is deferred to the Shop_Selector page
      expect(selectShop).not.toHaveBeenCalled()
      // Unscoped login token is preserved across the redirect
      expect(auth.accessToken).toBe(data.accessToken)
      expect(auth.isAuthenticated).toBe(true)
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Single-shop failure path — covers the catch branch of the n=1 case
// ─────────────────────────────────────────────────────────────────────────────

describe("dispatchPostLogin — single-shop selectShop failure", () => {
  it("clears auth + shop stores and surfaces the error toast when selectShop rejects", async () => {
    const data = makeAuthResponse(false, 1)
    const router = makeRouter()

    // Flip the mock to reject for this case only.
    vi.mocked(selectShop).mockReset()
    vi.mocked(selectShop).mockRejectedValueOnce({
      response: { data: { message: "Server is on fire" } },
    })

    await dispatchPostLogin(data, DEFAULT_REDIRECT, router)

    const auth = useAuthStore.getState()
    const shop = useShopContextStore.getState()

    // No redirect — the user stays on /login per Req 1.3 fail path.
    expect(router.push).not.toHaveBeenCalled()
    // Stores cleared so a retry starts from a clean baseline.
    expect(auth.user).toBeNull()
    expect(auth.accessToken).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(shop.mode).toBe("UNSELECTED")
    expect(shop.activeShopId).toBeNull()
    // Error toast surfaced with the server-provided message.
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith("Server is on fire")
  })
})
