/**
 * Unit tests for the Shop_Products list page (task 8.3).
 *
 * Covers the page-level behaviors owned by this task:
 *   - Empty-shop short-circuit (Req 7.11) — when `mode !== "STORE_MODE"`
 *     the page renders `<EmptyShopState />` and never reads list data.
 *   - Low-stock header chip (Req 7.6) — counter is computed from currently
 *     visible rows and reflects rows where `stock_quantity` is at or below
 *     `low_stock_threshold` (inclusive of zero).
 *   - Add-product CTA (Req 7.4) — visible only when the user holds the
 *     `shop-products.write` permission.
 *   - All twelve columns from Req 7.2 are rendered as headers.
 *
 * Validates: Requirements 7.1, 7.2, 7.6, 7.11.
 *
 * The TanStack hooks are mocked at the module boundary so the test focuses
 * on the page wiring and does not exercise the network-IO layer (which has
 * its own coverage in `useShopProducts.test.tsx`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

// Hoisted shared mocks — the factories below close over these so each test
// can re-prime the return values per-spec.
const useShopContextMock = vi.fn()
const useIsSuperAdminMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => useIsSuperAdminMock(),
}))

const useShopProductsListMock = vi.fn()
vi.mock("@/hooks/useShopProducts", () => ({
  useShopProductsList: (...args: unknown[]) =>
    useShopProductsListMock(...args),
  // The page mounts `<AddProductDialog />` (task 8.5), which calls these
  // hooks during render. Provide inert stubs so the dialog can mount even
  // though the page tests never drive the dialog flow.
  useAddShopProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSearchProductCatalog: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  // Task 8.7 — the page now mounts `<ProductActions />` per row, which
  // pulls in the remove + update mutations. Stubs keep the cells inert
  // for tests that never drive the row actions.
  useRemoveShopProduct: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShopProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const useRouteRBACMock = vi.fn()
vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: (...args: unknown[]) => useRouteRBACMock(...args),
}))

const useCategoriesMock = vi.fn()
vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => useCategoriesMock(),
}))

// Task 8.8 — the page mounts `useShopProductLiveUpdates()` to wire socket
// events into the cache. The hook reads `useSocket()` + `useQueryClient()`,
// neither of which is provided by these unit tests. Stub the entire module
// so the page tests stay focused on their own concerns; the hook has its
// own dedicated test file.
vi.mock(
  "@/app/(dashboard)/shop-products/_components/use-shop-product-live-updates",
  () => ({
    useShopProductLiveUpdates: () => undefined,
  }),
)

// `next/image` returns a plain `<img>` so jsdom can render the thumbnail
// fallback without the production loader. Mirrors the pattern used elsewhere
// in the dashboard test suite.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ShopProductsPage from "@/app/(dashboard)/shop-products/page"
import type { ShopProduct } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: overrides.id ?? "sp-1",
    shop_id: "shop-a",
    product_id: "p-1",
    price: 100,
    sale_price: null,
    cost_price: null,
    stock_quantity: 10,
    low_stock_threshold: 5,
    max_order_qty: 5,
    is_available: true,
    is_featured: false,
    sold_out_at: null,
    restock_eta: null,
    product: {
      id: "p-1",
      name: "Sample product",
      sku: "SKU-001",
      image_url: "",
    },
    ...overrides,
  }
}

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
  useIsSuperAdminMock.mockReturnValue(false)
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
  useIsSuperAdminMock.mockReturnValue(true)
}

function primeListResponse(items: ShopProduct[]) {
  useShopProductsListMock.mockReturnValue({
    data: {
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: items.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
}

function primeRBAC({ canWrite }: { canWrite: boolean }) {
  useRouteRBACMock.mockReturnValue({
    isAuthorized: true,
    canRead: true,
    canWrite,
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
  useIsSuperAdminMock.mockReset()
  useShopProductsListMock.mockReset()
  useRouteRBACMock.mockReset()
  useCategoriesMock.mockReset()

  // Sensible defaults — each test can override.
  primeSingleShopMode()
  primeListResponse([])
  primeRBAC({ canWrite: true })
  useCategoriesMock.mockReturnValue({ data: [] })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Shop_Products page — empty-shop short-circuit", () => {
  it("renders the EmptyShopState when mode is ALL_SHOPS and never mounts the list shell", () => {
    primeAllShopsMode()

    render(<ShopProductsPage />)

    // Empty state title from `t("emptyShop.title")`.
    expect(screen.getByText("Select a shop")).toBeInTheDocument()

    // The list hook is still invoked (React unconditionally calls all hooks
    // above the early-return), but the page short-circuits before any list
    // rows or filters are mounted — verified by the absence of the search
    // input, the data table, and the low-stock chip.
    expect(
      screen.queryByPlaceholderText("Search by name or SKU"),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByTestId("low-stock-chip")).not.toBeInTheDocument()
  })

  it("shows the super-admin hint when isSuperAdmin is true", () => {
    primeAllShopsMode()

    render(<ShopProductsPage />)

    expect(
      screen.getByText("Use the shop switcher in the topbar."),
    ).toBeInTheDocument()
  })

  it("shows the vendor CTA when the user is not a super admin", () => {
    useShopContextMock.mockReturnValue({
      activeShopId: null,
      mode: "UNSELECTED",
      shopRole: null,
      permissions: [],
      shopMeta: null,
      isReady: true,
    })
    useIsSuperAdminMock.mockReturnValue(false)

    render(<ShopProductsPage />)

    expect(
      screen.getByRole("link", { name: /choose a shop/i }),
    ).toBeInTheDocument()
  })
})

describe("Shop_Products page — list shell in SINGLE_SHOP mode", () => {
  it("renders all twelve column headers from Req 7.2 in the canonical order", () => {
    primeListResponse([makeProduct()])

    render(<ShopProductsPage />)

    // The DataList shell renders both a table (md+) and stacked cards
    // (below md). The `columnheader` role is only present on the <th>
    // elements inside the table, so we count exactly twelve.
    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(12)

    const headerText = headers.map((h) => h.textContent?.trim())
    expect(headerText).toEqual([
      "Image",
      "Product",
      "SKU",
      "Price",
      "Sale price",
      "Stock",
      "Low-stock threshold",
      "Max order qty",
      "Available",
      "Featured",
      "Sold out at",
      "Actions",
    ])
  })

  it("computes the low-stock chip count from the visible rows (inclusive of zero)", () => {
    // Two below threshold (4 ≤ 5, 0 ≤ 5) plus one above (10 > 5).
    primeListResponse([
      makeProduct({ id: "sp-low", stock_quantity: 4, low_stock_threshold: 5 }),
      makeProduct({
        id: "sp-zero",
        stock_quantity: 0,
        low_stock_threshold: 5,
      }),
      makeProduct({
        id: "sp-ok",
        stock_quantity: 10,
        low_stock_threshold: 5,
      }),
    ])

    render(<ShopProductsPage />)

    expect(screen.getByTestId("low-stock-chip")).toHaveTextContent(
      "2 products at or below threshold",
    )
  })

  it("renders the chip with the singular plural form when only one row is below threshold", () => {
    primeListResponse([
      makeProduct({ id: "sp-low", stock_quantity: 1, low_stock_threshold: 5 }),
      makeProduct({ id: "sp-ok", stock_quantity: 10, low_stock_threshold: 5 }),
    ])

    render(<ShopProductsPage />)

    expect(screen.getByTestId("low-stock-chip")).toHaveTextContent(
      "1 product at or below threshold",
    )
  })

  it("shows the Add product CTA when the user holds shop-products.write", () => {
    primeRBAC({ canWrite: true })
    primeListResponse([])

    render(<ShopProductsPage />)

    expect(screen.getByTestId("add-product-cta")).toBeInTheDocument()
  })

  it("hides the Add product CTA when the user lacks shop-products.write", () => {
    primeRBAC({ canWrite: false })
    primeListResponse([])

    render(<ShopProductsPage />)

    expect(screen.queryByTestId("add-product-cta")).not.toBeInTheDocument()
  })
})
