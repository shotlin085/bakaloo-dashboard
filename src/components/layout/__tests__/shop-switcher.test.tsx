/**
 * Unit tests for the Super_Admin `<ShopSwitcher />`.
 *
 * Covers the user-visible contract from design.md §4 and Req 3.1–3.7:
 *   - Hidden for vendor users (`assignedShopIds.length > 0`).
 *   - Hidden for non-super-admin users.
 *   - For super admins, the trigger label shows the current shop name in
 *     SINGLE_SHOP mode, otherwise "All Shops".
 *   - The popover renders "All Shops" pinned at the top, followed by active
 *     shops sorted by name.
 *   - Search filters active shops case-insensitively but never hides the
 *     pinned "All Shops" entry.
 *   - Selecting a shop calls `setActiveShop(meta, "SHOP_ADMIN", perms)` with
 *     the correct meta projection and invalidates shop-scoped queries.
 *   - Selecting "All Shops" calls `setAllShopsMode()` and invalidates shop-
 *     scoped queries.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ShopSwitcher } from "@/components/layout/shop-switcher"
import { useShopContextStore } from "@/store/shop-context.store"
import { useAuthStore } from "@/store/auth.store"
import { ROLE_DEFAULTS } from "@/lib/permissions"
import { isShopScopedKey, qk } from "@/lib/query-keys"
import type { Shop, AdminUser, Paginated } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock the `useActiveShopsForSwitcher` hook so the test does not have to
 * stand up axios + a real network round-trip. Other exports from the
 * `useShops` module are preserved with `importOriginal` so unrelated
 * imports keep working.
 */
const useActiveShopsForSwitcherMock = vi.fn()
vi.mock("@/hooks/useShops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useShops")>()
  return {
    ...actual,
    useActiveShopsForSwitcher: () => useActiveShopsForSwitcherMock(),
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeShop(partial: Partial<Shop> & Pick<Shop, "id" | "name">): Shop {
  return {
    id: partial.id,
    name: partial.name,
    slug: partial.slug ?? partial.name.toLowerCase().replace(/\s+/g, "-"),
    branch_code: partial.branch_code ?? "BR-XX",
    description: undefined,
    address_line1: partial.address_line1 ?? "1 Test Lane",
    city: partial.city ?? "Mumbai",
    state: partial.state ?? "MH",
    pincode: partial.pincode ?? "400001",
    lat: partial.lat ?? 0,
    lng: partial.lng ?? 0,
    serviceable_pincodes: partial.serviceable_pincodes ?? [],
    delivery_radius_km: partial.delivery_radius_km ?? 5,
    is_active: partial.is_active ?? true,
    is_verified: partial.is_verified ?? true,
    operating_hours:
      partial.operating_hours ?? ({} as Shop["operating_hours"]),
    commission_rate: partial.commission_rate ?? 0,
    total_orders: partial.total_orders ?? 0,
    total_revenue: partial.total_revenue ?? 0,
    avg_rating: partial.avg_rating ?? 0,
    rating_count: partial.rating_count ?? 0,
    created_at: partial.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2024-01-01T00:00:00Z",
  }
}

const SHOP_BANDRA = makeShop({
  id: "shop-bandra",
  name: "Bakaloo Bandra",
  branch_code: "BR-MUM-01",
  city: "Mumbai",
})
const SHOP_PUNE = makeShop({
  id: "shop-pune",
  name: "Bakaloo Pune",
  branch_code: "BR-PUN-01",
  city: "Pune",
})
const SHOP_DELHI = makeShop({
  id: "shop-delhi",
  name: "Bakaloo Delhi",
  branch_code: "BR-DEL-01",
  city: "Delhi",
})

const ALL_SHOPS_PAGE: Paginated<Shop> = {
  items: [SHOP_PUNE, SHOP_BANDRA, SHOP_DELHI], // intentionally unsorted
  pagination: { page: 1, limit: 100, total: 3, totalPages: 1 },
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

function setSuperAdmin() {
  useAuthStore.setState({
    user: {
      id: "u1",
      name: "Sayan",
      email: "sayan@example.com",
      phone: "+10",
      role: "SUPER_ADMIN",
      permissions: [],
    } as unknown as AdminUser,
    accessToken: "tok",
    isAuthenticated: true,
    isHydrated: true,
  })
}

function setVendor() {
  useAuthStore.setState({
    user: {
      id: "u2",
      name: "Vendor",
      email: "vendor@example.com",
      phone: "+11",
      role: "SHOP_MANAGER",
      permissions: [],
    } as unknown as AdminUser,
    accessToken: "tok",
    isAuthenticated: true,
    isHydrated: true,
  })
}

function clearAuth() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isHydrated: true,
  })
}

