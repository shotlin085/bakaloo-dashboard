/**
 * Unit tests for the Shop_Transactions ledger page (tasks 10.3 + 10.4).
 *
 * Covers the page-level behaviors owned by these tasks:
 *   - Empty-shop short-circuit (Req 9.1) — when `mode !== "SINGLE_SHOP"`
 *     the page renders `<EmptyShopState />` and never reads list data.
 *   - All eight columns from Req 9.3 are rendered as headers.
 *   - Running-balance chip (Req 9.7) — sourced from the first visible row's
 *     `balance_after`; hidden when the page is empty.
 *   - Reference cell links (Req 9.6) — order types route to
 *     `/orders/{reference_id}`, PAYOUT_CREDIT routes to
 *     `/shop-financials?period_id={reference_id}`, ADJUSTMENT/EXPENSE
 *     render the raw id without a link.
 *   - Read-only by construction (Req 9.5) — no Add/Edit/Delete CTAs are
 *     rendered anywhere on the page.
 *   - Amount cell sign + colour (Req 9.3) — every credit type
 *     (ORDER_REVENUE, PAYOUT_CREDIT) renders with `+` and the green class,
 *     and every debit type (REFUND_DEBIT, COMMISSION_DEBIT, DELIVERY_COST)
 *     renders with `−` and the red class.
 *
 * Validates: Requirements 9.1, 9.3, 9.5, 9.6, 9.7.
 *
 * The TanStack hooks are mocked at the module boundary so the test focuses
 * on the page wiring and does not exercise the network-IO layer (which has
 * its own coverage in `useShopTransactions.test.tsx`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

const useShopContextMock = vi.fn()
const useIsSuperAdminMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => useIsSuperAdminMock(),
}))

const useShopTransactionsMock = vi.fn()
vi.mock("@/hooks/useShopTransactions", () => ({
  useShopTransactions: (...args: unknown[]) => useShopTransactionsMock(...args),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ShopTransactionsPage from "@/app/(dashboard)/shop-transactions/page"
import type { ShopTransaction } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<ShopTransaction> = {}): ShopTransaction {
  return {
    id: overrides.id ?? "tx-1",
    shop_id: "shop-a",
    type: "ORDER_REVENUE",
    amount: 250,
    balance_after: 1000,
    reference_type: "ORDER",
    reference_id: "ord-123",
    description: "Order paid",
    created_by: "system",
    created_at: "2024-12-25T10:30:00.000Z",
    ...overrides,
  }
}

function primeSingleShopMode() {
  useShopContextMock.mockReturnValue({
    activeShopId: "shop-a",
    mode: "SINGLE_SHOP",
    shopRole: "SHOP_ADMIN",
    permissions: ["shop-transactions.read"],
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
    mode: "ALL_SHOPS",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    isReady: true,
  })
  useIsSuperAdminMock.mockReturnValue(true)
}

function primeListResponse(items: ShopTransaction[]) {
  useShopTransactionsMock.mockReturnValue({
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

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShopContextMock.mockReset()
  useIsSuperAdminMock.mockReset()
  useShopTransactionsMock.mockReset()

  // Sensible defaults — each test can override.
  primeSingleShopMode()
  primeListResponse([])
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Shop_Transactions page — empty-shop short-circuit (Req 9.1)", () => {
  it("renders the EmptyShopState when mode is ALL_SHOPS and never mounts the list shell", () => {
    primeAllShopsMode()

    render(<ShopTransactionsPage />)

    // Empty state title from `t("emptyShop.title")`.
    expect(screen.getByText("Select a shop")).toBeInTheDocument()

    // The list hook is still invoked (React unconditionally calls all hooks
    // above the early-return), but the page short-circuits before any list
    // rows or filters are mounted — verified by the absence of the search
    // input, the data table, and the running-balance chip.
    expect(
      screen.queryByPlaceholderText("Search descriptions"),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("running-balance-chip"),
    ).not.toBeInTheDocument()
  })

  it("shows the super-admin hint when isSuperAdmin is true", () => {
    primeAllShopsMode()

    render(<ShopTransactionsPage />)

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

    render(<ShopTransactionsPage />)

    expect(
      screen.getByRole("link", { name: /choose a shop/i }),
    ).toBeInTheDocument()
  })
})

describe("Shop_Transactions page — list shell in SINGLE_SHOP mode", () => {
  it("renders all eight column headers from Req 9.3 in the canonical order", () => {
    primeListResponse([makeTx()])

    render(<ShopTransactionsPage />)

    // The DataList shell renders both a table (md+) and stacked cards
    // (below md). The `columnheader` role is only present on the <th>
    // elements inside the table, so we count exactly eight.
    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(8)

    const headerText = headers.map((h) => h.textContent?.trim())
    expect(headerText).toEqual([
      "Date",
      "Type",
      "Amount",
      "Balance",
      "Reference type",
      "Reference",
      "Description",
      "Created by",
    ])
  })

  it("renders the running-balance chip from the first visible row's balance_after (Req 9.7)", () => {
    // Backend returns rows sorted `created_at` desc, so the first row carries
    // the latest known balance.
    primeListResponse([
      makeTx({ id: "tx-newest", balance_after: 1500 }),
      makeTx({ id: "tx-older", balance_after: 1250 }),
    ])

    render(<ShopTransactionsPage />)

    const chip = screen.getByTestId("running-balance-chip")
    // The exact currency glyph depends on Intl, so we only assert the prefix
    // and the magnitude — both are stable across CI environments.
    expect(chip).toHaveTextContent(/Running balance/)
    expect(chip).toHaveTextContent(/1,?500/)
  })

  it("hides the running-balance chip when the page is empty", () => {
    primeListResponse([])

    render(<ShopTransactionsPage />)

    expect(
      screen.queryByTestId("running-balance-chip"),
    ).not.toBeInTheDocument()
  })

  it("renders read-only — there is no Add/Edit/Delete CTA anywhere on the page (Req 9.5)", () => {
    primeListResponse([makeTx()])

    render(<ShopTransactionsPage />)

    // Buttons with these names should never exist on the ledger surface.
    expect(
      screen.queryByRole("button", { name: /add/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /create/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /remove/i }),
    ).not.toBeInTheDocument()
  })
})

describe("Shop_Transactions page — reference cell routing (Req 9.6)", () => {
  // The DataList shell renders both a table (md+) and stacked cards
  // (below md). Tailwind's responsive `hidden`/`md:hidden` classes don't
  // actually hide either branch in jsdom, so the same row appears twice.
  // We scope every reference-cell assertion to the table to avoid the
  // duplicate-element ambiguity.

  it.each([
    ["ORDER_REVENUE", "ord-1", "/orders/ord-1"],
    ["REFUND_DEBIT", "ord-2", "/orders/ord-2"],
    ["COMMISSION_DEBIT", "ord-3", "/orders/ord-3"],
    ["DELIVERY_COST", "ord-4", "/orders/ord-4"],
  ] as const)(
    "links %s rows to /orders/{reference_id}",
    (type, refId, expectedHref) => {
      primeListResponse([
        makeTx({
          id: `tx-${type}`,
          type,
          reference_id: refId,
          // Order-typed rows still carry an ORDER reference_type in practice;
          // the router decision is driven by `type`, not `reference_type`.
          reference_type: "ORDER",
        }),
      ])

      render(<ShopTransactionsPage />)

      const table = screen.getByRole("table")
      const link = within(table).getByRole("link", { name: refId })
      expect(link).toHaveAttribute("href", expectedHref)
    },
  )

  it("links PAYOUT_CREDIT rows to /shop-financials?period_id={reference_id}", () => {
    primeListResponse([
      makeTx({
        id: "tx-payout",
        type: "PAYOUT_CREDIT",
        amount: -500,
        reference_id: "period-2024-12-w52",
        reference_type: "PAYOUT",
      }),
    ])

    render(<ShopTransactionsPage />)

    const table = screen.getByRole("table")
    const link = within(table).getByRole("link", {
      name: "period-2024-12-w52",
    })
    expect(link).toHaveAttribute(
      "href",
      "/shop-financials?period_id=period-2024-12-w52",
    )
  })

  it("renders ADJUSTMENT rows without a link (no canonical destination)", () => {
    primeListResponse([
      makeTx({
        id: "tx-adj",
        type: "ADJUSTMENT",
        reference_id: "adj-9",
        reference_type: "ADJUSTMENT",
      }),
    ])

    render(<ShopTransactionsPage />)

    const table = screen.getByRole("table")
    // The reference id text still shows up so the column stays informative,
    // but it is not wrapped in a `<Link>` (so `getByRole("link", ...)` for
    // the id returns nothing inside the table).
    expect(
      within(table).queryByRole("link", { name: "adj-9" }),
    ).not.toBeInTheDocument()
    expect(within(table).getByText("adj-9")).toBeInTheDocument()
  })

  it("renders rows with a null reference_id without any link", () => {
    primeListResponse([
      makeTx({
        id: "tx-null-ref",
        type: "EXPENSE",
        reference_id: null,
        reference_type: null,
      }),
    ])

    render(<ShopTransactionsPage />)

    // No links inside the table — the cell falls back to the em-dash
    // placeholder used for missing references throughout the dashboard.
    const table = screen.getByRole("table")
    expect(within(table).queryAllByRole("link")).toHaveLength(0)
  })
})

describe("Shop_Transactions page — amount sign + colour (Req 9.3, 13.6)", () => {
  // Per Req 9.3, credits render in green with a leading `+` and debits
  // render in red with a leading `−` (U+2212 MINUS SIGN — distinct from a
  // hyphen-minus so screen readers announce it correctly). The colour is
  // driven by the sign of `amount`, not by `type` directly; the canonical
  // pairing of each type with its sign mirrors the backend's ledger model:
  // ORDER_REVENUE / PAYOUT_CREDIT credit the shop's balance (+), while
  // REFUND_DEBIT / COMMISSION_DEBIT / DELIVERY_COST debit it (−).

  it.each([
    ["ORDER_REVENUE", 250, /250/],
    ["PAYOUT_CREDIT", 1500, /1,?500/],
  ] as const)(
    "renders %s with a leading '+' and the credit colour class",
    (type, amount, magnitudeRe) => {
      primeListResponse([
        makeTx({ id: `tx-${type}`, type, amount }),
      ])

      render(<ShopTransactionsPage />)

      const table = screen.getByRole("table")
      const creditCell = within(table).getByText(/^\+/)
      // Tolerate locale-specific thousands separators (e.g. `1,500.00`).
      expect(creditCell).toHaveTextContent(magnitudeRe)
      expect(creditCell.className).toContain("text-green-600")
      expect(creditCell.className).not.toContain("text-red-600")
    },
  )

  it.each([
    ["REFUND_DEBIT", -75, /75/],
    ["COMMISSION_DEBIT", -50, /50/],
    ["DELIVERY_COST", -30, /30/],
  ] as const)(
    "renders %s with a leading '−' and the debit colour class",
    (type, amount, magnitudeRe) => {
      primeListResponse([
        makeTx({ id: `tx-${type}`, type, amount }),
      ])

      render(<ShopTransactionsPage />)

      const table = screen.getByRole("table")
      const debitCell = within(table).getByText(/^−/)
      // The cell renders the magnitude (absolute value) prefixed by the
      // explicit minus sign, so we match against the positive number.
      expect(debitCell).toHaveTextContent(magnitudeRe)
      expect(debitCell.className).toContain("text-red-600")
      expect(debitCell.className).not.toContain("text-green-600")
    },
  )
})
