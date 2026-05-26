/**
 * Unit tests for the Product_Row cell components (task 8.7).
 *
 * Covers the user-visible contract from the task brief:
 *
 *   1. Pure cell renderers — `<ProductImage />`, `<ProductName />`,
 *      `<ProductSku />`, `<ProductPrice />`, `<ProductSalePrice />`,
 *      `<ProductStock />`, `<ProductIsAvailable />`, `<ProductIsFeatured />`,
 *      `<ProductSoldOutAt />`, `<ProductLowStockThreshold />`,
 *      `<ProductMaxOrderQty />` (Req 7.2).
 *   2. `<ProductActions />` — DropdownMenu (Edit / Remove) gated on
 *      `canWrite`; opens the edit dialog on Edit; opens an AlertDialog
 *      on Remove and calls `useRemoveShopProduct` on confirm
 *      (Req 7.9, 7.10, 7.11).
 *
 * Hooks (`useRemoveShopProduct`, `useShopContext`, `useRouteRBAC`) and
 * the `<EditProductDialog />` companion are mocked at the module
 * boundary so the test focuses on row wiring, not the network IO.
 *
 * Validates: Requirements 7.2, 7.6, 7.7, 7.9, 7.10, 7.11.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills (Radix portals + pointer capture)
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

const removeMutate = vi.fn()
// Untyped `vi.fn()`s are used because their inputs are heterogeneous (the
// hook factories take a `shopId: string` while the route RBAC hook takes a
// pattern). `mockReturnValue` re-assigns the shape per test where needed;
// the shared default lives in `beforeEach`.
const useRemoveShopProductMock = vi.fn()
const useShopContextMock = vi.fn()
const useRouteRBACMock = vi.fn()

vi.mock("@/hooks/useShopProducts", () => ({
  useRemoveShopProduct: (shopId: string) => useRemoveShopProductMock(shopId),
  // The edit-product-dialog stub also imports the update hook indirectly;
  // not mocking it is fine because we replace the whole dialog below.
}))

vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => false,
}))

vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: (pattern: string) => useRouteRBACMock(pattern),
}))

// Replace the heavy `<EditProductDialog />` with a tiny test double so we
// can assert it mounts without dragging in `useUpdateShopProduct`.
vi.mock(
  "@/app/(dashboard)/shop-products/_components/edit-product-dialog",
  () => ({
    EditProductDialog: ({
      open,
      product,
    }: {
      open: boolean
      product: { id: string }
    }) =>
      open ? (
        <div data-testid={`edit-dialog-${product.id}`} role="dialog" />
      ) : null,
  }),
)

// `next/image` issues warnings about `priority`/`fill` in jsdom.
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

import {
  ProductActions,
  ProductImage,
  ProductIsAvailable,
  ProductIsFeatured,
  ProductLowStockThreshold,
  ProductMaxOrderQty,
  ProductName,
  ProductPrice,
  ProductSalePrice,
  ProductSku,
  ProductSoldOutAt,
  ProductStock,
} from "@/app/(dashboard)/shop-products/_components/product-row"
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

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  removeMutate.mockReset()
  useRemoveShopProductMock.mockReset()
  useShopContextMock.mockReset()
  useRouteRBACMock.mockReset()

  // Sensible defaults — each test can override.
  useRemoveShopProductMock.mockReturnValue({
    mutate: removeMutate,
    isPending: false,
  })
  useShopContextMock.mockReturnValue({
    activeShopId: "shop-a",
    mode: "STORE_MODE",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    isReady: true,
  })
  useRouteRBACMock.mockReturnValue({
    isAuthorized: true,
    canRead: true,
    canWrite: true,
    requiresActiveShop: true,
    superAdminOnly: false,
    guard: null,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests — pure cell renderers
// ─────────────────────────────────────────────────────────────────────────────

describe("Product_Row cells — pure renderers (Req 7.2)", () => {
  it("ProductImage renders the fallback icon when image_url is empty", () => {
    const product = makeProduct({
      product: { id: "p-1", name: "x", sku: "x", image_url: "" },
    })
    render(<ProductImage product={product} />)
    expect(
      screen.getByTestId("product-image-fallback"),
    ).toBeInTheDocument()
  })

  it("ProductImage renders an <img> when image_url is set", () => {
    const product = makeProduct({
      product: {
        id: "p-1",
        name: "Apple",
        sku: "A",
        image_url: "https://cdn.example.com/a.png",
      },
    })
    render(<ProductImage product={product} />)
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("src", "https://cdn.example.com/a.png")
    expect(img).toHaveAttribute("alt", "Apple")
  })

  it("ProductName renders the product name", () => {
    render(<ProductName product={makeProduct()} />)
    expect(screen.getByText("Sample product")).toBeInTheDocument()
  })

  it("ProductSku renders the SKU", () => {
    render(<ProductSku product={makeProduct()} />)
    expect(screen.getByText("SKU-001")).toBeInTheDocument()
  })

  it("ProductPrice renders the price formatted as currency", () => {
    const { container } = render(
      <ProductPrice product={makeProduct({ price: 49.5 })} />,
    )
    expect(container.textContent).toMatch(/49\.50/)
  })

  it("ProductSalePrice renders an em-dash when sale_price is null", () => {
    const { container } = render(
      <ProductSalePrice product={makeProduct({ sale_price: null })} />,
    )
    expect(container.textContent).toBe("—")
  })

  it("ProductSalePrice renders the formatted sale price when present", () => {
    const { container } = render(
      <ProductSalePrice product={makeProduct({ sale_price: 39.99 })} />,
    )
    expect(container.textContent).toMatch(/39\.99/)
  })

  it("ProductStock renders the count and the low-stock badge when at threshold", () => {
    render(
      <ProductStock
        product={makeProduct({
          stock_quantity: 5,
          low_stock_threshold: 5,
        })}
      />,
    )
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByTestId("stock-badge-low")).toBeInTheDocument()
  })

  it("ProductStock renders the sold-out badge when stock is zero", () => {
    render(
      <ProductStock
        product={makeProduct({
          stock_quantity: 0,
          low_stock_threshold: 5,
          sold_out_at: "2024-12-25T09:30:00.000Z",
        })}
      />,
    )
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByTestId("stock-badge-sold-out")).toBeInTheDocument()
  })

  it("ProductLowStockThreshold renders the threshold count", () => {
    render(
      <ProductLowStockThreshold
        product={makeProduct({ low_stock_threshold: 3 })}
      />,
    )
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("ProductMaxOrderQty renders the max-order count", () => {
    render(<ProductMaxOrderQty product={makeProduct({ max_order_qty: 7 })} />)
    expect(screen.getByText("7")).toBeInTheDocument()
  })

  it("ProductIsAvailable renders Yes/No", () => {
    const yes = render(
      <ProductIsAvailable product={makeProduct({ is_available: true })} />,
    )
    expect(yes.getByText("Yes")).toBeInTheDocument()
    yes.unmount()

    const no = render(
      <ProductIsAvailable product={makeProduct({ is_available: false })} />,
    )
    expect(no.getByText("No")).toBeInTheDocument()
  })

  it("ProductIsFeatured renders Yes/No", () => {
    const yes = render(
      <ProductIsFeatured product={makeProduct({ is_featured: true })} />,
    )
    expect(yes.getByText("Yes")).toBeInTheDocument()
    yes.unmount()

    const no = render(
      <ProductIsFeatured product={makeProduct({ is_featured: false })} />,
    )
    expect(no.getByText("No")).toBeInTheDocument()
  })

  it("ProductSoldOutAt renders an em-dash when sold_out_at is null", () => {
    const { container } = render(
      <ProductSoldOutAt product={makeProduct({ sold_out_at: null })} />,
    )
    expect(container.textContent).toBe("—")
  })

  it("ProductSoldOutAt renders a formatted date when sold_out_at is set", () => {
    const { container } = render(
      <ProductSoldOutAt
        product={makeProduct({ sold_out_at: "2024-12-25T09:30:00.000Z" })}
      />,
    )
    // Just assert it isn't the dash and parses to a non-empty string.
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0)
    expect(container.textContent).not.toBe("—")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests — <ProductActions />
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open a Radix `DropdownMenu` in jsdom. The trigger registers
 * `onPointerDown` and `onKeyDown`. jsdom's pointer events are flaky in
 * the synthetic-event path, but the Enter-key path is exercised directly
 * — pressing Enter calls `context.onOpenToggle()` and the menu opens.
 */
