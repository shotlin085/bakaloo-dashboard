/**
 * Unit tests for vendor 404 enforcement on the reviews page
 * (task 12.8 / 12.4).
 *
 * Validates: Requirement 10.10 — a vendor user (one whose
 * `assignedShopIds.length > 0`) selecting a product whose review's
 * `shop_id` is not in their locked shop list must see the 404 empty
 * state rather than the review records. Super-admins
 * (`assignedShopIds = []`) bypass the check.
 *
 * The data hooks (`useProductReviews`, `useProducts`), mutation hooks,
 * and sonner toasts are mocked at the module boundary so these tests
 * exercise the page's vendor scoping logic in isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills (Radix `Tabs` and other primitives may rely on these)
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
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

const useProductReviewsMock = vi.fn()
const useProductsMock = vi.fn()

vi.mock("@/hooks/useReviews", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useProductReviews: (...args: unknown[]) =>
      useProductReviewsMock(...args),
    useReplyReview: stub,
    useModerateReview: stub,
    useDeleteReview: stub,
  }
})

vi.mock("@/hooks/useProducts", () => ({
  useProducts: (...args: unknown[]) => useProductsMock(...args),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ReviewsPage from "@/app/(dashboard)/reviews/page"
import { useShopContextStore } from "@/store/shop-context.store"
import type { Review } from "@/types/review.types"
import type { Product } from "@/types/product.types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    name: "Sample product",
    slug: "sample-product",
    description: null,
    category_id: "cat-1",
    price: 100,
    sale_price: null,
    stock_quantity: 10,
    low_stock_threshold: 5,
    unit: "1 pc",
    thumbnail_url: null,
    is_active: true,
    is_featured: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as Product
}

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "rev-1",
    rating: 5,
    comment: "Great product",
    created_at: "2024-01-01T00:00:00Z",
    user_name: "Alice",
    status: "approved",
    shop_id: "s1",
    ...overrides,
  } as Review
}

function primeProducts(products: Product[]) {
  useProductsMock.mockReturnValue({
    data: { products },
    isLoading: false,
  })
}

function primeReviews(reviews: Review[], avg = 5) {
  useProductReviewsMock.mockReturnValue({
    data: {
      reviews,
      averageRating: avg,
      pagination: { page: 1, limit: 10, total: reviews.length, totalPages: 1 },
    },
    isLoading: false,
  })
}

function setShopContext(patch: { assignedShopIds?: string[] }) {
  act(() => {
    useShopContextStore.setState({
      activeShopId: null,
      mode: "UNSELECTED",
      shopRole: null,
      permissions: [],
      shopMeta: null,
      isHydrated: true,
      assignedShopIds: patch.assignedShopIds ?? [],
    })
  })
}

/** Click the product chip so the page enters its "product selected" state. */
function selectProduct(name: string) {
  fireEvent.click(screen.getByRole("button", { name }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useProductReviewsMock.mockReset()
  useProductsMock.mockReset()
})

afterEach(() => {
  setShopContext({ assignedShopIds: [] })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ReviewsPage — vendor 404 enforcement", () => {
  it("renders the 404 view when a vendor selects a product whose review.shop_id is outside assignedShopIds", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeProducts([makeProduct({ id: "p-1", name: "Out-of-shop product" })])
    primeReviews([makeReview({ shop_id: "s2" })])

    render(<ReviewsPage />)

    selectProduct("Out-of-shop product")

    expect(
      screen.getByText(/404 — Reviews not found/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not part of your shop/i),
    ).toBeInTheDocument()

    // The review body must not leak.
    expect(screen.queryByText("Great product")).toBeNull()
  })

  it("renders the reviews list when a vendor's assignedShopIds includes the review.shop_id", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeProducts([makeProduct({ id: "p-1", name: "In-shop product" })])
    primeReviews([makeReview({ shop_id: "s1" })])

    render(<ReviewsPage />)

    selectProduct("In-shop product")

    expect(screen.queryByText(/404 — Reviews not found/i)).toBeNull()
    expect(screen.getByText("Great product")).toBeInTheDocument()
  })

  it("renders the reviews list for a super admin (empty assignedShopIds) regardless of review.shop_id", () => {
    setShopContext({ assignedShopIds: [] })
    primeProducts([makeProduct({ id: "p-1", name: "Cross-shop product" })])
    primeReviews([makeReview({ shop_id: "s2" })])

    render(<ReviewsPage />)

    selectProduct("Cross-shop product")

    expect(screen.queryByText(/404 — Reviews not found/i)).toBeNull()
    expect(screen.getByText("Great product")).toBeInTheDocument()
  })

  it("does not render the 404 view when reviews lack shop_id (legacy response)", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeProducts([makeProduct({ id: "p-1", name: "Legacy product" })])
    primeReviews([makeReview({ shop_id: undefined })])

    render(<ReviewsPage />)

    selectProduct("Legacy product")

    expect(screen.queryByText(/404 — Reviews not found/i)).toBeNull()
    expect(screen.getByText("Great product")).toBeInTheDocument()
  })

  it("does not render the 404 view before any product is selected", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeProducts([makeProduct({ id: "p-1", name: "Out-of-shop product" })])
    primeReviews([])

    render(<ReviewsPage />)

    // No product selected yet — the page shows the "Select a product"
    // empty state, not the vendor 404.
    expect(screen.queryByText(/404 — Reviews not found/i)).toBeNull()
    expect(
      screen.getByRole("heading", { name: /Select a product/i }),
    ).toBeInTheDocument()
  })
})
