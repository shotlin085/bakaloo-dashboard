/**
 * Property test for optimistic mutation rollback on `shop-products`.
 *
 * Feature: multi-vendor-dashboard-ui, Property 8: Optimistic mutation rollback
 * Validates: Requirements 7.9, 15.2
 *
 * Property statement (design.md §Property 8):
 *   For any cache snapshot `C` and any optimistic mutation `M` on
 *   `shop-products` whose request fails, the cache state after `onError` is
 *   deeply equal to `C` (the optimistic update is fully rolled back).
 *
 * Test strategy:
 *   We drive the real `useUpdateShopProduct` hook through its lifecycle
 *   inside a real `QueryClientProvider`, but stub the underlying service
 *   so `update()` always rejects. For each fast-check run we:
 *
 *     1. Seed a fresh `QueryClient` with an arbitrary
 *        `Paginated<ShopProduct>` snapshot under the canonical
 *        `["shop-products", shopId, …]` key (the prefix `onMutate` walks
 *        via `setQueriesData`).
 *     2. Deep-clone the seeded data as the rollback oracle.
 *     3. Render `useUpdateShopProduct(shopId)` under that client and fire
 *        `mutate({ id, body })` against an existing row.
 *     4. Wait for `isError` (the mock rejects synchronously).
 *     5. Assert the cache entry is structurally equal to its pre-mutation
 *        snapshot — `onError` must restore the cache verbatim.
 *
 *   No JSX is used so the file can stay `.ts`; `React.createElement` builds
 *   the provider wrapper inline. Sonner is mocked because the hook calls
 *   `toast.error` on failure and we don't need to render the toast region.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import fc from "fast-check"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — must precede the hook import so the mock factory is wired
// before `useShopProducts.ts` resolves `shopProductsService`.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/services/shop-products.service", () => ({
  shopProductsService: {
    list: vi.fn(),
    searchCatalog: vi.fn(),
    add: vi.fn(),
    update: vi.fn(() => Promise.reject(new Error("server failed"))),
    remove: vi.fn(),
  },
}))

// The hook calls `toast.error` from sonner on mutation failure. The real
// runtime requires a toaster region; the property test only cares about
// cache state, so the call site is captured by a no-op spy.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// `useUpdateShopProduct` does not read `useShopContext` (it takes `shopId`
// as a parameter), but the module imports `useShopContext` at the top so
// we stub it to a stable shape to keep the import graph happy in jsdom.
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => ({
    activeShopId: null,
    mode: "UNSELECTED" as const,
    shopRole: null,
    permissions: [] as string[],
    shopMeta: null,
    isReady: true,
  }),
  useIsSuperAdmin: () => false,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { useUpdateShopProduct } from "@/hooks/useShopProducts"
import { qk } from "@/lib/query-keys"
import type { Paginated, ShopProduct } from "@/types"
import type { ShopProductUpdateBody } from "@/services/shop-products.service"

// ─────────────────────────────────────────────────────────────────────────────
// Smart generators
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-a"

/**
 * Arbitrary fully-shaped `ShopProduct` field set. We do NOT generate `id`
 * here because the wrapping `paginatedSnapshotArb` assigns sequential ids
 * post-hoc so the patch generator can target an existing row deterministically.
 */