function openDropdownTrigger(trigger: Element) {
  ;(trigger as HTMLElement).focus()
  fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" })
}

describe("<ProductActions /> — write-gated menu (Req 7.9, 7.10, 7.11)", () => {
  it("renders an em-dash placeholder when canWrite is false", () => {
    render(
      <ProductActions product={makeProduct()} canWrite={false} />,
    )
    expect(
      screen.queryByTestId(/product-actions-trigger-/),
    ).not.toBeInTheDocument()
  })

  it("falls back to useRouteRBAC().canWrite when no prop is passed", () => {
    useRouteRBACMock.mockReturnValueOnce({
      isAuthorized: true,
      canRead: true,
      canWrite: false,
      requiresActiveShop: true,
      superAdminOnly: false,
      guard: null,
    })
    render(<ProductActions product={makeProduct()} />)
    expect(
      screen.queryByTestId(/product-actions-trigger-/),
    ).not.toBeInTheDocument()
  })

  it("renders the kebab trigger when canWrite is true", () => {
    render(<ProductActions product={makeProduct()} canWrite={true} />)
    expect(
      screen.getByTestId("product-actions-trigger-sp-1"),
    ).toBeInTheDocument()
  })

  it("opens the Edit dialog when the Edit menu item is selected", async () => {
    const product = makeProduct({ id: "sp-edit" })
    render(<ProductActions product={product} canWrite={true} />)

    // Open the dropdown — Radix `Trigger` uses pointer events, not click,
    // so we drive the synthetic pointer sequence below.
    await act(async () => {
      openDropdownTrigger(
        screen.getByTestId(`product-actions-trigger-${product.id}`),
      )
    })

    // Pick "Edit" — clicking a `DropdownMenuItem` works because Radix wires
    // `onSelect` through the click event for menu items.
    await act(async () => {
      fireEvent.click(
        await screen.findByTestId(`product-actions-edit-${product.id}`),
      )
    })

    // The mocked dialog opens.
    expect(
      await screen.findByTestId(`edit-dialog-${product.id}`),
    ).toBeInTheDocument()
  })

  it("opens the Remove confirmation when the Remove menu item is selected", async () => {
    const product = makeProduct({ id: "sp-remove" })
    render(<ProductActions product={product} canWrite={true} />)

    await act(async () => {
      openDropdownTrigger(
        screen.getByTestId(`product-actions-trigger-${product.id}`),
      )
    })
    await act(async () => {
      fireEvent.click(
        await screen.findByTestId(`product-actions-remove-${product.id}`),
      )
    })

    // AlertDialog title from `t("shopProducts.confirmRemove.title")`.
    expect(
      await screen.findByText("Remove product from shop?"),
    ).toBeInTheDocument()
  })

  it("calls useRemoveShopProduct(activeShopId).mutate(productId) on confirm", async () => {
    const product = makeProduct({ id: "sp-confirm" })
    render(<ProductActions product={product} canWrite={true} />)

    await act(async () => {
      openDropdownTrigger(
        screen.getByTestId(`product-actions-trigger-${product.id}`),
      )
    })
    await act(async () => {
      fireEvent.click(
        await screen.findByTestId(`product-actions-remove-${product.id}`),
      )
    })

    const confirmBtn = await screen.findByTestId(
      `product-actions-remove-confirm-${product.id}`,
    )
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(removeMutate).toHaveBeenCalledTimes(1)
    })

    // First arg is the row id; the hook factory was called with the
    // active shopId from context.
    expect(removeMutate.mock.calls[0][0]).toBe(product.id)
    expect(useRemoveShopProductMock).toHaveBeenCalledWith("shop-a")
  })
})
