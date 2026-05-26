/**
 * Unit tests for the Shop_Financials page (task 9.3).
 *
 * Covers the page-level behaviors owned by this task:
 *   - Empty-shop short-circuit (Req 8.1) — when `mode !== "STORE_MODE"`
 *     the page renders `<EmptyShopState />` and never reads list data.
 *   - KPI strip aggregation (Req 8.4) — the eight tiles sum the visible
 *     rows and `avg_order_value` is gross / total_orders.
 *   - Payout-status chips (Req 8.7) — counts of PENDING / PROCESSING /
 *     PAID / HELD across visible rows.
 *   - Period toggle defaults to Daily (Req 8.2).
 *   - Read-only — no create/edit/delete affordances rendered (Req 8.9).
 *   - Error state with Retry button (Req 8.10).
 *
 * Validates: Requirements 8.1, 8.2, 8.4, 8.7, 8.9, 8.10
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

const useShopContextMock = vi.fn()
const useIsSuperAdminMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => useIsSuperAdminMock(),
}))

const useShopFinancialsMock = vi.fn()
vi.mock("@/hooks/useShopFinancials", () => ({
  useShopFinancials: (...args: unknown[]) => useShopFinancialsMock(...args),
}))

// `next/dynamic` returns a stub component — Recharts has no useful behavior
// in jsdom (no layout). The stub presence is asserted via data-testid.
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => <div data-testid="financials-chart" />
    return Stub
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ShopFinancialsPage from "@/app/(dashboard)/shop-financials/page"
import type { ShopFinancialPeriod } from "@/types/shop-financial.types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makePeriod(
  overrides: Partial<ShopFinancialPeriod> = {},
): ShopFinancialPeriod {
  return {
    id: overrides.id ?? "fp-1",
    shop_id: "shop-a",
    period_type: "DAILY",
    period_start: "2025-01-01",
    period_end: "2025-01-01",
    gross_revenue: 1000,
    net_revenue: 800,
    total_orders: 10,
    avg_order_value: 100,
    platform_commission: 100,
    delivery_costs: 50,
    refund_amount: 0,
    payout_amount: 800,
    payout_status: "PAID",
    payout_ref: null,
    paid_at: null,
    ...overrides,
  }
}

function primeSingleShopMode() {
  useShopContextMock.mockReturnValue({
    activeShopId: "shop-a",
    mode: "STORE_MODE",
    shopRole: "SHOP_ADMIN",
    permissions: ["shop-financials.read"],
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

interface ListMock {
  items?: ShopFinancialPeriod[]
  isLoading?: boolean
  isError?: boolean
  error?: Error
  refetch?: () => void
}

function primeListResponse(opts: ListMock = {}) {
  const items = opts.items ?? []
  useShopFinancialsMock.mockReturnValue({
    data: opts.isError
      ? undefined
      : {
          items,
          pagination: {
            page: 1,
            limit: 20,
            total: items.length,
            totalPages: 1,
          },
        },
    isLoading: opts.isLoading ?? false,
    isFetching: false,
    isError: opts.isError ?? false,
    error: opts.error ?? null,
    refetch: opts.refetch ?? vi.fn(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShopContextMock.mockReset()
  useIsSuperAdminMock.mockReset()
  useShopFinancialsMock.mockReset()

  primeSingleShopMode()
  primeListResponse()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Shop_Financials page — empty-shop short-circuit (Req 8.1)", () => {
  it("renders the EmptyShopState in ALL_SHOPS mode and does not mount the period toggle", () => {
    primeAllShopsMode()

    render(<ShopFinancialsPage />)

    expect(screen.getByText("Select a shop")).toBeInTheDocument()
    expect(screen.queryByTestId("period-daily")).not.toBeInTheDocument()
    expect(screen.queryByTestId("kpi-strip")).not.toBeInTheDocument()
    expect(screen.queryByTestId("payout-chips")).not.toBeInTheDocument()
  })

  it("shows the super-admin hint when the user is a super admin", () => {
    primeAllShopsMode()
    render(<ShopFinancialsPage />)
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

    render(<ShopFinancialsPage />)

    expect(
      screen.getByRole("link", { name: /choose a shop/i }),
    ).toBeInTheDocument()
  })
})

describe("Shop_Financials page — period toggle (Req 8.2)", () => {
  it("defaults to Daily on first render", () => {
    primeListResponse({ items: [] })

    render(<ShopFinancialsPage />)

    expect(screen.getByTestId("period-daily")).toHaveAttribute(
      "data-state",
      "active",
    )
    expect(screen.getByTestId("period-weekly")).toHaveAttribute(
      "data-state",
      "inactive",
    )
    expect(screen.getByTestId("period-monthly")).toHaveAttribute(
      "data-state",
      "inactive",
    )
  })
})

describe("Shop_Financials page — KPI strip aggregation (Req 8.4, 8.8)", () => {
  it("sums monetary fields across the visible rows and computes the weighted avg_order_value", () => {
    primeListResponse({
      items: [
        makePeriod({
          id: "p1",
          gross_revenue: 1000,
          net_revenue: 800,
          total_orders: 10,
          platform_commission: 100,
          delivery_costs: 50,
          refund_amount: 25,
          payout_amount: 750,
          payout_status: "PAID",
        }),
        makePeriod({
          id: "p2",
          gross_revenue: 500,
          net_revenue: 400,
          total_orders: 5,
          platform_commission: 50,
          delivery_costs: 25,
          refund_amount: 0,
          payout_amount: 400,
          payout_status: "PENDING",
        }),
      ],
    })

    render(<ShopFinancialsPage />)

    const strip = screen.getByTestId("kpi-strip")
    // Gross 1500, Net 1200, Orders 15, AOV 100 = 1500/15, Commission 150,
    // Delivery 75, Refund 25, Payout 1150.
    expect(strip).toHaveTextContent("₹1,500.00")
    expect(strip).toHaveTextContent("₹1,200.00")
    expect(strip).toHaveTextContent("15")
    expect(strip).toHaveTextContent("₹100.00")
    expect(strip).toHaveTextContent("₹150.00")
    expect(strip).toHaveTextContent("₹75.00")
    expect(strip).toHaveTextContent("₹25.00")
    expect(strip).toHaveTextContent("₹1,150.00")
  })

  it("renders avg_order_value as 0 when there are no orders (avoids division by zero)", () => {
    primeListResponse({
      items: [
        makePeriod({
          gross_revenue: 0,
          net_revenue: 0,
          total_orders: 0,
          platform_commission: 0,
          delivery_costs: 0,
          refund_amount: 0,
          payout_amount: 0,
          payout_status: "HELD",
        }),
      ],
    })

    render(<ShopFinancialsPage />)

    const strip = screen.getByTestId("kpi-strip")
    expect(strip).toHaveTextContent("₹0.00")
  })
})

describe("Shop_Financials page — payout chips (Req 8.7)", () => {
  it("renders all four statuses and shows the count of each across the visible rows", () => {
    primeListResponse({
      items: [
        makePeriod({ id: "p1", payout_status: "PAID" }),
        makePeriod({ id: "p2", payout_status: "PAID" }),
        makePeriod({ id: "p3", payout_status: "PENDING" }),
        makePeriod({ id: "p4", payout_status: "HELD" }),
      ],
    })

    render(<ShopFinancialsPage />)

    expect(screen.getByTestId("payout-chip-PENDING")).toHaveTextContent(
      "Pending: 1",
    )
    expect(screen.getByTestId("payout-chip-PROCESSING")).toHaveTextContent(
      "Processing: 0",
    )
    expect(screen.getByTestId("payout-chip-PAID")).toHaveTextContent("Paid: 2")
    expect(screen.getByTestId("payout-chip-HELD")).toHaveTextContent("Held: 1")
  })
})

describe("Shop_Financials page — read-only contract (Req 8.9)", () => {
  it("renders no create/edit/delete buttons", () => {
    primeListResponse({ items: [makePeriod()] })

    render(<ShopFinancialsPage />)

    const all = screen.queryAllByRole("button")
    for (const btn of all) {
      const text = btn.textContent?.toLowerCase() ?? ""
      expect(text).not.toMatch(/\b(create|add|new|edit|delete|remove)\b/)
    }
  })
})

describe("Shop_Financials page — error state (Req 8.10)", () => {
  it("renders the ErrorBlock with a Retry button that re-runs the query", () => {
    const refetch = vi.fn()
    primeListResponse({
      isError: true,
      error: new Error("boom from server"),
      refetch,
    })

    render(<ShopFinancialsPage />)

    expect(screen.getByText("boom from server")).toBeInTheDocument()
    const retry = screen.getByRole("button", { name: /retry/i })
    fireEvent.click(retry)
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
