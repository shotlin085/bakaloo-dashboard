/**
 * Feature: multi-vendor-dashboard-ui, Property 9: In-place stock event update
 *
 * Validates: Requirements 7.8, 11.3, 11.4, 14.5
 *
 * Property statement (design.md §"Property 9 — In-place stock event update"):
 *   For any cached page of `shop-products` and any received `stock-out` or
 *   `low-stock` event whose `shop_id == Active_Shop_Id`, the cache update
 *   modifies exactly the row whose `id == event.shop_product_id` and leaves
 *   every other row unchanged; the page length and ordering are preserved.
 *
 * ── Strategy ────────────────────────────────────────────────────────────────
 *
 * Drives `useShopProductLiveUpdates` (task 8.8) through fast-check by
 * generating an arbitrary cached page of shop-products (length 1..20, all
 * distinct ids) and an arbitrary `stock-out` or `low-stock` event whose
 * `shop_product_id` is one of the rows on the page and whose `shop_id`
 * equals `Active_Shop_Id`. We then read the cache before and after the
 * emit and assert:
 *
 *   1. `items.length` is unchanged (page length preserved).
 *   2. Every non-target row is referentially `===` to the same slot in
 *      the `before` snapshot (ordering + identity preserved — Property 9).
 *   3. The target row's `id` matches `event.shop_product_id`.
 *   4. For `stock-out`:
 *      - `stock_quantity === 0`
 *      - `is_available === false`
 *      - `sold_out_at` is a non-empty string (the hook stamps `now`)
 *   5. For `low-stock`:
 *      - `stock_quantity === event.stock_quantity`
 *
 * The socket is the same `FakeBus` / `FakeSocket` event-emitter test double
 * used by the unit test (`__tests__/use-shop-product-live-updates.test.tsx`).
 * `useSocket`, `useShopContext`, and `sonner` are mocked per the same
 * harness so the property test can run synchronously without a Socket.IO
 * client or a Sonner toaster.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fc from "fast-check"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { toast } from "sonner"

import type { Paginated, ShopProduct } from "@/types"
import { qk } from "@/lib/query-keys"

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight EventEmitter test double for the socket — mirrors the unit
// test harness so the hook's `socket.on(...)` / `socket.off(...)` contract
// is exercised without spinning up a real Socket.IO client.
// ─────────────────────────────────────────────────────────────────────────────

class FakeBus {
  private handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  on(event: string, fn: (...args: unknown[]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(fn)
  }
  off(event: string, fn: (...args: unknown[]) => void) {
    this.handlers.get(event)?.delete(fn)
  }
  emit(event: string, ...args: unknown[]) {
    const set = this.handlers.get(event)
    if (!set) return
    for (const fn of Array.from(set)) fn(...args)
  }
}

interface FakeSocket {
  connected: boolean
  on: (event: string, fn: (...args: unknown[]) => void) => void
  off: (event: string, fn: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => void
  _bus: FakeBus
}

function makeSocket(): FakeSocket {
  const bus = new FakeBus()
  return {
    connected: true,
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
    emit: bus.emit.bind(bus),
    _bus: bus,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mocks (must precede the hook import — Vitest hoists `vi.mock` calls)
// ─────────────────────────────────────────────────────────────────────────────

let mockSocket: FakeSocket | null = null
vi.mock("@/components/providers/SocketProvider", () => ({
  useSocket: () => mockSocket,
}))

const useShopContextMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  useIsSuperAdmin: () => false,
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { useShopProductLiveUpdates } from "@/app/(dashboard)/shop-products/_components/use-shop-product-live-updates"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_SHOP = "shop-a"

// The exact list params the hook's `setQueriesData` predicate matches —
// the predicate keys on `["shop-products", activeShopId]` so any params
// suffix would be picked up, but we pin a single shape here so the
// `getQueryData` read after the emit is deterministic.
const LIST_PARAMS = { page: 1, limit: 20 } as const

// ─────────────────────────────────────────────────────────────────────────────
// Smart generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single shop-product row with every field constrained to a sensible range.
 * Stock fields cap at 1000 so generated payloads stay representative of
 * realistic inventory. The `id` is supplied externally (see `pageArb`) so
 * we can guarantee uniqueness across the page and pick a target deterministically.
 */
function rowArb(id: string): fc.Arbitrary<ShopProduct> {
  return fc
    .record({
      price: fc.integer({ min: 1, max: 10_000 }),
      stock_quantity: fc.integer({ min: 0, max: 1000 }),
      low_stock_threshold: fc.integer({ min: 0, max: 100 }),
      max_order_qty: fc.integer({ min: 1, max: 50 }),
      is_available: fc.boolean(),
      is_featured: fc.boolean(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      sku: fc.string({ minLength: 1, maxLength: 20 }),
    })
    .map((r) => ({
      id,
      shop_id: ACTIVE_SHOP,
      product_id: `p-${id}`,
      price: r.price,
      sale_price: null,
      cost_price: null,
      stock_quantity: r.stock_quantity,
      low_stock_threshold: r.low_stock_threshold,
      max_order_qty: r.max_order_qty,
      is_available: r.is_available,
      is_featured: r.is_featured,
      sold_out_at: null,
      restock_eta: null,
      product: {
        id: `p-${id}`,
        name: r.name,
        sku: r.sku,
        image_url: "",
      },
    }))
}

/**
 * Arbitrary cached page: a non-empty array of shop-products with distinct
 * ids. We generate the unique id list first via `fc.uniqueArray` keyed on
 * the string itself, then map each id through `rowArb` to get the row.
 * `pageLength` is implicitly bounded by the `maxLength` on the unique-id
 * generator (1..20) per the task brief.
 */
const pageArb: fc.Arbitrary<ShopProduct[]> = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), {
    minLength: 1,
    maxLength: 20,
  })
  .chain((ids) =>
    ids.length === 0
      ? fc.constant<ShopProduct[]>([])
      : fc.tuple(...ids.map((id) => rowArb(id))).map((rows) => rows as ShopProduct[]),
  )
  .filter((rows) => rows.length > 0)

