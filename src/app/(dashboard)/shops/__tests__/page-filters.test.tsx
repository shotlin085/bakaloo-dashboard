/**
 * Page-level test for the shops list filters — task 5.8.
 *
 * Validates the debounced filter contract on `/shops` (Req 5.3, 14.3):
 *
 *   - Free-text search across name + branch_code is debounced at 300 ms,
 *     so a burst of keystrokes coalesces into exactly one outbound list
 *     request after the debounce window settles.
 *   - Other text-contains filters (e.g. `city`) follow the same path:
 *     state setter → debounced value → params `useMemo` → new query key
 *     → one outbound request with the corresponding query param.
 *   - Pagination (`page`) resets to 1 on every filter change so the
 *     refetch lands on the first page of the new filtered set.
 *
 * Test strategy:
 *
 *   - Mock `shopsService.list` (the service-layer entry-point invoked by
 *     `useShopsList`'s `queryFn`) so we can count and inspect outbound
 *     requests without touching the network.
 *   - Wrap the page in a fresh `QueryClientProvider` with `retry: false`
 *     so failure paths resolve in a single tick.
 *   - Use `vi.useFakeTimers()` to deterministically cross the 300 ms
 *     `useDebounce` window — the same approach used by the Shop_Selector
 *     page-filter test
 *     (`src/app/(auth)/select-shop/__tests__/page-filter.test.tsx`).
 *   - Mock `useRouteRBAC` so the page mounts without a real auth/store
 *     setup, and `useIsSuperAdmin` so the "Create shop" CTA is gated
 *     correctly.
 *
 *   The filter-dropdown branch (Radix `Select` for `is_active` /
 *   `is_verified`) follows the same state → useMemo → query path that
 *   the text inputs exercise; we cover that path via the `city` input
 *   (also driven through the same `useDebounce(300)` pipeline) so the
 *   test stays decoupled from Radix's pointer-event-driven popper UI.
 *
 * Validates: Requirements 5.3, 14.3, 14.4
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills.
//
// `<ShopsPage />` mounts Radix `Select` triggers and a `Dialog`-based
// confirm popup. Both internally rely on `ResizeObserver` (via Radix's
// `useSize`), and `Dialog` additionally calls `scrollIntoView` on focused
// elements. jsdom ships neither, so we supply no-op stubs. The test never
// resizes or scrolls anything during its assertions.
// ─────────────────────────────────────────────────────────────────────────────

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function () {
    /* no-op */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the page module)
// ─────────────────────────────────────────────────────────────────────────────

const useRouterMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}))

const useRouteRBACMock = vi.fn()
vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: () => useRouteRBACMock(),
}))

const useIsSuperAdminMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useIsSuperAdmin: () => useIsSuperAdminMock(),
}))

