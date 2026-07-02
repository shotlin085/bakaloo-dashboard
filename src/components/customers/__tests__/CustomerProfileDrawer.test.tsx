/**
 * Unit tests for vendor 404 enforcement on the customer profile drawer
 * (task 12.8 / 12.3).
 *
 * Validates: Requirement 10.10 — a vendor user (one whose
 * `assignedShopIds.length > 0`) opening a customer whose
 * `shop_allocations` does not overlap with their locked shop list must
 * see the 404 empty state rather than the customer record. Super-admins
 * (`assignedShopIds = []`) bypass the check.
 *
 * The detail/orders/mutation hooks and sonner toasts are mocked at the
 * module boundary so these tests exercise the drawer's vendor scoping
 * logic in isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills (Radix `Sheet` + `Dialog` rely on these)
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

const useCustomerDetailMock = vi.fn()
const useCustomerOrdersMock = vi.fn()
const useCustomerAddressesMock = vi.fn()

vi.mock("@/hooks/useCustomers", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useCustomerDetail: (...args: unknown[]) => useCustomerDetailMock(...args),
    useCustomerOrders: (...args: unknown[]) => useCustomerOrdersMock(...args),
    useCustomerAddresses: (...args: unknown[]) => useCustomerAddressesMock(...args),
    useToggleBlockCustomer: stub,
    useCreditWallet: stub,
    useNotifyCustomer: stub,
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { CustomerProfileDrawer } from "@/components/customers/CustomerProfileDrawer"
import { useShopContextStore } from "@/store/shop-context.store"
import type { CustomerDetail } from "@/types/customer.types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeCustomer(overrides: Partial<CustomerDetail> = {}): CustomerDetail {
  return {
    id: "cust-1",
    name: "Riya Sharma",
    phone: "+919999999999",
    email: null,
    is_blocked: false,
    block_reason: null,
    order_count: 3,
    total_spent: 1500,
    wallet_balance: 0,
    loyalty_points: 0,
    last_order_at: null,
    created_at: "2024-01-01T00:00:00Z",
    recent_orders: [],
    avg_rating_given: null,
    app_version: null,
    platform: null,
    membership_tier: null,
    shop_allocations: ["s1"],
    ...overrides,
  } as CustomerDetail
}

function primeCustomerDetail(
  customer: CustomerDetail | undefined,
  isLoading = false,
) {
  useCustomerDetailMock.mockReturnValue({
    data: customer,
    isLoading,
  })
  useCustomerOrdersMock.mockReturnValue({
    data: { orders: [] },
    isLoading: false,
  })
  useCustomerAddressesMock.mockReturnValue({
    data: [],
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

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useCustomerDetailMock.mockReset()
  useCustomerOrdersMock.mockReset()
  useCustomerAddressesMock.mockReset()
})

afterEach(() => {
  setShopContext({ assignedShopIds: [] })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<CustomerProfileDrawer /> — vendor 404 enforcement", () => {
  it("renders the 404 page when a vendor opens a customer with no overlapping shop_allocations", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeCustomerDetail(makeCustomer({ shop_allocations: ["s2"] }))

    render(
      <CustomerProfileDrawer
        customerId="cust-1"
        open
        onClose={() => {}}
      />,
    )

    expect(
      screen.getByText(/404 — Customer not found/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not part of your shop/i),
    ).toBeInTheDocument()

    // The customer record itself must not leak.
    expect(screen.queryByText("Riya Sharma")).toBeNull()
  })

  it("renders the customer normally when shop_allocations overlaps assignedShopIds", () => {
    setShopContext({ assignedShopIds: ["s1", "s2"] })
    primeCustomerDetail(makeCustomer({ shop_allocations: ["s2", "s3"] }))

    render(
      <CustomerProfileDrawer
        customerId="cust-1"
        open
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText(/404 — Customer not found/i)).toBeNull()
    expect(screen.getByText("Riya Sharma")).toBeInTheDocument()
  })

  it("renders the customer normally for a super admin (empty assignedShopIds)", () => {
    setShopContext({ assignedShopIds: [] })
    primeCustomerDetail(makeCustomer({ shop_allocations: ["s9"] }))

    render(
      <CustomerProfileDrawer
        customerId="cust-1"
        open
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText(/404 — Customer not found/i)).toBeNull()
    expect(screen.getByText("Riya Sharma")).toBeInTheDocument()
  })

  it("does not render the 404 view while the detail is loading", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeCustomerDetail(undefined, /* isLoading */ true)

    render(
      <CustomerProfileDrawer
        customerId="cust-1"
        open
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText(/404 — Customer not found/i)).toBeNull()
  })

  it("does not render the 404 view when shop_allocations is undefined (legacy response)", () => {
    setShopContext({ assignedShopIds: ["s1"] })
    primeCustomerDetail(makeCustomer({ shop_allocations: undefined }))

    render(
      <CustomerProfileDrawer
        customerId="cust-1"
        open
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText(/404 — Customer not found/i)).toBeNull()
    expect(screen.getByText("Riya Sharma")).toBeInTheDocument()
  })
})
