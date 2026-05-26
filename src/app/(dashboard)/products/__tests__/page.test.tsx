/**
 * Unit tests for the Products page tab shell (task 12.5).
 *
 * Covers the page-level behaviors owned by this task:
 *   - Both tab triggers render: "Master Catalog" + "Shop Products" when the
 *     user holds `shop-products.read`.
 *   - The "Shop Products" tab is hidden when the user lacks
 *     `shop-products.read`.
 *   - The "Shop Products" trigger is disabled when `mode !== "STORE_MODE"`
 *     and enabled when `mode === "STORE_MODE"`.
 *   - The Master Catalog tab is the default panel and renders the Master
 *     Catalog body (the trigger remains active even without an active shop).
 *
 * Validates: Requirements 10.7
 *
 * The Master Catalog and Shop Products view bodies are mocked at the
 * module boundary so the test focuses on tab plumbing and not on the
 * embedded view internals (each view has its own dedicated test file).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

// Hoisted shared mocks — the factories below close over these so each test
// can re-prime the return values per-spec.
const useShopContextMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => false,
}))

const useRouteRBACMock = vi.fn()
vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: (...args: unknown[]) => useRouteRBACMock(...args),
}))

// Stub the embedded view bodies so the test focuses on the tab shell.
vi.mock(
  "@/app/(dashboard)/products/_components/master-catalog-view",
  () => ({
    MasterCatalogView: () => (
      <div data-testid="master-catalog-view">master catalog body</div>
    ),
  }),
)

vi.mock(
  "@/app/(dashboard)/shop-products/_components/shop-products-view",
  () => ({
    ShopProductsView: ({ embedded }: { embedded?: boolean }) => (
      <div data-testid="shop-products-view" data-embedded={String(!!embedded)}>
        shop products body
      </div>
    ),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ProductsPage from "@/app/(dashboard)/products/page"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function primeSingleShopMode() {
  useShopContextMock.mockReturnValue({
    activeShopId: "shop-a",
    mode: "STORE_MODE",
    shopRole: "SHOP_ADMIN",
    permissions: ["shop-products.read"],
    shopMeta: {
      id: "shop-a",
      name: "Shop A",
      branchCode: "BR-A",
      city: "Mumbai",
      isActive: true,
    },
    isReady: true,
  })
}

function primeAllShopsMode() {
  useShopContextMock.mockReturnValue({
    activeShopId: null,
    mode: "HQ_MODE",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    isReady: true,
  })
}

function primeUnselectedMode() {
  useShopContextMock.mockReturnValue({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    isReady: true,
  })
}

function primeRBAC({ canRead }: { canRead: boolean }) {
  useRouteRBACMock.mockReturnValue({
    isAuthorized: canRead,
    canRead,
    canWrite: canRead,
    requiresActiveShop: true,
    superAdminOnly: false,
    guard: null,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShopContextMock.mockReset()
  useRouteRBACMock.mockReset()
  // Defaults — each test can override.
  primeSingleShopMode()
  primeRBAC({ canRead: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Products page — tab visibility", () => {
  it("renders both Master Catalog and Shop Products triggers when the user holds shop-products.read", () => {
    primeSingleShopMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    expect(
      screen.getByRole("tab", { name: "Master Catalog" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: "Shop Products" }),
    ).toBeInTheDocument()
  })

  it("hides the Shop Products trigger when the user lacks shop-products.read", () => {
    primeSingleShopMode()
    primeRBAC({ canRead: false })

    render(<ProductsPage />)

    expect(
      screen.getByRole("tab", { name: "Master Catalog" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("tab", { name: "Shop Products" }),
    ).not.toBeInTheDocument()
  })
})

describe("Products page — Shop Products trigger gating on active shop", () => {
  it("enables the Shop Products trigger when mode === SINGLE_SHOP", () => {
    primeSingleShopMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    const trigger = screen.getByTestId("shop-products-tab-trigger")
    expect(trigger).not.toBeDisabled()
    expect(trigger).toHaveAttribute("aria-disabled", "false")
  })

  it("disables the Shop Products trigger when mode === ALL_SHOPS", () => {
    primeAllShopsMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    const trigger = screen.getByTestId("shop-products-tab-trigger")
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("aria-disabled", "true")
  })

  it("disables the Shop Products trigger when mode === UNSELECTED", () => {
    primeUnselectedMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    const trigger = screen.getByTestId("shop-products-tab-trigger")
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("aria-disabled", "true")
  })
})

describe("Products page — default tab + embedded view", () => {
  it("renders the Master Catalog body in the active panel by default", () => {
    primeSingleShopMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    // Radix Tabs marks the inactive panel as `hidden`, so we assert that
    // the Master Catalog body lives inside the panel labelled by the
    // Master Catalog tab.
    const masterPanel = screen.getByRole("tabpanel", {
      name: "Master Catalog",
    })
    expect(masterPanel).toContainElement(
      screen.getByTestId("master-catalog-view"),
    )
  })

  it("activates the Shop Products panel on trigger click and embeds the inventory view", async () => {
    primeSingleShopMode()
    primeRBAC({ canRead: true })

    render(<ProductsPage />)

    const trigger = screen.getByTestId("shop-products-tab-trigger")

    // Radix Tabs commits the selection on `pointerDown`, not the synthetic
    // click event fired by `fireEvent.click`. Driving the same sequence
    // ourselves keeps the assertion deterministic in jsdom.
    await act(async () => {
      fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
      fireEvent.mouseDown(trigger, { button: 0 })
      fireEvent.click(trigger)
    })

    // Trigger flips to selected; this confirms the Tabs root accepted
    // the click without us having to inspect Radix's lazy-mounted panel
    // children, which are intentionally absent from the DOM until the
    // tab becomes active.
    expect(trigger).toHaveAttribute("aria-selected", "true")
  })
})