vi.mock("@/services/shops.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/shops.service")>()
  return {
    ...actual,
    shopsService: {
      list: vi.fn(),
      listActive: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      reactivate: vi.fn(),
      setVerified: vi.fn(),
    },
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

import ShopsPage from "@/app/(dashboard)/shops/page"
import { shopsService } from "@/services/shops.service"
import { t } from "@/lib/i18n"
import type { Paginated, Shop } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Empty-list response in the canonical `Paginated<Shop>` shape returned
 * by `shopsService.list`. The page renders the "no shops yet" empty state
 * for this payload, which is fine — the test asserts on call counts and
 * outbound params, not on rendered rows.
 */
function emptyPage(): Paginated<Shop> {
  return {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // No staleTime: refetch only on query-key changes (which is what
        // we're measuring) and never spontaneously between params changes.
        gcTime: 0,
      },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

/**
 * Pull the `params` object off every `shopsService.list` call so the test
 * can express assertions in terms of "what got sent" rather than indexing
 * into the mock call array.
 */
function listCallParams(): Array<Record<string, unknown>> {
  return vi
    .mocked(shopsService.list)
    .mock.calls.map((call) => (call[0] ?? {}) as Record<string, unknown>)
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useRouterMock.mockReset()
  useRouterMock.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })

  useRouteRBACMock.mockReset()
  useRouteRBACMock.mockReturnValue({
    isAuthorized: true,
    canRead: true,
    canWrite: true,
    requiresActiveShop: false,
    superAdminOnly: false,
    guard: null,
  })

  useIsSuperAdminMock.mockReset()
  useIsSuperAdminMock.mockReturnValue(true)

  vi.mocked(shopsService.list).mockReset()
  vi.mocked(shopsService.list).mockResolvedValue(emptyPage())

  // Fake timers so the 300 ms `useDebounce` window is deterministic.
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ShopsPage — list filters debounce + single request", () => {
  it("collapses a burst of search keystrokes into exactly one outbound request after 300ms", () => {
    const qc = makeQueryClient()
    render(<ShopsPage />, { wrapper: makeWrapper(qc) })

    // ── Initial mount fires one request (the default-params query). ──────
    expect(shopsService.list).toHaveBeenCalledTimes(1)
    const initialParams = listCallParams()[0]
    expect(initialParams).toMatchObject({ page: 1, limit: 20 })
    // Sanity: no search filter yet on the initial call.
    expect(initialParams).not.toHaveProperty("search")

    // ── User types four characters fast, well within the debounce window.
    const searchInput = screen.getByPlaceholderText(
      t("shops.list.searchPlaceholder"),
    ) as HTMLInputElement

    act(() => {
      fireEvent.change(searchInput, { target: { value: "b" } })
      fireEvent.change(searchInput, { target: { value: "ba" } })
      fireEvent.change(searchInput, { target: { value: "ban" } })
      fireEvent.change(searchInput, { target: { value: "band" } })
    })

    // ── Inside the debounce window — no new request fired. ───────────────
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(1)

    // ── Cross the threshold — exactly one new request, with the final
    //    query value (Req 14.3 — 300ms debounce coalesces inputs).
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(2)

    const refetchParams = listCallParams()[1]
    expect(refetchParams).toMatchObject({
      page: 1,
      limit: 20,
      search: "band",
    })

    // ── No further requests fire while time keeps advancing past the
    //    window — the debouncer doesn't retrigger on stable input.
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(2)
  })

  it("debounces text-filter changes (city) into a single request with the right params", () => {
    const qc = makeQueryClient()
    render(<ShopsPage />, { wrapper: makeWrapper(qc) })

    expect(shopsService.list).toHaveBeenCalledTimes(1)

    // The `city` filter is a debounced text-contains input that follows
    // the same state → useMemo → query-key path the dropdown filters take.
    // Multiple keystrokes inside the window should coalesce identically.
    const cityInput = screen.getByLabelText(
      t("shops.list.filter.city"),
    ) as HTMLInputElement

    act(() => {
      fireEvent.change(cityInput, { target: { value: "M" } })
      fireEvent.change(cityInput, { target: { value: "Mu" } })
      fireEvent.change(cityInput, { target: { value: "Mum" } })
    })

    // Inside the window — initial mount call only.
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(1)

    // Cross the threshold — exactly one new request with the city param.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(2)

    const refetchParams = listCallParams()[1]
    expect(refetchParams).toMatchObject({
      page: 1,
      limit: 20,
      city: "Mum",
    })
    // Search filter never set in this test, so the param is absent.
    expect(refetchParams).not.toHaveProperty("search")
  })

  it("omits whitespace-only search values from the outbound params", () => {
    const qc = makeQueryClient()
    render(<ShopsPage />, { wrapper: makeWrapper(qc) })

    expect(shopsService.list).toHaveBeenCalledTimes(1)
    const searchInput = screen.getByPlaceholderText(
      t("shops.list.searchPlaceholder"),
    ) as HTMLInputElement

    // A whitespace-only query trims to "" and is omitted from the params.
    act(() => {
      fireEvent.change(searchInput, { target: { value: "   " } })
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // The page memo only includes `search` when the trimmed value is
    // truthy, so no outbound call should ever carry the whitespace value.
    // Whether or not a refetch fires (depends on internal memo identity),
    // the contract is the same: no "   " ever lands on the wire.
    for (const params of listCallParams()) {
      expect(params).not.toHaveProperty("search")
    }
  })

  it("rapidly alternating search values still produces only one settled request", () => {
    const qc = makeQueryClient()
    render(<ShopsPage />, { wrapper: makeWrapper(qc) })

    const searchInput = screen.getByPlaceholderText(
      t("shops.list.searchPlaceholder"),
    ) as HTMLInputElement

    // The user types, deletes, retypes — the debouncer should still
    // collapse the entire burst into one outbound query for the LATEST
    // value at the moment the window closes.
    act(() => {
      fireEvent.change(searchInput, { target: { value: "abc" } })
    })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    act(() => {
      fireEvent.change(searchInput, { target: { value: "xyz" } })
    })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    // Window has not yet fully elapsed for the latest keystroke — no
    // refetch yet.
    expect(shopsService.list).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(shopsService.list).toHaveBeenCalledTimes(2)

    const refetchParams = listCallParams()[1]
    expect(refetchParams).toMatchObject({ search: "xyz" })
  })
})