const shopProductFieldsArb = fc.record({
  shop_id: fc.constant(SHOP_ID),
  product_id: fc.uuid(),
  price: fc.float({
    min: 0,
    max: 100_000,
    noNaN: true,
    noDefaultInfinity: true,
  }),
  sale_price: fc.option(
    fc.float({
      min: 0,
      max: 100_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    { nil: null },
  ),
  cost_price: fc.option(
    fc.float({
      min: 0,
      max: 100_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    { nil: null },
  ),
  stock_quantity: fc.integer({ min: 0, max: 100_000 }),
  low_stock_threshold: fc.integer({ min: 0, max: 1_000 }),
  max_order_qty: fc.integer({ min: 1, max: 10_000 }),
  is_available: fc.boolean(),
  is_featured: fc.boolean(),
  sold_out_at: fc.option(fc.constant("2024-01-01T00:00:00Z"), { nil: null }),
  restock_eta: fc.option(fc.constant("2024-02-01T00:00:00Z"), { nil: null }),
  product: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    sku: fc.string({ minLength: 1, maxLength: 12 }),
    image_url: fc.constant("https://example.test/p.jpg"),
  }),
})

/**
 * A non-empty `Paginated<ShopProduct>` page plus the deterministic id of
 * the row the patch will target. Ids are assigned post-hoc as `sp-0`,
 * `sp-1`, … so the patch can pick a real index without needing a
 * shrinkable cross-reference.
 */
const paginatedSnapshotArb: fc.Arbitrary<{
  page: Paginated<ShopProduct>
  targetId: string
}> = fc
  .array(shopProductFieldsArb, { minLength: 1, maxLength: 6 })
  .chain((rows) =>
    fc.integer({ min: 0, max: rows.length - 1 }).map((targetIdx) => {
      const items: ShopProduct[] = rows.map((r, i) => ({
        ...r,
        id: `sp-${i}`,
      }))
      const page: Paginated<ShopProduct> = {
        items,
        pagination: {
          page: 1,
          limit: items.length,
          total: items.length,
          totalPages: 1,
        },
      }
      return { page, targetId: `sp-${targetIdx}` }
    }),
  )

/**
 * Arbitrary update patch — every field is optional so each run exercises a
 * different subset of the `ShopProductUpdateBody` shape. The hook merges
 * whatever fields are present onto the targeted row.
 */
const updatePatchArb: fc.Arbitrary<ShopProductUpdateBody> = fc.record(
  {
    price: fc.float({
      min: 0,
      max: 100_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    sale_price: fc.option(
      fc.float({
        min: 0,
        max: 100_000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      { nil: null },
    ),
    cost_price: fc.option(
      fc.float({
        min: 0,
        max: 100_000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      { nil: null },
    ),
    low_stock_threshold: fc.integer({ min: 0, max: 1_000 }),
    max_order_qty: fc.integer({ min: 1, max: 10_000 }),
    is_available: fc.boolean(),
    is_featured: fc.boolean(),
  },
  { requiredKeys: [] },
)

/**
 * `ListParams` slot for the page key. The hook treats the params object
 * structurally so any small variation produces a distinct cache entry.
 */
const listParamsArb = fc.record({
  page: fc.integer({ min: 1, max: 5 }),
  limit: fc.integer({ min: 1, max: 100 }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 8: optimistic mutation rollback", () => {
  it("restores the cache to its pre-mutation snapshot when the request fails", async () => {
    await fc.assert(
      fc.asyncProperty(
        paginatedSnapshotArb,
        updatePatchArb,
        listParamsArb,
        async ({ page, targetId }, patch, listParams) => {
          // Each run gets a fresh QueryClient so cache state from prior
          // runs cannot leak in. Retries are disabled so the failure path
          // resolves in a single tick.
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })

          try {
            const key = qk.shopProducts(SHOP_ID, listParams)

            // Seed the cache with the arbitrary page snapshot.
            queryClient.setQueryData(key, page)

            // Capture the rollback oracle. `structuredClone` produces a
            // deep, reference-fresh copy so the in-place optimistic patch
            // applied by `onMutate` cannot mutate the oracle even if the
            // hook ever swapped to a copy-on-write strategy.
            const oracle = structuredClone(
              queryClient.getQueryData<Paginated<ShopProduct>>(key),
            )

            const wrapper = makeWrapper(queryClient)
            const { result } = renderHook(
              () => useUpdateShopProduct(SHOP_ID),
              { wrapper },
            )

            // Fire the optimistic mutation. The mocked service rejects so
            // `onError` runs and the rollback path is exercised.
            await act(async () => {
              result.current.mutate({ id: targetId, body: patch })
            })

            await waitFor(() => {
              expect(result.current.isError).toBe(true)
            })

            // Property: post-onError cache state is deeply equal to the
            // pre-mutation snapshot. We compare by value (`toEqual`) so any
            // residual mutation from `onMutate`'s `setQueriesData` patch
            // shows up as a structural diff.
            const after =
              queryClient.getQueryData<Paginated<ShopProduct>>(key)
            expect(after).toEqual(oracle)
          } finally {
            queryClient.clear()
          }
        },
      ),
      { numRuns: 50 },
    )
  })
})
