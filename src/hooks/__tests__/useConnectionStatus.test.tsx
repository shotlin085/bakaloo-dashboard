/**
 * Unit tests for `useConnectionStatus`.
 *
 * Covers the four socket lifecycle transitions surfaced by the hook:
 *
 *   1. **No socket yet** — provider hasn't mounted a socket (logged out or
 *      pre-login). The hook returns `{ isConnected: false, isReconnecting:
 *      false }` (idle) so the topbar `<ReconnectingIndicator />` stays
 *      hidden.
 *   2. **`disconnect`** — the socket drops; the hook reports
 *      `isReconnecting: true` so the indicator surfaces a pill.
 *   3. **`connect`** — the socket comes back; the hook reports
 *      `isConnected: true` and clears `isReconnecting`.
 *   4. **`reconnect_attempt`** — fired on the manager during retries; the
 *      hook reports `isReconnecting: true` even when no `disconnect` has
 *      yet been observed (e.g. initial connect).
 *
 * The tests use a fake `Socket`-shaped object so they exercise the same
 * event-emitter contract the real `socket.io-client` uses, without spinning
 * up an actual socket connection.
 *
 * Validates: Requirements 11.6, 15.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight EventEmitter test double
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal event-bus matching the subset of `socket.io-client` the hook uses:
 * `on(event, fn)`, `off(event, fn)`, and `emit(event, ...args)`. Stand-alone
 * so the test never imports `socket.io-client`, keeping the test fast and
 * deterministic.
 */
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
    // `Array.from` keeps iteration ES5-compatible (avoids the
    // `--downlevelIteration` constraint when iterating a `Set` directly).
    for (const fn of Array.from(set)) fn(...args)
  }
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0
  }
}

interface FakeSocket {
  connected: boolean
  on: FakeBus["on"]
  off: FakeBus["off"]
  emit: FakeBus["emit"]
  io: { on: FakeBus["on"]; off: FakeBus["off"]; emit: FakeBus["emit"] }
  /** Test helper — drives the hook's listeners. */
  _bus: FakeBus
  _managerBus: FakeBus
}

function makeSocket(connected = false): FakeSocket {
  const bus = new FakeBus()
  const managerBus = new FakeBus()
  return {
    connected,
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
    emit: bus.emit.bind(bus),
    io: {
      on: managerBus.on.bind(managerBus),
      off: managerBus.off.bind(managerBus),
      emit: managerBus.emit.bind(managerBus),
    },
    _bus: bus,
    _managerBus: managerBus,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock the SocketProvider to return our fake socket
// ─────────────────────────────────────────────────────────────────────────────

let mockSocket: FakeSocket | null = null

vi.mock("@/components/providers/SocketProvider", () => ({
  // The hook only reads `useSocket()`. Tests assign `mockSocket` between
  // arrange/act phases to drive the hook through different states.
  useSocket: () => mockSocket,
  // SocketProvider itself is unused by these tests but must be exported so
  // module shape stays compatible with consumers in the rest of the suite.
  SocketProvider: ({ children }: { children: ReactNode }) => children,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { useConnectionStatus } from "@/hooks/useConnectionStatus"

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSocket = null
})

afterEach(() => {
  mockSocket = null
})

describe("useConnectionStatus", () => {
  it("returns idle state when no socket is provided", () => {
    mockSocket = null

    const { result } = renderHook(() => useConnectionStatus())

    expect(result.current).toEqual({
      isConnected: false,
      isReconnecting: false,
    })
  })

  it("seeds connected state when the socket is already connected on mount", () => {
    mockSocket = makeSocket(/* connected */ true)

    const { result } = renderHook(() => useConnectionStatus())

    expect(result.current).toEqual({
      isConnected: true,
      isReconnecting: false,
    })
  })

  it("flips to reconnecting when the socket disconnects", () => {
    const socket = makeSocket(true)
    mockSocket = socket
    const { result } = renderHook(() => useConnectionStatus())

    act(() => {
      socket.connected = false
      socket._bus.emit("disconnect", "transport close")
    })

    expect(result.current).toEqual({
      isConnected: false,
      isReconnecting: true,
    })
  })

  it("flips to reconnecting on `reconnect_attempt`", () => {
    const socket = makeSocket(false)
    mockSocket = socket
    const { result } = renderHook(() => useConnectionStatus())

    act(() => {
      socket._managerBus.emit("reconnect_attempt", 1)
    })

    expect(result.current).toEqual({
      isConnected: false,
      isReconnecting: true,
    })
  })

  it("clears reconnecting once `connect` fires", () => {
    const socket = makeSocket(false)
    mockSocket = socket
    const { result } = renderHook(() => useConnectionStatus())

    act(() => {
      socket._bus.emit("disconnect", "transport close")
    })
    expect(result.current.isReconnecting).toBe(true)

    act(() => {
      socket.connected = true
      socket._bus.emit("connect")
    })

    expect(result.current).toEqual({
      isConnected: true,
      isReconnecting: false,
    })
  })

  it("removes its listeners on unmount so no memory leaks accrue", () => {
    const socket = makeSocket(true)
    mockSocket = socket

    const { unmount } = renderHook(() => useConnectionStatus())

    expect(socket._bus.listenerCount("connect")).toBe(1)
    expect(socket._bus.listenerCount("disconnect")).toBe(1)
    expect(socket._managerBus.listenerCount("reconnect_attempt")).toBe(1)

    unmount()

    expect(socket._bus.listenerCount("connect")).toBe(0)
    expect(socket._bus.listenerCount("disconnect")).toBe(0)
    expect(socket._managerBus.listenerCount("reconnect_attempt")).toBe(0)
  })
})
