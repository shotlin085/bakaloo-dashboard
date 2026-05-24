/**
 * Unit tests for vendor 404 enforcement on the order detail drawer
 * (task 12.8 / 12.2).
 *
 * Validates: Requirement 10.10 — a vendor user (one whose
 * `assignedShopIds.length > 0`) opening an order whose `shop_id` is not
 * in their locked shop list must see the 404 empty state rather than the
 * order details. Super-admins (`assignedShopIds = []`) bypass the check.
 *
 * The detail hook (`useOrderDetail`), the mutation hooks, sonner toasts
 * and `next/image` are mocked at the module boundary so these tests
 * exercise the drawer's vendor scoping logic in isolation. The
 * `useShopContextStore` is the real Zustand store — we use
 * `setState` to seed `assignedShopIds` per test.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills (Radix `Sheet` + `Select` rely on these)
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

const useOrderDetailMock = vi.fn()

vi.mock("@/hooks/useOrders", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useOrderDetail: (...args: unknown[]) => useOrderDetailMock(...args),
    useUpdateOrderStatus: stub,
    useDownloadInvoice: stub,
    useRefundOrder: stub,
    useCancelOrder: stub,
    useDownloadPackingSlip: stub,
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer"
import { useShopContextStore } from "@/store/shop-context.store"
import type { OrderDetail } from "@/types/order.types"
import type { OrderStatus, PaymentMethod } from "@/lib/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    order_number: "ORD-1001",
    user_id: "user-1",
    rider_id: null,
    status: "PENDING" as OrderStatus,
    items: [],
    subtotal: 100,
    discount_amount: 0,
    delivery_fee: 0,
    handling_fee: 0,
    late_night_fee: 0,
    tip_amount: 0,
    platform_fee: 0,
    tax_amount: 0,
    total_amount: 100,
    payment_method: "COD" as PaymentMethod,
    payment_status: "PENDING",
    coupon_code: null,
    delivery_address: { city: "Mumbai", pincode: "400001" },
    delivery_notes: null,
    delivery_instructions: null,
    estimated_delivery: null,
    savings_total: 0,
    delivered_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    customer_name: "Aarav",
    customer_phone: "+919999999999",
    customer_email: undefined,
    rider_name: null,
    rider_phone: null,
    proof_photo_url: null,
    cancelled_reason: null,
    timeline: [
      {
        from_status: null,
        to_status: "PENDING",
        changed_by: null,
        note: null,
        changed_at: "2024-01-01T00:00:00Z",
      },
    ],
    payment: null,
    delivery: null,
    shop_id: "s1",
    ...overrides,
  } as OrderDetail
}

function primeOrderDetail(order: OrderDetail | undefined, isLoading = false) {
  useOrderDetailMock.mockReturnValue({
    data: order,
    isLoading,
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

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useOrderDetailMock.mockReset()
})

afterEach(() => {
  setShopContext({ assignedShopIds: [] })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<OrderDetailDrawer /> — vendor 404 enforcement", () => {
  it("renders the 404 page when a vendor opens an order outside their assignedShopIds", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeOrderDetail(makeOrder({ shop_id: "s2" }))

    render(
      <OrderDetailDrawer orderId="order-1" open onClose={() => {}} />,
    )

    // The 404 copy is rendered.
    expect(
      screen.getByText(/404 — Order not found/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not part of your shop/i),
    ).toBeInTheDocument()

    // The order body is suppressed — neither order number nor customer
    // info should be exposed to the vendor.
    expect(screen.queryByText(/ORD-1001/)).toBeNull()
    expect(screen.queryByText("Aarav")).toBeNull()
  })

  it("renders the order normally when a vendor's assignedShopIds includes the order's shop_id", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeOrderDetail(makeOrder({ shop_id: "s1" }))

    render(
      <OrderDetailDrawer orderId="order-1" open onClose={() => {}} />,
    )

    expect(screen.queryByText(/404 — Order not found/i)).toBeNull()
    // Customer block is part of the normal order view.
    expect(screen.getByText("Aarav")).toBeInTheDocument()
  })

  it("renders the order normally for a super admin (empty assignedShopIds) regardless of shop_id", () => {
    setShopContext({ assignedShopIds: [] })
    primeOrderDetail(makeOrder({ shop_id: "s2" }))

    render(
      <OrderDetailDrawer orderId="order-1" open onClose={() => {}} />,
    )

    expect(screen.queryByText(/404 — Order not found/i)).toBeNull()
    expect(screen.getByText("Aarav")).toBeInTheDocument()
  })

  it("does not render the 404 view while the detail is still loading", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeOrderDetail(undefined, /* isLoading */ true)

    render(
      <OrderDetailDrawer orderId="order-1" open onClose={() => {}} />,
    )

    expect(screen.queryByText(/404 — Order not found/i)).toBeNull()
  })

  it("does not render the 404 view when the order has no shop_id (legacy response)", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeOrderDetail(makeOrder({ shop_id: undefined }))

    render(
      <OrderDetailDrawer orderId="order-1" open onClose={() => {}} />,
    )

    expect(screen.queryByText(/404 — Order not found/i)).toBeNull()
    expect(screen.getByText("Aarav")).toBeInTheDocument()
  })
})
