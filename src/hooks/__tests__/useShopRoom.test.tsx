/**
 * Unit tests for `ShopRoomManager` and `useShopRoom`.
 *
 * Covers the contract from task 13.1 / Req 11.2 / Req 11.7:
 *
 *   1. `switchTo(shopId)` emits `leave shop:{prev}:stock`,
 *      `leave shop:{prev}:orders`, `join shop:{next}:stock`,
 *      `join shop:{next}:orders` in that order.
 *   2. `switchTo(currentShopId)` is a no-op (no emits).
 *   3. `switchTo(null)` leaves the previous shop's rooms and joins nothing.
 *   4. The store subscription wires `setActiveShop`, `setAllShopsMode`, and
 *      `clear` to `switchTo` automatically.
 *   5. The subscription is idempotent — mounting `useShopRoom` from multiple
 *      components does not duplicate `switchTo` calls.
 *   6. Calls made while disconnected do not emit anything but still update
 *      the manager's `currentShopId`; a `connect` event later replays the
 *      joins via `rejoinCurrent`.
 *
 * Validates: Requirements 11.2, 11.7
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight EventEmitter test double
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
  emit: ReturnType<typeof vi.fn>
  /** Test helper to drive lifecycle events. */
  _bus: FakeBus
}

function makeSocket(connected = true): FakeSocket {
  const bus = new FakeBus()
  return {
    connected,
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
    emit: vi.fn(),
    _bus: bus,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

let mockSocket: FakeSocket | null = null

vi.mock("@/components/providers/SocketProvider", () => ({
  useSocket: () => mockSocket,
  SocketProvider: ({ children }: { children: ReactNode }) => children,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import {
  ShopRoomManager,
  __resetShopRoomSubscriptionForTests,
  shopRoomManager,
  useShopRoom,
} from "@/hooks/useShopRoom"
import { useShopContextStore } from "@/store/shop-context.store"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Pull the (event, room) pairs out of the mocked emit calls. */
function emitsFrom(socket: FakeSocket): Array<[string, string]> {
  return socket.emit.mock.calls.map(
    (args) => [args[0], args[1]] as [string, string],
  )
}

/** Snapshot localStorage for the shop-context store between tests. */
function makeMockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: vi.fn((k: string) => (map.has(k) ? (map.get(k) as string) : null)),
    setItem: vi.fn((k: string, v: string) => {
      map.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      map.delete(k)
    }),
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  }
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: makeMockStorage(),
    writable: true,
  })
  __resetShopRoomSubscriptionForTests()
  useShopContextStore.getState().clear()
  useShopContextStore.getState().setAssignedShopIds([])
  mockSocket = null
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// ShopRoomManager (no React)
// ─────────────────────────────────────────────────────────────────────────────

describe("ShopRoomManager.switchTo", () => {
  it("joins both rooms when activating a shop from the idle state", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")

    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])
    expect(m.currentRooms()).toEqual(["shop:s1:stock", "shop:s1:orders"])
  })

  it("leaves prev rooms and joins next rooms when pivoting between shops", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")
    socket.emit.mockClear()

    m.switchTo("s2")

    expect(emitsFrom(socket)).toEqual([
      ["leave", "shop:s1:stock"],
      ["leave", "shop:s1:orders"],
      ["join", "shop:s2:stock"],
      ["join", "shop:s2:orders"],
    ])
    expect(m.currentRooms()).toEqual(["shop:s2:stock", "shop:s2:orders"])
  })

  it("leaves prev rooms and joins nothing when shopId is null", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")
    socket.emit.mockClear()

    m.switchTo(null)

    expect(emitsFrom(socket)).toEqual([
      ["leave", "shop:s1:stock"],
      ["leave", "shop:s1:orders"],
    ])
    expect(m.currentRooms()).toEqual([])
  })

  it("is a no-op when the new id equals the current id", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")
    socket.emit.mockClear()

    m.switchTo("s1")

    expect(socket.emit).not.toHaveBeenCalled()
  })

  it("is a no-op when null → null", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo(null)

    expect(socket.emit).not.toHaveBeenCalled()
    expect(m.currentRooms()).toEqual([])
  })

  it("does not emit when the socket is disconnected, but updates currentShopId so a reconnect can replay", () => {
    const socket = makeSocket(/* connected */ false)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")
    expect(socket.emit).not.toHaveBeenCalled()
    expect(m.currentRooms()).toEqual(["shop:s1:stock", "shop:s1:orders"])

    // Simulate the socket becoming connected and rejoining via the replay
    // path the hook installs on the `connect` event.
    socket.connected = true
    m.rejoinCurrent()

    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])
  })

  it("rejoinCurrent is a no-op when no shop is active", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.rejoinCurrent()

    expect(socket.emit).not.toHaveBeenCalled()
  })

  it("does not throw when no socket is attached", () => {
    const m = new ShopRoomManager()
    // No `attachSocket` call — default accessor returns null.
    expect(() => m.switchTo("s1")).not.toThrow()
    expect(m.currentRooms()).toEqual(["shop:s1:stock", "shop:s1:orders"])
  })

  it("reset() drops state without emitting", () => {
    const socket = makeSocket(true)
    const m = new ShopRoomManager()
    m.attachSocket(() => socket)

    m.switchTo("s1")
    socket.emit.mockClear()

    m.reset()

    expect(socket.emit).not.toHaveBeenCalled()
    expect(m.currentRooms()).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useShopRoom — store subscription + socket lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe("useShopRoom — store subscription", () => {
  it("rotates rooms on `setActiveShop`", () => {
    const socket = makeSocket(true)
    mockSocket = socket

    renderHook(() => useShopRoom())

    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "s1",
          name: "Shop 1",
          branchCode: "BR-01",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        [],
      )
    })

    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])
  })

  it("rotates rooms on `setAllShopsMode` (leaves prev, joins nothing)", () => {
    const socket = makeSocket(true)
    mockSocket = socket

    renderHook(() => useShopRoom())

    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "s1",
          name: "Shop 1",
          branchCode: "BR-01",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        [],
      )
    })
    socket.emit.mockClear()

    act(() => {
      useShopContextStore.getState().setAllShopsMode()
    })

    expect(emitsFrom(socket)).toEqual([
      ["leave", "shop:s1:stock"],
      ["leave", "shop:s1:orders"],
    ])
  })

  it("rotates rooms on `clear()` (logout)", () => {
    const socket = makeSocket(true)
    mockSocket = socket

    renderHook(() => useShopRoom())

    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "s1",
          name: "Shop 1",
          branchCode: "BR-01",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        [],
      )
    })
    socket.emit.mockClear()

    act(() => {
      useShopContextStore.getState().clear()
    })

    expect(emitsFrom(socket)).toEqual([
      ["leave", "shop:s1:stock"],
      ["leave", "shop:s1:orders"],
    ])
  })

  it("does not duplicate emits when mounted from multiple components", () => {
    const socket = makeSocket(true)
    mockSocket = socket

    const a = renderHook(() => useShopRoom())
    const b = renderHook(() => useShopRoom())

    socket.emit.mockClear()

    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "s1",
          name: "Shop 1",
          branchCode: "BR-01",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        [],
      )
    })

    // Exactly one (join stock + join orders) pair, regardless of how many
    // components mounted the hook — the store subscription is idempotent.
    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])

    a.unmount()
    b.unmount()
  })

  it("returns the singleton manager so the same instance is shared across mounts", () => {
    mockSocket = makeSocket(true)
    const a = renderHook(() => useShopRoom())
    const b = renderHook(() => useShopRoom())

    expect(a.result.current).toBe(shopRoomManager)
    expect(b.result.current).toBe(shopRoomManager)
  })

  it("replays joins after a `connect` event when emits were dropped while disconnected", () => {
    const socket = makeSocket(/* connected */ false)
    mockSocket = socket

    renderHook(() => useShopRoom())

    // Switch shop while disconnected — no emits, but currentShopId updates.
    act(() => {
      useShopContextStore.getState().setActiveShop(
        {
          id: "s1",
          name: "Shop 1",
          branchCode: "BR-01",
          city: "Mumbai",
          isActive: true,
        },
        "SHOP_ADMIN",
        [],
      )
    })
    expect(socket.emit).not.toHaveBeenCalled()

    // The hook installed a `connect` listener; firing it should replay the
    // joins for the current shop.
    act(() => {
      socket.connected = true
      socket._bus.emit("connect")
    })

    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])
  })

  it("seeds the rooms from the persisted snapshot when the socket is already connected on mount", () => {
    // Pre-seed the store with a shop, simulating a hydrated session.
    useShopContextStore.getState().setActiveShop(
      {
        id: "s1",
        name: "Shop 1",
        branchCode: "BR-01",
        city: "Mumbai",
        isActive: true,
      },
      "SHOP_ADMIN",
      [],
    )

    const socket = makeSocket(/* connected */ true)
    mockSocket = socket

    renderHook(() => useShopRoom())

    expect(emitsFrom(socket)).toEqual([
      ["join", "shop:s1:stock"],
      ["join", "shop:s1:orders"],
    ])
  })
})
