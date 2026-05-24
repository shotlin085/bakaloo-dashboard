/**
 * Page-level test for the Shop_Selector search filter.
 *
 * Companion to the per-component tests in `_components/__tests__/`:
 *   - `shop-card.test.tsx`   — renders + CTA contract for `<ShopCard />`
 *   - `shop-search.test.tsx` — debounce contract for `<ShopSearch />`
 *
 * This file exercises the integration between the two: the page wires
 * `<ShopSearch />`'s debounced output through a `useMemo` that filters the
 * card list by name OR branchCode (case-insensitive substring), per Req 2.6.
 *
 * Test strategy:
 *   - Mock `useMyShops` to return three shops with deliberately distinct
 *     names and branch codes so a single substring matches exactly one row.
 *   - Mock `useSelectShop` so the page does not try to fire a real mutation
 *     when the test interacts with the cards.
 *   - Mock `next/navigation`'s `useRouter` so `replace` is observable but
 *     not required for the filter assertions.
 *   - Use fake timers to deterministically cross the 300ms `<ShopSearch />`
 *     debounce window.
 *
 * Validates: Requirements 2.6, 14.3
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the page module)
// ─────────────────────────────────────────────────────────────────────────────

const useRouterMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}))

const useMyShopsMock = vi.fn()
const useSelectShopMock = vi.fn()
vi.mock("@/hooks/useMyShops", () => ({
  useMyShops: () => useMyShopsMock(),
  useSelectShop: () => useSelectShopMock(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import SelectShopPage from "@/app/(auth)/select-shop/page"
import { useAuthStore } from "@/store/auth.store"
import type { ShopAssignment } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Three shops with distinct names AND branch codes so the filter can be
 * exercised across both fields and across casing.
 */
const SHOPS: ShopAssignment[] = [
  {
    id: "shop-bandra",
    name: "Bakaloo Bandra",
    branchCode: "BR-MUM-01",
    city: "Mumbai",
    role: "SHOP_MANAGER",
    isActive: true,
  },
  {
    id: "shop-pune",
    name: "Bakaloo Pune",
    branchCode: "BR-PUN-01",
    city: "Pune",
    role: "SHOP_ADMIN",
    isActive: true,
  },
  {
    id: "shop-delhi",
    name: "Spice Delhi",
    branchCode: "BR-DEL-99",
    city: "Delhi",
    role: "SHOP_VIEWER",
    isActive: true,
  },
]

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

/**
 * Configure the default `useMyShops` mock return: a settled query resolving
 * to the three fixture shops.
 */
function primeMyShops(data: ShopAssignment[] = SHOPS) {
  useMyShopsMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
}

/**
 * Configure the default `useSelectShop` mock return: an idle mutation. No
 * test in this file fires the mutation, but the page reads `isPending` and
 * calls `mutate` so we hand back a complete shape.
 */
function primeSelectShop() {
  useSelectShopMock.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    reset: vi.fn(),
  })
}

/**
 * Pull the rendered shop-card elements (in DOM order) by their data-shop-id
 * attribute. The card subcomponent stamps `data-testid="shop-card"` plus
 * `data-shop-id` so test code can match without depending on copy.
 */
function getRenderedShopIds(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid="shop-card"]'),
  ).map((el) => el.getAttribute("data-shop-id") ?? "")
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: makeMockStorage(),
    writable: true,
  })

  // Reset auth store so the page's `useAuthStore((s) => s.logout)` selector
  // returns a real (no-op-equivalent) logout function.
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isHydrated: true,
  })

  useRouterMock.mockReset()
  useRouterMock.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })

  useMyShopsMock.mockReset()
  useSelectShopMock.mockReset()
  primeMyShops()
  primeSelectShop()

  // Fake timers so we can deterministically cross the 300ms debounce.
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Shop_Selector page — search filter", () => {
  it("renders all three shops by default (no search query)", () => {
    render(<SelectShopPage />)

    // All three cards are visible in the DOM.
    expect(getRenderedShopIds()).toEqual([
      "shop-bandra",
      "shop-pune",
      "shop-delhi",
    ])
  })

  it("filters cards by name substring after the 300ms debounce settles", () => {
    render(<SelectShopPage />)

    const search = screen.getByRole("searchbox") as HTMLInputElement
    act(() => {
      fireEvent.change(search, { target: { value: "pune" } })
    })

    // Inside the debounce window — no filter has applied yet.
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(getRenderedShopIds()).toEqual([
      "shop-bandra",
      "shop-pune",
      "shop-delhi",
    ])

    // Cross the threshold — only the matching card remains.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(getRenderedShopIds()).toEqual(["shop-pune"])
  })

  it("filters by branch-code substring", () => {
    render(<SelectShopPage />)

    const search = screen.getByRole("searchbox")
    act(() => {
      fireEvent.change(search, { target: { value: "DEL-99" } })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Only the Delhi shop's branch code contains "DEL-99".
    expect(getRenderedShopIds()).toEqual(["shop-delhi"])
  })

  it("matches case-insensitively", () => {
    render(<SelectShopPage />)

    const search = screen.getByRole("searchbox")
    act(() => {
      // "BANDRA" in upper-case matches the lower-case "Bandra" in the name.
      fireEvent.change(search, { target: { value: "BANDRA" } })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(getRenderedShopIds()).toEqual(["shop-bandra"])
  })

  it("matches across both name and branch code in a single query", () => {
    render(<SelectShopPage />)

    const search = screen.getByRole("searchbox")
    act(() => {
      // "BR-" appears in every branch code, so all three should be visible.
      fireEvent.change(search, { target: { value: "BR-" } })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(getRenderedShopIds()).toEqual([
      "shop-bandra",
      "shop-pune",
      "shop-delhi",
    ])
  })

  it("renders the empty-state message when no shop matches the query", () => {
    render(<SelectShopPage />)

    const search = screen.getByRole("searchbox")
    act(() => {
      fireEvent.change(search, { target: { value: "no-such-shop" } })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(getRenderedShopIds()).toEqual([])
    expect(screen.getByText(/no shops match your search/i)).toBeInTheDocument()
  })

  it("hides the search input when the user has only one shop", () => {
    primeMyShops([SHOPS[0]])

    render(<SelectShopPage />)

    // A single-shop assignment list does not need a search affordance
    // (Req 2.6 — search rendered only when shops.length > 1).
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    // The single card is still rendered.
    expect(getRenderedShopIds()).toEqual(["shop-bandra"])
  })
})
