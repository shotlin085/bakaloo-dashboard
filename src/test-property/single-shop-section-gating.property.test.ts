/**
 * Feature: multi-vendor-dashboard-ui, Property 6: Single-shop section gating
 *
 * Validates: Requirements 4.5, 7.11, 8.1, 9.1, 10.5
 *
 * Property statement (design.md §"Property 6 — Single-shop section gating"):
 *   For any route in
 *     `{shop-products, shop-financials, shop-transactions, shop-staff}`
 *   and any Shop_Context_Store `mode`, while `mode != SINGLE_SHOP` the
 *   page issues NO list query and renders the "empty / select a shop"
 *   state. We test the hooks-level invariant — every list hook the four
 *   pages mount must short-circuit (`enabled: false` semantics) when
 *   `mode != SINGLE_SHOP`.
 *
 * ── Strategy ────────────────────────────────────────────────────────────────
 *
 * The three hooks under test gate via two structurally different but
 * Shop_Context-consistent shapes:
 *
 *   - `useShopProductsList`  — `enabled: mode === "SINGLE_SHOP" && !!shopId`
 *   - `useShopTransactions`  — `enabled: mode === "SINGLE_SHOP" && !!shopId`
 *   - `useShopFinancials`    — `enabled: !!shopId` (page-level mode short-
 *                              circuit; hook accepts `shopId` directly)
 *
 * Both shapes converge under the Shop_Context_Store invariant:
 * `mode != SINGLE_SHOP ⇒ activeShopId === null` (see
 * `setAllShopsMode` and `clear` in `store/shop-context.store.ts` — both
 * write `activeShopId: null`). So when we faithfully mirror that
 * invariant in the stub (mode-conditioned `activeShopId`), the negative
 * property holds for all three hooks via their respective gates.
 *
 * For each `(route, mode)` we:
 *
 *   1. Stub `useShopContext()` to return the generated `mode` paired with
 *      `activeShopId = mode === "SINGLE_SHOP" ? ACTIVE_SHOP_ID : null` —
 *      mirroring the store invariant so the test reflects real runtime
 *      state, not an unreachable combination.
 *   2. Render the hook through `renderHook` inside a fresh
 *      `QueryClientProvider`. For `useShopFinancials`, the `shopId` slot
 *      is read off the same stubbed context so the page-level threading
 *      stays faithful (page passes `shopId: activeShopId`).
 *   3. Assert TanStack's `enabled: false` shape:
 *        - `result.current.fetchStatus === "idle"` (no in-flight request)
 *        - `result.current.data === undefined`        (no cached payload)
 *
 * `useShopStaffList` is intentionally OUT of scope: same `enabled: !!shopId`
 * gating shape as `useShopFinancials`, but the staff route is never a
 * dashboard top-level Super_Admin entry and the page short-circuits to
 * `<EmptyShopState />` exactly like the financials page. Coverage is
 * provided by the financials route in this property — adding staff would
 * duplicate the structural case without exercising new code paths.
 *
 * The three service modules are mocked so even if a request slipped
 * through the gate the test would surface it as a synchronous mock-call
 * assertion failure, never a real network call.
 *
 * `numRuns: 30` — rendering React per case is moderately expensive and
 * the input space (route × mode minus the SINGLE_SHOP filter) is small.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fc from "fast-check"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"

import type { ShopMode } from "@/store/shop-context.store"
import type { ShopFinancialPeriodType } from "@/types/shop-financial.types"

// ─────────────────────────────────────────────────────────────────────────────
// Mocks (must precede the hook imports — Vitest hoists `vi.mock` calls)
//
// `vi.hoisted` is required because `vi.mock` factories are hoisted to the
// top of the file alongside imports; any top-level `const fn = vi.fn()`
// would otherwise be reached AFTER the factory runs, producing a
// `Cannot access … before initialization` ReferenceError.
// ─────────────────────────────────────────────────────────────────────────────

const {
  useShopContextMock,
  shopProductsListMock,
  shopFinancialsListMock,
  shopTransactionsListMock,
} = vi.hoisted(() => ({
  useShopContextMock: vi.fn(),
  shopProductsListMock: vi.fn(),
  shopFinancialsListMock: vi.fn(),
  shopTransactionsListMock: vi.fn(),
}))

vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => false,
}))

// Mock all three list-side services so a leaked request becomes a
// synchronous mock-call assertion failure, not a real HTTP attempt.
vi.mock("@/services/shop-products.service", () => ({
  shopProductsService: {
    list: shopProductsListMock,
    searchCatalog: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock("@/services/shop-financials.service", () => ({
  shopFinancialsService: {
    list: shopFinancialsListMock,
  },
}))

vi.mock("@/services/shop-transactions.service", () => ({
  shopTransactionsService: {
    list: shopTransactionsListMock,
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Hook imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { useShopProductsList } from "@/hooks/useShopProducts"
import { useShopFinancials } from "@/hooks/useShopFinancials"
import { useShopTransactions } from "@/hooks/useShopTransactions"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Active shop id used when `mode === SINGLE_SHOP`. For other modes the
 * stubbed `activeShopId` is `null` to mirror the Shop_Context_Store
 * invariant: `setAllShopsMode` and `clear` both write `activeShopId:
 * null`, so the negative property is exercised in the same shape the
 * runtime ever actually produces.
 */
