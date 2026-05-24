/**
 * Unit tests for `<ShopScopeBadge />`.
 *
 * Validates: Requirement 10.2 — the badge renders `Shop: <name>` only when
 * the dashboard is scoped to a single shop, and renders nothing in
 * `ALL_SHOPS` or `UNSELECTED` modes.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { act, render, screen } from "@testing-library/react"

import { ShopScopeBadge } from "@/components/layout/shop-scope-badge"
import { useShopContextStore } from "@/store/shop-context.store"
import type { ShopContextSnapshot } from "@/store/shop-context.store"

/**
 * `useShopContext()` is a Zustand subscription. Tests that mutate the store
 * before render are functionally equivalent to setting initial state, but
 * React still flags the subscription update unless we wrap the mutation in
 * `act()`. The helper keeps every test's setup quiet.
 *
 * Typed against `Partial<ShopContextSnapshot>` plus the `isHydrated` flag —
 * we never need to replace the action methods on the store from a test.
 */
function setShopContext(
  patch: Partial<ShopContextSnapshot> & { isHydrated?: boolean },
) {
  act(() => {
    useShopContextStore.setState(patch)
  })
}

function resetStore() {
  setShopContext({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [],
    isHydrated: true,
  })
}

beforeEach(() => {
  resetStore()
})

afterEach(() => {
  resetStore()
})

describe("ShopScopeBadge", () => {
  it("renders the formatted chip in SINGLE_SHOP mode", () => {
    setShopContext({
      activeShopId: "shop-a",
      mode: "SINGLE_SHOP",
      shopRole: "SHOP_ADMIN",
      permissions: ["orders.read"],
      shopMeta: {
        id: "shop-a",
        name: "Andheri Branch",
        branchCode: "BR-A",
        city: "Mumbai",
        isActive: true,
      },
      assignedShopIds: ["shop-a"],
      isHydrated: true,
    })

    render(<ShopScopeBadge />)

    const chip = screen.getByTestId("shop-scope-badge")
    expect(chip).toHaveTextContent("Shop: Andheri Branch")
    expect(chip).toHaveAttribute("aria-label", "Shop: Andheri Branch")
  })

  it("renders nothing in ALL_SHOPS mode", () => {
    setShopContext({
      activeShopId: null,
      mode: "ALL_SHOPS",
      shopRole: null,
      permissions: [],
      shopMeta: null,
      assignedShopIds: [],
      isHydrated: true,
    })

    const { container } = render(<ShopScopeBadge />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("shop-scope-badge")).toBeNull()
  })

  it("renders nothing in UNSELECTED mode", () => {
    // Default reset state is UNSELECTED with shopMeta == null.
    const { container } = render(<ShopScopeBadge />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("shop-scope-badge")).toBeNull()
  })

  it("renders nothing if shopMeta is missing even when mode is SINGLE_SHOP", () => {
    // Defensive guard: SINGLE_SHOP without a meta object is an inconsistent
    // state, but the component must still render nothing (Req 10.2).
    setShopContext({
      activeShopId: "shop-a",
      mode: "SINGLE_SHOP",
      shopRole: "SHOP_ADMIN",
      permissions: [],
      shopMeta: null,
      assignedShopIds: ["shop-a"],
      isHydrated: true,
    })

    const { container } = render(<ShopScopeBadge />)

    expect(container).toBeEmptyDOMElement()
  })

  it("forwards the className prop onto the rendered chip", () => {
    setShopContext({
      activeShopId: "shop-a",
      mode: "SINGLE_SHOP",
      shopRole: "SHOP_ADMIN",
      permissions: [],
      shopMeta: {
        id: "shop-a",
        name: "Andheri Branch",
        branchCode: "BR-A",
        city: "Mumbai",
        isActive: true,
      },
      assignedShopIds: ["shop-a"],
      isHydrated: true,
    })

    render(<ShopScopeBadge className="ml-4" />)

    expect(screen.getByTestId("shop-scope-badge")).toHaveClass("ml-4")
  })
})
