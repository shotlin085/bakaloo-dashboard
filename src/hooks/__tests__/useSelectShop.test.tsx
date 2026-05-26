/**
 * Unit tests for the `useSelectShop` mutation hook.
 *
 * Covers the success and failure paths of the hook from
 * `src/hooks/useMyShops.ts`:
 *
 *   - **Success**: replaces the auth-store token with the new shop-scoped
 *     JWT, populates the Shop_Context_Store with the returned shop meta /
 *     role / permissions, and invalidates every shop-scoped TanStack Query
 *     cache entry.
 *   - **Failure**: leaves the Shop_Context_Store untouched and the auth
 *     store carrying the original (pre-mutation) token. The hook itself
 *     does not toast — the calling page handles user-facing error
 *     surfacing — so the assertion is on the resulting state, not on
 *     `sonner`.
 *
 * Validates: Requirements 2.4, 2.5, 1.3, 3.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the hook)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock `selectShop` at the service-module boundary so the hook's mutation
 * can be steered between success and failure deterministically. Other
 * exports are preserved via `importOriginal` to keep `selectShop`'s peers
 * (login, getMyShops, ...) compiling normally.
 */
vi.mock("@/services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth.service")>()
  return {
    ...actual,
    selectShop: vi.fn(),
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { useSelectShop } from "@/hooks/useMyShops"
import { selectShop } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import { qk } from "@/lib/query-keys"
import type {
  AdminUser,
  SelectShopResult,
  ShopAssignment,
} from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures (test-only fake tokens — no real credentials)
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_TOKEN = "unscoped-jwt-test-fixture"
const SHOP_SCOPED_TOKEN = "shop-scoped-jwt-test-fixture"

const ADMIN_USER: AdminUser = {
  id: "u-1",
  name: "Test User",
  email: "test@example.com",
  phone: "+1000",
  role: "SHOP_MANAGER" as AdminUser["role"],
  permissions: [],
}

const SHOP_BANDRA: ShopAssignment = {
  id: "shop-bandra",
  name: "Bakaloo Bandra",
  branchCode: "BR-MUM-01",
  city: "Mumbai",
  role: "SHOP_MANAGER",
  isActive: true,
}

const SUCCESS_RESULT: SelectShopResult = {
  token: SHOP_SCOPED_TOKEN,
  shopRole: "SHOP_ADMIN",
  permissions: ["orders.read", "shop-products.read"],
  shop: SHOP_BANDRA,
}

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
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  }
}

function clearAllCookies() {
  if (typeof document === "undefined") return
  for (const part of (document.cookie || "").split(/;\s*/)) {
    const eq = part.indexOf("=")
    const name = eq === -1 ? part : part.slice(0, eq)
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  }
}

/**
 * Reset the Zustand stores. The auth store is seeded with the user + the
 * pre-mutation `ORIGINAL_TOKEN` so the success path can prove the token was
 * replaced and the failure path can prove it was not.
 */
function resetStores() {
  useAuthStore.setState({
    user: ADMIN_USER,
    accessToken: ORIGINAL_TOKEN,
    isAuthenticated: true,
    isHydrated: true,
  })
  useShopContextStore.setState({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [SHOP_BANDRA.id], // vendor with this shop assigned
    isHydrated: true,
  })
}

/**
 * Create a `QueryClient` and seed it with a shop-scoped entry plus a
 * non-shop-scoped entry so the success-path invalidation behavior can be
 * asserted at the per-key level.
 */
