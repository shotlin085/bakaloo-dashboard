/**
 * Unit tests for `<AddProductDialog />` (task 8.5).
 *
 * Covers the user-visible contract from the task brief:
 *
 *   1. Step 1 — typing into the search input drives a debounced query
 *      against `searchCatalog(q)`; results render in the dropdown
 *      (Req 7.4).
 *   2. Step transition — picking a catalog row advances to step 2 with
 *      the catalog defaults pre-seeded (Req 7.4).
 *   3. Submit happy path — calling submit on step 2 invokes
 *      `useAddShopProduct(activeShopId).mutateAsync(...)` with the
 *      catalog-derived payload, and the dialog closes on success
 *      (Req 7.4, 7.5).
 *   4. Error keeps dialog open — when `mutateAsync` rejects, the dialog
 *      stays open so the operator can retry (Req 7.4).
 *
 * `useAddShopProduct`, `useSearchProductCatalog`, `useShopContext`, and
 * Next.js' `<Image />` component are mocked at the module boundary so the
 * test focuses on the dialog wiring, not the network IO (which has
 * coverage in `useShopProducts.test.tsx`).
 *
 * Validates: Requirements 7.4, 7.5, 12.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills
// ─────────────────────────────────────────────────────────────────────────────

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub })
    .ResizeObserver = ResizeObserverStub
}

if (
  typeof window !== "undefined" &&
  !(Element.prototype as unknown as { hasPointerCapture?: () => boolean })
    .hasPointerCapture
) {
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    value: () => false,
    configurable: true,
  })
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    value: () => undefined,
    configurable: true,
  })
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: () => undefined,
    configurable: true,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the component import)
// ─────────────────────────────────────────────────────────────────────────────

const addMutateAsync = vi.fn()
const useAddShopProductMock = vi.fn(() => ({
  mutateAsync: addMutateAsync,
  isPending: false,
}))

interface CatalogQueryShape {
  data: unknown
  isLoading: boolean
  isError: boolean
}
const catalogQueryState: CatalogQueryShape = {
  data: undefined,
  isLoading: false,
  isError: false,
}
const useSearchProductCatalogMock = vi.fn((_q: string) => catalogQueryState)

vi.mock("@/hooks/useShopProducts", () => ({
  useAddShopProduct: (shopId: string) => useAddShopProductMock(shopId),
  useSearchProductCatalog: (q: string) => useSearchProductCatalogMock(q),
}))

const useShopContextMock = vi.fn(() => ({
  activeShopId: "shop-a",
  mode: "SINGLE_SHOP" as const,
  shopRole: null,
  permissions: [] as string[],
  shopMeta: null,
  isReady: true,
}))
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => false,
}))

// `next/image` issues warnings about `priority`/`fill` in jsdom; stub it
// with a plain `<img>` to keep the test output clean.
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string
    alt: string
    fill?: boolean
    sizes?: string
    className?: string
  }) => {
    void rest
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} />
    )
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { AddProductDialog } from "@/app/(dashboard)/shop-products/_components/add-product-dialog"
import type { Product } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  )
}

function makeProduct(partial: Partial<Product> = {}): Product {
  return {
    id: partial.id ?? "11111111-1111-4111-8111-1111111111aa",
    name: partial.name ?? "Demo Product",
    slug: partial.slug ?? "demo-product",
    description: partial.description ?? null,
    short_description: partial.short_description ?? null,
    category_id: partial.category_id ?? "cat-1",
    price: partial.price ?? 100,
    sale_price: partial.sale_price ?? null,
    cost_price: partial.cost_price ?? null,
    stock_quantity: partial.stock_quantity ?? 0,
    low_stock_threshold: partial.low_stock_threshold ?? 5,
    sku: partial.sku ?? "SKU-001",
    unit: partial.unit ?? "1 pc",
    max_order_qty: partial.max_order_qty ?? 10,
    thumbnail_url: partial.thumbnail_url ?? null,
    is_active: partial.is_active ?? true,
    is_featured: partial.is_featured ?? false,
    created_at: partial.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2024-01-01T00:00:00Z",
  } as Product
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  addMutateAsync.mockReset()
  useAddShopProductMock.mockClear()
  useSearchProductCatalogMock.mockClear()
  catalogQueryState.data = undefined
  catalogQueryState.isLoading = false
  catalogQueryState.isError = false
})

afterEach(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<AddProductDialog /> — step 1: catalog typeahead", () => {
  it("renders the search input and an empty-prompt when the query is blank", () => {
    renderWithClient(<AddProductDialog open onOpenChange={() => {}} />)

    expect(
      screen.getByTestId("add-product-search-input"),
    ).toBeInTheDocument()
    // No catalog query is fired for an empty input — the listbox shows
    // the placeholder copy rather than results.
    expect(screen.getByTestId("add-product-results")).toBeInTheDocument()
  })

  it("shows catalog results from the search hook", async () => {
    catalogQueryState.data = [makeProduct({ name: "Apple" })]
    renderWithClient(<AddProductDialog open onOpenChange={() => {}} />)

    const search = screen.getByTestId("add-product-search-input")
    fireEvent.change(search, { target: { value: "app" } })

    // The debounced value lands ~300ms later; wait for the option.
    expect(
      await screen.findByTestId(
        "add-product-option-11111111-1111-4111-8111-1111111111aa",
        undefined,
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })
})

describe("<AddProductDialog /> — step 2: form pre-seeded from catalog", () => {
  it("advances to the form and pre-fills price/max_order_qty from the picked product", async () => {
    const product = makeProduct({
      name: "Atta 1kg",
      price: 49.5,
      max_order_qty: 8,
    })
    catalogQueryState.data = [product]

    renderWithClient(<AddProductDialog open onOpenChange={() => {}} />)

    fireEvent.change(screen.getByTestId("add-product-search-input"), {
      target: { value: "atta" },
    })

    const option = await screen.findByTestId(
      `add-product-option-${product.id}`,
      undefined,
      { timeout: 5000 },
    )

    await act(async () => {
      fireEvent.click(option)
    })

    // Form should now be on screen with seeded values.
    expect(
      await screen.findByTestId("add-product-form"),
    ).toBeInTheDocument()
    expect(
      (document.getElementById("add-product-price") as HTMLInputElement)
        .value,
    ).toBe("49.5")
    expect(
      (document.getElementById("add-product-max-qty") as HTMLInputElement)
        .value,
    ).toBe("8")
  })
})

describe("<AddProductDialog /> — submit", () => {
  it("calls useAddShopProduct(activeShopId).mutateAsync with product_id + form values and closes on success", async () => {
    const product = makeProduct({
      name: "Atta 1kg",
      price: 49.5,
      max_order_qty: 8,
    })
    catalogQueryState.data = [product]
    addMutateAsync.mockResolvedValueOnce({})

    const onOpenChange = vi.fn()
    renderWithClient(
      <AddProductDialog open onOpenChange={onOpenChange} />,
    )

    // Drive step 1 → step 2.
    fireEvent.change(screen.getByTestId("add-product-search-input"), {
      target: { value: "atta" },
    })
    const option = await screen.findByTestId(
      `add-product-option-${product.id}`,
      undefined,
      { timeout: 5000 },
    )
    await act(async () => {
      fireEvent.click(option)
    })

    // Type a stock_quantity (the schema requires it; not pre-seeded).
    const stockInput = document.getElementById(
      "add-product-stock",
    ) as HTMLInputElement
    fireEvent.change(stockInput, { target: { value: "12" } })

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-product-submit"))
    })

    await waitFor(() => {
      expect(addMutateAsync).toHaveBeenCalledTimes(1)
    })

    // The hook factory is called with the active shopId from context.
    expect(useAddShopProductMock).toHaveBeenCalledWith("shop-a")

    const payload = addMutateAsync.mock.calls[0][0]
    expect(payload.product_id).toBe(product.id)
    expect(payload.price).toBe(49.5)
    expect(payload.stock_quantity).toBe(12)
    expect(payload.max_order_qty).toBe(8)
    expect(payload.is_available).toBe(true)
    expect(payload.is_featured).toBe(false)

    // Dialog closed on success.
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("keeps the dialog open when the mutation rejects", async () => {
    const product = makeProduct()
    catalogQueryState.data = [product]
    addMutateAsync.mockRejectedValueOnce(new Error("network"))

    const onOpenChange = vi.fn()
    renderWithClient(
      <AddProductDialog open onOpenChange={onOpenChange} />,
    )

    fireEvent.change(screen.getByTestId("add-product-search-input"), {
      target: { value: "demo" },
    })
    const option = await screen.findByTestId(
      `add-product-option-${product.id}`,
      undefined,
      { timeout: 5000 },
    )
    await act(async () => {
      fireEvent.click(option)
    })

    fireEvent.change(
      document.getElementById("add-product-stock") as HTMLInputElement,
      { target: { value: "5" } },
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-product-submit"))
    })

    await waitFor(() => {
      expect(addMutateAsync).toHaveBeenCalledTimes(1)
    })

    // Dialog stayed open — onOpenChange(false) was never called.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    // Form is still mounted.
    expect(screen.getByTestId("add-product-form")).toBeInTheDocument()
  })
})
