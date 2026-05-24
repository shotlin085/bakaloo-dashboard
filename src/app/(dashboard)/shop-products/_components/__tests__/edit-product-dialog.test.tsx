/**
 * Unit tests for `<EditProductDialog />` (task 8.6).
 *
 * Covers the user-visible contract from the task brief:
 *
 *   1. Pre-fill — the form opens populated with the row's per-shop
 *      values (`price`, `sale_price`, `cost_price`, `low_stock_threshold`,
 *      `max_order_qty`, `is_available`, `is_featured`).
 *   2. Submit happy path — calling submit invokes
 *      `useUpdateShopProduct(activeShopId).mutateAsync({ id, body })`
 *      with the changed body, and the dialog closes on success.
 *      The hook owns the optimistic update + invalidation (design §8).
 *   3. Error keeps dialog open — when `mutateAsync` rejects, the dialog
 *      stays open so the operator can retry. Per design.md §8 the hook
 *      already rolled the cache back, so the dialog only needs to not
 *      close.
 *
 * `useUpdateShopProduct`, `useShopContext`, and `next/image` are mocked
 * at the module boundary so the test focuses on the dialog wiring, not
 * the network IO (which has coverage in `useShopProducts.test.tsx`).
 *
 * Validates: Requirements 7.5, 7.9, 12.5
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

const updateMutateAsync = vi.fn()
const useUpdateShopProductMock = vi.fn((_shopId: string) => ({
  mutateAsync: updateMutateAsync,
  isPending: false,
}))

vi.mock("@/hooks/useShopProducts", () => ({
  useUpdateShopProduct: (shopId: string) => useUpdateShopProductMock(shopId),
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

import { EditProductDialog } from "@/app/(dashboard)/shop-products/_components/edit-product-dialog"
import type { ShopProduct } from "@/types"

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
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

function makeShopProduct(partial: Partial<ShopProduct> = {}): ShopProduct {
  // Spread an explicit base so callers can override nullable slots with
  // `null` without `??` coercing them back to the default value.
  const base: ShopProduct = {
    id: "22222222-2222-4222-8222-222222222222",
    shop_id: "shop-a",
    product_id: "11111111-1111-4111-8111-111111111111",
    price: 99.5,
    sale_price: 79.99,
    cost_price: 60,
    stock_quantity: 12,
    low_stock_threshold: 3,
    max_order_qty: 8,
    is_available: true,
    is_featured: false,
    sold_out_at: null,
    restock_eta: null,
    product: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Atta 1kg",
      sku: "ATTA-1KG",
      image_url: "",
    },
  }
  return { ...base, ...partial }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  updateMutateAsync.mockReset()
  useUpdateShopProductMock.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<EditProductDialog /> — pre-fill", () => {
  it("populates every form input from the row being edited", () => {
    const product = makeShopProduct()
    renderWithClient(
      <EditProductDialog open onOpenChange={() => {}} product={product} />,
    )

    expect(
      (document.getElementById("edit-product-price") as HTMLInputElement).value,
    ).toBe("99.5")
    expect(
      (document.getElementById("edit-product-sale-price") as HTMLInputElement)
        .value,
    ).toBe("79.99")
    expect(
      (document.getElementById("edit-product-cost-price") as HTMLInputElement)
        .value,
    ).toBe("60")
    expect(
      (document.getElementById("edit-product-stock") as HTMLInputElement).value,
    ).toBe("12")
    expect(
      (document.getElementById("edit-product-low-stock") as HTMLInputElement)
        .value,
    ).toBe("3")
    expect(
      (document.getElementById("edit-product-max-qty") as HTMLInputElement)
        .value,
    ).toBe("8")
    // Form root mounted.
    expect(screen.getByTestId("edit-product-form")).toBeInTheDocument()
  })

  it("renders empty values for nullable price slots that are persisted as null", () => {
    const product = makeShopProduct({ sale_price: null, cost_price: null })
    renderWithClient(
      <EditProductDialog open onOpenChange={() => {}} product={product} />,
    )

    expect(
      (document.getElementById("edit-product-sale-price") as HTMLInputElement)
        .value,
    ).toBe("")
    expect(
      (document.getElementById("edit-product-cost-price") as HTMLInputElement)
        .value,
    ).toBe("")
  })
})

describe("<EditProductDialog /> — submit", () => {
  it("calls useUpdateShopProduct(activeShopId).mutateAsync with the row id and patch body, then closes on success", async () => {
    const product = makeShopProduct()
    updateMutateAsync.mockResolvedValueOnce({})

    const onOpenChange = vi.fn()
    renderWithClient(
      <EditProductDialog open onOpenChange={onOpenChange} product={product} />,
    )

    // Edit one numeric field so we can confirm the submit path uses the
    // current form value, not the original row value.
    const priceInput = document.getElementById(
      "edit-product-price",
    ) as HTMLInputElement
    fireEvent.change(priceInput, { target: { value: "120" } })

    await act(async () => {
      fireEvent.click(screen.getByTestId("edit-product-submit"))
    })

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledTimes(1)
    })

    // The hook factory is keyed on the active shopId from context.
    expect(useUpdateShopProductMock).toHaveBeenCalledWith("shop-a")

    const variables = updateMutateAsync.mock.calls[0][0]
    expect(variables.id).toBe(product.id)
    expect(variables.body.price).toBe(120)
    expect(variables.body.sale_price).toBe(79.99)
    expect(variables.body.cost_price).toBe(60)
    expect(variables.body.low_stock_threshold).toBe(3)
    expect(variables.body.max_order_qty).toBe(8)
    expect(variables.body.is_available).toBe(true)
    expect(variables.body.is_featured).toBe(false)
    // `stock_quantity` flows through a different endpoint and must not
    // appear on the update body.
    expect(variables.body).not.toHaveProperty("stock_quantity")

    // Dialog closed on success.
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("keeps the dialog open when the mutation rejects", async () => {
    const product = makeShopProduct()
    updateMutateAsync.mockRejectedValueOnce(new Error("network"))

    const onOpenChange = vi.fn()
    renderWithClient(
      <EditProductDialog open onOpenChange={onOpenChange} product={product} />,
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId("edit-product-submit"))
    })

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledTimes(1)
    })

    // Dialog stayed open — onOpenChange(false) was never called.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    // Form is still mounted.
    expect(screen.getByTestId("edit-product-form")).toBeInTheDocument()
  })
})