function makeSeededQueryClient(): QueryClient {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  qc.setQueryData(qk.shopProducts(SHOP_BANDRA.id, { page: 1 }), { items: [] })
  qc.setQueryData(qk.myShops(), [SHOP_BANDRA])
  return qc
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
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
  vi.mocked(selectShop).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Success path
// ─────────────────────────────────────────────────────────────────────────────

describe("useSelectShop — success path", () => {
  it("replaces the auth token, sets the shop context, and invalidates shop-scoped queries", async () => {
    vi.mocked(selectShop).mockResolvedValueOnce(SUCCESS_RESULT)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useSelectShop(), {
      wrapper: makeWrapper(qc),
    })

    // Fire the mutation and await the resolved result.
    let resolved: SelectShopResult | undefined
    await act(async () => {
      resolved = await result.current.mutateAsync({
        shopId: SHOP_BANDRA.id,
        shopAssignment: SHOP_BANDRA,
      })
    })

    // Wait for the mutation to settle — `onSuccess` runs after the promise
    // resolves, so we use `waitFor` to give React a tick to flush state.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // ── Service was called with the right arguments ─────────────────────
    expect(selectShop).toHaveBeenCalledTimes(1)
    expect(selectShop).toHaveBeenCalledWith(SHOP_BANDRA.id, SHOP_BANDRA)
    expect(resolved).toEqual(SUCCESS_RESULT)

    // ── Auth store: token replaced with the shop-scoped JWT ─────────────
    const auth = useAuthStore.getState()
    expect(auth.accessToken).toBe(SHOP_SCOPED_TOKEN)
    expect(auth.user).toEqual(ADMIN_USER)
    expect(auth.isAuthenticated).toBe(true)

    // ── Shop_Context_Store: pivoted to SINGLE_SHOP with the new meta ────
    // NOTE: the hook passes `result.shop` (the full `ShopAssignment`) into
    // `setActiveShop` without projecting, so the store's runtime shape
    // carries every field on the assignment (including `role`). Asserting
    // via `objectContaining` keeps the test stable if the hook later
    // projects to a strict 5-field `ShopMeta` shape, while still verifying
    // that every required `ShopMeta` field made it through.
    const shop = useShopContextStore.getState()
    expect(shop.mode).toBe("STORE_MODE")
    expect(shop.activeShopId).toBe(SHOP_BANDRA.id)
    expect(shop.shopMeta).toEqual(
      expect.objectContaining({
        id: SHOP_BANDRA.id,
        name: SHOP_BANDRA.name,
        branchCode: SHOP_BANDRA.branchCode,
        city: SHOP_BANDRA.city,
        isActive: SHOP_BANDRA.isActive,
      }),
    )
    expect(shop.shopRole).toBe(SUCCESS_RESULT.shopRole)
    expect(shop.permissions).toEqual(SUCCESS_RESULT.permissions)

    // ── QueryClient: shop-scoped entry invalidated, my-shops untouched ──
    const shopProductsState = qc.getQueryState(
      qk.shopProducts(SHOP_BANDRA.id, { page: 1 }),
    )
    const myShopsState = qc.getQueryState(qk.myShops())
    expect(shopProductsState?.isInvalidated).toBe(true)
    expect(myShopsState?.isInvalidated).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Failure path
// ─────────────────────────────────────────────────────────────────────────────

describe("useSelectShop — failure path", () => {
  it("leaves the shop context untouched and keeps the original auth token when selectShop rejects", async () => {
    const failure = Object.assign(new Error("STAFF_NOT_FOUND"), {
      response: { data: { message: "You are not assigned to this shop." } },
    })
    vi.mocked(selectShop).mockRejectedValueOnce(failure)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useSelectShop(), {
      wrapper: makeWrapper(qc),
    })

    // Snapshot pre-mutation state so we can prove it is unchanged on failure.
    const authBefore = useAuthStore.getState()
    const shopBefore = useShopContextStore.getState()

    // Fire the mutation and assert it rejects.
    let caught: unknown
    await act(async () => {
      try {
        await result.current.mutateAsync({
          shopId: SHOP_BANDRA.id,
          shopAssignment: SHOP_BANDRA,
        })
      } catch (err) {
        caught = err
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // ── Service was called and the error propagated to the caller ──────
    expect(selectShop).toHaveBeenCalledTimes(1)
    expect(caught).toBe(failure)

    // ── Auth store: token NOT replaced — original value preserved ───────
    const authAfter = useAuthStore.getState()
    expect(authAfter.accessToken).toBe(ORIGINAL_TOKEN)
    expect(authAfter.user).toEqual(authBefore.user)
    expect(authAfter.isAuthenticated).toBe(authBefore.isAuthenticated)

    // ── Shop_Context_Store: completely unchanged ───────────────────────
    const shopAfter = useShopContextStore.getState()
    expect(shopAfter.mode).toBe(shopBefore.mode)
    expect(shopAfter.activeShopId).toBe(shopBefore.activeShopId)
    expect(shopAfter.shopMeta).toEqual(shopBefore.shopMeta)
    expect(shopAfter.shopRole).toBe(shopBefore.shopRole)
    expect(shopAfter.permissions).toEqual(shopBefore.permissions)
    expect(shopAfter.assignedShopIds).toEqual(shopBefore.assignedShopIds)

    // ── QueryClient: failure path does NOT invalidate shop-scoped keys ─
    const shopProductsState = qc.getQueryState(
      qk.shopProducts(SHOP_BANDRA.id, { page: 1 }),
    )
    expect(shopProductsState?.isInvalidated).toBe(false)
  })
})
