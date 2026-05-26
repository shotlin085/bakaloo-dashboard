/**
 * Unit tests for `useShopProductLiveUpdates` (task 8.8).
 *
 * Validates: Requirements 7.8, 11.3, 11.4, 14.5
 *
 * The hook bridges Socket.IO `stock-out` / `low-stock` events to the
 * Shop_Products TanStack Query cache. Tests cover the three behaviours
 * called out in the task brief:
 *
 *   1. On a `stock-out` event whose `shop_id` matches `Active_Shop_Id`,
 *      the matching row is patched in place (`stock_quantity = 0`,
 *      `is_available = false`, `sold_out_at` stamped) and a Sonner
 *      `toast.error` titled `Out of stock: <name>` is shown.
 *   2. On a `low-stock` event whose `shop_id` matches `Active_Shop_Id`,
 *      the matching row's `stock_quantity` is updated and a
 *      `toast.warning` titled `Low stock: <name> (<qty> left)` is shown.
 *   3. Cross-shop events (i.e. `shop_id !== activeShopId`) are dropped —
 *      the cache is untouched and no toast is shown. This is the
 *      defense-in-depth guard called out in the task brief.
 *
 * Two structural invariants are also asserted:
 *   - Page length is preserved after every patch.
 *   - Item ordering is preserved after every patch.
 *   - Rows other than the targeted one are referentially unchanged
 *     (we use `toBe` rather than `toEqual` to verify this).
 *
 * The socket is a tiny event-emitter test double (mirroring the harness
 * used by `useShopRoom.test.tsx`) so we can drive `socket.emit` from the
 * test body without spinning up a real Socket.IO client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { toast } from "sonner"

import type { Paginated, ShopProduct } from "@/types"
import { qk } from "@/lib/query-keys"

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight EventEmitter test double for the socket
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
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0
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
// Mocks (must precede the hook import)
// ─────────────────────────────────────────────────────────────────────────────

let mockSocket: FakeSocket | null = null
vi.mock("@/components/providers/SocketProvider", () => ({
  useSocket: () => mockSocket,
}))

const useShopContextMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useShopContext: () => useShopContextMock(),
  // The hook also re-exports `useIsSuperAdmin` from this module; it is not
  // used here but stubbed to mirror the page test surface.
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
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_SHOP = "shop-a"
const OTHER_SHOP = "shop-b"

function makeProduct(overrides: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: overrides.id ?? "sp-1",
    shop_id: ACTIVE_SHOP,
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

function makePage(items: ShopProduct[]): Paginated<ShopProduct> {
  return {
    items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Render harness
// ─────────────────────────────────────────────────────────────────────────────

interface Harness {
  queryClient: QueryClient
  socket: FakeSocket
  unmount: () => void
}

function setup({
  rows,
  mode = "STORE_MODE",
  activeShopId = ACTIVE_SHOP as string | null,
}: {
  rows: ShopProduct[]
  mode?: "STORE_MODE" | "HQ_MODE" | "UNSELECTED"
  activeShopId?: string | null
}): Harness {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  })

  // Seed the cache under the canonical shop-products key shape so the
  // hook's `setQueriesData` predicate matches it.
  queryClient.setQueryData(
    qk.shopProducts(ACTIVE_SHOP, { page: 1, limit: 20 }),
    makePage(rows),
  )

  const socket = makeSocket()
  mockSocket = socket

  useShopContextMock.mockReturnValue({
    activeShopId,
    mode,
    shopRole: "SHOP_ADMIN",
    permissions: ["shop-products.read"],
    shopMeta: null,
    isReady: true,
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const { unmount } = renderHook(() => useShopProductLiveUpdates(), { wrapper })

  return { queryClient, socket, unmount }
}

function readPage(qc: QueryClient): Paginated<ShopProduct> | undefined {
  return qc.getQueryData<Paginated<ShopProduct>>(
    qk.shopProducts(ACTIVE_SHOP, { page: 1, limit: 20 }),
  )
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
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("useShopProductLiveUpdates — stock-out events", () => {
  it("patches the matching row to zero stock + unavailable + stamps sold_out_at", () => {
    const rows = [
      makeProduct({ id: "sp-1", stock_quantity: 12 }),
      makeProduct({ id: "sp-2", stock_quantity: 8 }),
      makeProduct({ id: "sp-3", stock_quantity: 4 }),
    ]
    const { queryClient, socket } = setup({ rows })

    const before = readPage(queryClient)!
    socket.emit("stock-out", {
      shop_product_id: "sp-2",
      name: "Sample product",
      stock_quantity: 0,
      shop_id: ACTIVE_SHOP,
    })
    const after = readPage(queryClient)!

    // Page length and ordering preserved.
    expect(after.items).toHaveLength(3)
    expect(after.items.map((r) => r.id)).toEqual(["sp-1", "sp-2", "sp-3"])

    // Targeted row patched.
    expect(after.items[1].stock_quantity).toBe(0)
    expect(after.items[1].is_available).toBe(false)
    expect(after.items[1].sold_out_at).toEqual(expect.any(String))

    // Untouched rows referentially preserved.
    expect(after.items[0]).toBe(before.items[0])
    expect(after.items[2]).toBe(before.items[2])

    // Toast surfaced with the literal title from the task brief.
    expect(toast.error).toHaveBeenCalledWith("Out of stock: Sample product")
  })
})

describe("useShopProductLiveUpdates — low-stock events", () => {
  it("patches the matching row's stock_quantity and shows a warning toast", () => {
    const rows = [
      makeProduct({ id: "sp-1", stock_quantity: 12 }),
      makeProduct({ id: "sp-2", stock_quantity: 8 }),
    ]
    const { queryClient, socket } = setup({ rows })

    const before = readPage(queryClient)!
    socket.emit("low-stock", {
      shop_product_id: "sp-1",
      name: "Bananas",
      stock_quantity: 3,
      shop_id: ACTIVE_SHOP,
    })
    const after = readPage(queryClient)!

    // Targeted row patched, others untouched.
    expect(after.items[0].stock_quantity).toBe(3)
    expect(after.items[0].is_available).toBe(true) // not flipped
    expect(after.items[1]).toBe(before.items[1])

    // Page length and ordering preserved.
    expect(after.items).toHaveLength(2)
    expect(after.items.map((r) => r.id)).toEqual(["sp-1", "sp-2"])

    expect(toast.warning).toHaveBeenCalledWith("Low stock: Bananas (3 left)")
  })
})

describe("useShopProductLiveUpdates — cross-shop guard", () => {
  it("ignores events whose shop_id does not match activeShopId", () => {
    const rows = [makeProduct({ id: "sp-1", stock_quantity: 12 })]
    const { queryClient, socket } = setup({ rows })

    const before = readPage(queryClient)!
    socket.emit("stock-out", {
      shop_product_id: "sp-1",
      name: "Sample product",
      stock_quantity: 0,
      shop_id: OTHER_SHOP, // ← cross-shop
    })
    socket.emit("low-stock", {
      shop_product_id: "sp-1",
      name: "Sample product",
      stock_quantity: 2,
      shop_id: OTHER_SHOP,
    })
    const after = readPage(queryClient)!

    // Cache referentially identical — the updater short-circuits before
    // the structural clone in the hook.
    expect(after).toBe(before)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
  })
})

describe("useShopProductLiveUpdates — unknown product id", () => {
  it("leaves the cache referentially identical when the row is not on this page", () => {
    const rows = [makeProduct({ id: "sp-1" })]
    const { queryClient, socket } = setup({ rows })

    const before = readPage(queryClient)!
    socket.emit("low-stock", {
      shop_product_id: "sp-999",
      name: "Off-page",
      stock_quantity: 1,
      shop_id: ACTIVE_SHOP,
    })
    const after = readPage(queryClient)!

    // Updater returned `old` unchanged → same reference.
    expect(after).toBe(before)
    // Toast still shows because the event was for the active shop.
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })
})

describe("useShopProductLiveUpdates — gating", () => {
  it("does not subscribe when mode is not SINGLE_SHOP", () => {
    const rows = [makeProduct({ id: "sp-1" })]
    const { socket } = setup({
      rows,
      mode: "HQ_MODE",
      activeShopId: null,
    })

    expect(socket._bus.listenerCount("stock-out")).toBe(0)
    expect(socket._bus.listenerCount("low-stock")).toBe(0)
  })

  it("releases listeners on unmount so stale handlers cannot fire", () => {
    const rows = [makeProduct({ id: "sp-1" })]
    const { socket, unmount } = setup({ rows })

    expect(socket._bus.listenerCount("stock-out")).toBe(1)
    expect(socket._bus.listenerCount("low-stock")).toBe(1)

    unmount()

    expect(socket._bus.listenerCount("stock-out")).toBe(0)
    expect(socket._bus.listenerCount("low-stock")).toBe(0)
  })
})