/**
 * Arbitrary stock event for an arbitrary target row from the page. The
 * target index is picked uniformly over `[0, page.length)` so we exercise
 * head, tail, and interior rows. `eventType` is `stock-out` or `low-stock`
 * with equal probability. The `stock_quantity` for `low-stock` ranges over
 * `[0, 1000]` per the task brief.
 */
interface ScenarioInput {
  rows: ShopProduct[]
  targetIndex: number
  eventType: "stock-out" | "low-stock"
  newStockQty: number
  eventName: string
}

const scenarioArb: fc.Arbitrary<ScenarioInput> = pageArb.chain((rows) =>
  fc.record({
    rows: fc.constant(rows),
    targetIndex: fc.integer({ min: 0, max: rows.length - 1 }),
    eventType: fc.constantFrom("stock-out" as const, "low-stock" as const),
    newStockQty: fc.integer({ min: 0, max: 1000 }),
    eventName: fc.string({ minLength: 1, maxLength: 30 }),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Render harness
// ─────────────────────────────────────────────────────────────────────────────

interface Harness {
  queryClient: QueryClient
  socket: FakeSocket
  unmount: () => void
}

function setup(rows: ShopProduct[]): Harness {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  })

  // Seed the cache under the canonical Shop_Products key shape so the
  // hook's `setQueriesData({ queryKey: ["shop-products", activeShopId] })`
  // predicate matches it.
  const seeded: Paginated<ShopProduct> = {
    items: rows,
    pagination: {
      page: 1,
      limit: rows.length,
      total: rows.length,
      totalPages: 1,
    },
  }
  queryClient.setQueryData(qk.shopProducts(ACTIVE_SHOP, LIST_PARAMS), seeded)

  const socket = makeSocket()
  mockSocket = socket

  useShopContextMock.mockReturnValue({
    activeShopId: ACTIVE_SHOP,
    mode: "SINGLE_SHOP",
    shopRole: "SHOP_ADMIN",
    permissions: ["shop-products.read"],
    shopMeta: null,
    isReady: true,
  })

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  const { unmount } = renderHook(() => useShopProductLiveUpdates(), { wrapper })

  return { queryClient, socket, unmount }
}

function readPage(qc: QueryClient): Paginated<ShopProduct> {
  const page = qc.getQueryData<Paginated<ShopProduct>>(
    qk.shopProducts(ACTIVE_SHOP, LIST_PARAMS),
  )
  if (!page) throw new Error("expected seeded page in cache")
  return page
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShopContextMock.mockReset()
  mockSocket = null
  vi.mocked(toast.error).mockClear()
  vi.mocked(toast.warning).mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 9: in-place stock event update", () => {
  it("mutates only the target row; preserves page length, ordering, and identity", () => {
    fc.assert(
      fc.property(
        scenarioArb,
        ({ rows, targetIndex, eventType, newStockQty, eventName }) => {
          const { queryClient, socket, unmount } = setup(rows)

          try {
            const before = readPage(queryClient)
            const target = rows[targetIndex]

            // Emit the event on the fake socket bus. The payload's
            // `shop_id` matches `Active_Shop_Id` so the hook's
            // defense-in-depth guard is satisfied — Property 9 cares
            // about the in-shop case explicitly.
            socket.emit(eventType, {
              shop_product_id: target.id,
              name: eventName,
              stock_quantity: newStockQty,
              shop_id: ACTIVE_SHOP,
            })

            const after = readPage(queryClient)

            // (1) Page length preserved.
            expect(after.items).toHaveLength(before.items.length)

            // (2) Every non-target row is referentially `===` to the
            //     same slot in `before` (ordering + identity preserved).
            for (let i = 0; i < before.items.length; i++) {
              if (i === targetIndex) continue
              expect(after.items[i]).toBe(before.items[i])
            }

            // (3) Target row's `id` is preserved.
            const patched = after.items[targetIndex]
            expect(patched.id).toBe(target.id)

            // (4)/(5) Type-specific patch assertions.
            if (eventType === "stock-out") {
              expect(patched.stock_quantity).toBe(0)
              expect(patched.is_available).toBe(false)
              expect(typeof patched.sold_out_at).toBe("string")
              expect((patched.sold_out_at ?? "").length).toBeGreaterThan(0)
            } else {
              expect(patched.stock_quantity).toBe(newStockQty)
            }
          } finally {
            unmount()
            queryClient.clear()
            mockSocket = null
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