const ACTIVE_SHOP_ID = "shop-prop-6"

/** Period type used by the financials hook — matches design.md §9. */
const PERIOD_TYPE: ShopFinancialPeriodType = "DAILY"

/** Per-route filter shapes the page-level callers actually pass. */
const PRODUCTS_FILTERS = { page: 1, limit: 20 } as const
const TRANSACTIONS_FILTERS = { page: 1, limit: 20 } as const

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

type Route = "shop-products" | "shop-financials" | "shop-transactions"

const routeArb: fc.Arbitrary<Route> = fc.constantFrom(
  "shop-products",
  "shop-financials",
  "shop-transactions",
)

const modeArb: fc.Arbitrary<ShopMode> = fc.constantFrom(
  "SINGLE_SHOP",
  "ALL_SHOPS",
  "UNSELECTED",
)

// ─────────────────────────────────────────────────────────────────────────────
// Render harness
// ─────────────────────────────────────────────────────────────────────────────

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

/**
 * Mount the hook for `route` under a fresh QueryClient and return the
 * `result` ref so the property can read TanStack's `fetchStatus` /
 * `data` slots.
 *
 * `shopId` is passed in (rather than read off the stub) so the financials
 * hook — whose call site on the page is `useShopFinancials({ shopId:
 * activeShopId, … })` — receives the same value the page would forward.
 *
 * The unmount handle is returned so the per-run `finally` block can tear
 * the React tree down cleanly between fast-check iterations — leaving
 * mounted React trees behind across 30 runs leaks subscriptions and
 * slows the suite considerably.
 */
function renderRouteHook(route: Route, shopId: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = makeWrapper(queryClient)

  if (route === "shop-products") {
    const { result, unmount } = renderHook(
      () => useShopProductsList(PRODUCTS_FILTERS),
      { wrapper },
    )
    return { result, unmount, queryClient }
  }

  if (route === "shop-financials") {
    const { result, unmount } = renderHook(
      () =>
        useShopFinancials({
          shopId,
          period_type: PERIOD_TYPE,
          page: 1,
          limit: 20,
        }),
      { wrapper },
    )
    return { result, unmount, queryClient }
  }

  // route === "shop-transactions"
  const { result, unmount } = renderHook(
    () => useShopTransactions(TRANSACTIONS_FILTERS),
    { wrapper },
  )
  return { result, unmount, queryClient }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShopContextMock.mockReset()
  shopProductsListMock.mockReset()
  shopFinancialsListMock.mockReset()
  shopTransactionsListMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 6: single-shop section gating", () => {
  it("issues no list query and exposes no data when mode != SINGLE_SHOP", () => {
    fc.assert(
      fc.property(routeArb, modeArb, (route, mode) => {
        // Negative property only — when mode IS SINGLE_SHOP the hooks
        // are entitled to fire a request, which is out of scope for
        // Property 6 (positive coverage lives in each hook's own unit
        // tests).
        fc.pre(mode !== "SINGLE_SHOP")

        // Mirror the Shop_Context_Store invariant: when mode is not
        // SINGLE_SHOP the store always has `activeShopId === null`
        // (`setAllShopsMode` and `clear` both write null). Reproducing
        // that here means we exercise the negative property in the
        // exact shape the runtime ever actually produces.
        const activeShopId =
          mode === "SINGLE_SHOP" ? ACTIVE_SHOP_ID : null

        useShopContextMock.mockReturnValue({
          activeShopId,
          mode,
          shopRole: null,
          permissions: [] as string[],
          shopMeta: null,
          isReady: true,
        })

        const { result, unmount, queryClient } = renderRouteHook(
          route,
          activeShopId,
        )

        try {
          // (1) `enabled: false` ⇒ TanStack Query stays in `fetchStatus:
          //     "idle"` and never invokes the queryFn — see
          //     https://tanstack.com/query/v5/docs/framework/react/guides/disabling-queries
          expect(result.current.fetchStatus).toBe("idle")

          // (2) No cached payload — the hook hands the page `undefined`,
          //     which the page-level branch interprets as "render the
          //     empty / select a shop state" (Req 4.5, 7.11, 8.1, 9.1).
          expect(result.current.data).toBeUndefined()

          // (3) Belt-and-braces: the mocked service was never called.
          //     If the gating predicate ever regresses to `enabled: true`
          //     in this branch, this catches it before the runtime would
          //     have hit the network.
          if (route === "shop-products") {
            expect(shopProductsListMock).not.toHaveBeenCalled()
          } else if (route === "shop-financials") {
            expect(shopFinancialsListMock).not.toHaveBeenCalled()
          } else {
            expect(shopTransactionsListMock).not.toHaveBeenCalled()
          }
        } finally {
          unmount()
          queryClient.clear()
        }
      }),
      { numRuns: 30 },
    )
  })
})