function renderWithClient(
  ui: React.ReactElement,
  client?: QueryClient,
): ReturnType<typeof render> & { qc: QueryClient } {
  const qc =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  return {
    qc,
    ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>),
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
  // Reset Zustand stores between tests so localStorage and in-memory state
  // start from a known baseline.
  useShopContextStore.getState().clear()
  useShopContextStore.getState().setAssignedShopIds([])
  clearAuth()
  useActiveShopsForSwitcherMock.mockReset()
  useActiveShopsForSwitcherMock.mockReturnValue({
    data: ALL_SHOPS_PAGE,
    isLoading: false,
    isError: false,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Visibility (Req 3.1, 3.2, 3.7)
// ─────────────────────────────────────────────────────────────────────────────

describe("<ShopSwitcher /> visibility", () => {
  it("renders nothing for vendor users (assignedShopIds non-empty)", () => {
    // Even with super-admin role on the auth store, a non-empty
    // assignedShopIds set hard-locks the user to vendor mode.
    setSuperAdmin()
    useShopContextStore.getState().setAssignedShopIds(["shop-bandra"])

    const { container } = renderWithClient(<ShopSwitcher />)

    expect(container).toBeEmptyDOMElement()
    expect(useActiveShopsForSwitcherMock).not.toHaveBeenCalled()
  })

  it("renders nothing when there is no authenticated user", () => {
    // No `setSuperAdmin()` / `setVendor()` — `clearAuth()` already ran.
    const { container } = renderWithClient(<ShopSwitcher />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the trigger for super admins", () => {
    setSuperAdmin()
    renderWithClient(<ShopSwitcher />)

    expect(screen.getByTestId("shop-switcher-trigger")).toBeInTheDocument()
  })

  it("renders nothing for vendor users without an assigned-shops list", () => {
    // Empty assignedShopIds + non-super-admin role → still a vendor.
    setVendor()
    const { container } = renderWithClient(<ShopSwitcher />)

    expect(container).toBeEmptyDOMElement()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Trigger label (Req 3.1)
// ─────────────────────────────────────────────────────────────────────────────

describe("<ShopSwitcher /> trigger label", () => {
  it("shows 'All shops' when in ALL_SHOPS mode", () => {
    setSuperAdmin()
    useShopContextStore.getState().setAllShopsMode()

    renderWithClient(<ShopSwitcher />)

    expect(screen.getByTestId("shop-switcher-trigger")).toHaveTextContent(
      /all shops/i,
    )
  })

  it("shows the current shop's name in SINGLE_SHOP mode", () => {
    setSuperAdmin()
    useShopContextStore.getState().setActiveShop(
      {
        id: SHOP_BANDRA.id,
        name: SHOP_BANDRA.name,
        branchCode: SHOP_BANDRA.branch_code,
        city: SHOP_BANDRA.city,
        isActive: true,
      },
      "SHOP_ADMIN",
      [],
    )

    renderWithClient(<ShopSwitcher />)

    expect(screen.getByTestId("shop-switcher-trigger")).toHaveTextContent(
      "Bakaloo Bandra",
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Popover content (Req 3.3)
// ─────────────────────────────────────────────────────────────────────────────

describe("<ShopSwitcher /> popover content", () => {
  it("pins 'All Shops' at the top followed by active shops sorted by name", () => {
    setSuperAdmin()
    renderWithClient(<ShopSwitcher />)

    fireEvent.click(screen.getByTestId("shop-switcher-trigger"))

    // Pinned "All Shops" entry is visible regardless of search.
    expect(screen.getByTestId("shop-switcher-all-shops")).toBeInTheDocument()

    // Active shops appear in alphabetical order, not the order returned by
    // the service. We assert the order via the rendered option list.
    const options = screen.getAllByRole("option")
    // First option is "All Shops"; remaining are sorted by name.
    expect(options[0]).toHaveAttribute(
      "data-testid",
      "shop-switcher-all-shops",
    )
    expect(options[1]).toHaveAttribute(
      "data-testid",
      `shop-switcher-shop-${SHOP_BANDRA.id}`,
    )
    expect(options[2]).toHaveAttribute(
      "data-testid",
      `shop-switcher-shop-${SHOP_DELHI.id}`,
    )
    expect(options[3]).toHaveAttribute(
      "data-testid",
      `shop-switcher-shop-${SHOP_PUNE.id}`,
    )
  })

  it("filters active shops case-insensitively without hiding 'All Shops'", () => {
    setSuperAdmin()
    renderWithClient(<ShopSwitcher />)

    fireEvent.click(screen.getByTestId("shop-switcher-trigger"))

    // Use fake timers to deterministically advance the 200ms debounce. We
    // wrap the `change` event + timer advance in `act()` so React can flush
    // the resulting state update inside the same batch (otherwise the
    // re-render that drops filtered shops happens after the assertion).
    vi.useFakeTimers()
    try {
      const search = screen.getByTestId("shop-switcher-search")
      act(() => {
        fireEvent.change(search, { target: { value: "PUNE" } })
      })
      act(() => {
        vi.advanceTimersByTime(250)
      })
    } finally {
      vi.useRealTimers()
    }

    // Pinned "All Shops" is always visible.
    expect(screen.getByTestId("shop-switcher-all-shops")).toBeInTheDocument()
    // Only the matching shop remains.
    expect(
      screen.getByTestId(`shop-switcher-shop-${SHOP_PUNE.id}`),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId(`shop-switcher-shop-${SHOP_BANDRA.id}`),
    ).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Selection effects (Req 3.4, 3.5)
// ─────────────────────────────────────────────────────────────────────────────

describe("<ShopSwitcher /> selection", () => {
  it("on shop select: writes ShopMeta + SHOP_ADMIN role + ROLE_DEFAULTS perms and invalidates shop-scoped queries", () => {
    setSuperAdmin()
    useShopContextStore.getState().setAllShopsMode()

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    // Seed two cache entries: one shop-scoped, one not. Only the
    // shop-scoped key should be marked invalid after the selection.
    qc.setQueryData(qk.shopProducts("any", { page: 1 }), { items: [] })
    qc.setQueryData(qk.myShops(), { items: [] })

    renderWithClient(<ShopSwitcher />, qc)

    fireEvent.click(screen.getByTestId("shop-switcher-trigger"))
    fireEvent.click(
      screen.getByTestId(`shop-switcher-shop-${SHOP_BANDRA.id}`),
    )

    const ctx = useShopContextStore.getState()
    expect(ctx.mode).toBe("SINGLE_SHOP")
    expect(ctx.activeShopId).toBe(SHOP_BANDRA.id)
    expect(ctx.shopRole).toBe("SHOP_ADMIN")
    expect(ctx.shopMeta).toEqual({
      id: SHOP_BANDRA.id,
      name: SHOP_BANDRA.name,
      branchCode: SHOP_BANDRA.branch_code,
      city: SHOP_BANDRA.city,
      isActive: SHOP_BANDRA.is_active,
    })
    expect(ctx.permissions).toEqual([...ROLE_DEFAULTS.SHOP_ADMIN])

    // Shop-scoped key invalidated; non-shop-scoped key untouched.
    const shopProductsState = qc.getQueryState(
      qk.shopProducts("any", { page: 1 }),
    )
    const myShopsState = qc.getQueryState(qk.myShops())
    expect(shopProductsState?.isInvalidated).toBe(true)
    expect(myShopsState?.isInvalidated).toBe(false)

    // Sanity: the predicate underpinning the invalidation actually applied
    // to shop-scoped keys only.
    expect(isShopScopedKey(qk.shopProducts("any", { page: 1 }))).toBe(true)
    expect(isShopScopedKey(qk.myShops())).toBe(false)
  })

  it("on 'All Shops' select: clears the scope to ALL_SHOPS mode and invalidates shop-scoped queries", () => {
    setSuperAdmin()
    useShopContextStore.getState().setActiveShop(
      {
        id: SHOP_BANDRA.id,
        name: SHOP_BANDRA.name,
        branchCode: SHOP_BANDRA.branch_code,
        city: SHOP_BANDRA.city,
        isActive: true,
      },
      "SHOP_ADMIN",
      [...ROLE_DEFAULTS.SHOP_ADMIN],
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    qc.setQueryData(qk.orders(SHOP_BANDRA.id, { page: 1 }), { items: [] })

    renderWithClient(<ShopSwitcher />, qc)

    fireEvent.click(screen.getByTestId("shop-switcher-trigger"))
    fireEvent.click(screen.getByTestId("shop-switcher-all-shops"))

    const ctx = useShopContextStore.getState()
    expect(ctx.mode).toBe("ALL_SHOPS")
    expect(ctx.activeShopId).toBeNull()
    expect(ctx.shopMeta).toBeNull()
    expect(ctx.shopRole).toBeNull()
    expect(ctx.permissions).toEqual([])

    expect(
      qc.getQueryState(qk.orders(SHOP_BANDRA.id, { page: 1 }))?.isInvalidated,
    ).toBe(true)
  })

  it("renders the loading state inline while the active-shops query is in flight", () => {
    setSuperAdmin()
    useActiveShopsForSwitcherMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    renderWithClient(<ShopSwitcher />)

    fireEvent.click(screen.getByTestId("shop-switcher-trigger"))

    // 'All Shops' remains clickable even while the list is loading.
    expect(screen.getByTestId("shop-switcher-all-shops")).toBeInTheDocument()
    // The loading state is announced inline.
    const list = screen.getByRole("listbox")
    expect(within(list).getByText(/loading shops/i)).toBeInTheDocument()
  })
})
