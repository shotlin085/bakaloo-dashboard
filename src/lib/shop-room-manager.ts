/**
 * `ShopRoomManager` and the module-level `shopRoomManager` singleton.
 *
 * Extracted from `@/hooks/useShopRoom` so non-React modules (notably
 * `@/store/auth.store`, which must call `shopRoomManager.reset()` on logout
 * to satisfy Req 11.7) can depend on the manager without pulling in
 * `<SocketProvider>` and creating an
 * `auth.store → useShopRoom → SocketProvider → auth.store` import cycle.
 *
 * The hook in `@/hooks/useShopRoom.ts` re-exports the symbols from this
 * module so existing call sites and tests are unaffected.
 *
 * Design references:
 *   - design.md §12 "Live_Updates_Channel Design"
 *   - requirements.md 11.2, 11.7
 */

import type { Socket } from "socket.io-client"

/**
 * Build the room name list for a given shop id. Centralized so the leave/join
 * pairs always match in count and naming.
 */
function roomsFor(shopId: string): readonly string[] {
  return [`shop:${shopId}:stock`, `shop:${shopId}:orders`] as const
}

/**
 * `ShopRoomManager` orchestrates `join` / `leave` emits for the active shop.
 *
 * Exposed methods:
 *   - `attachSocket(getSocket)` — register the lazy socket accessor. Safe to
 *     call multiple times; later calls replace the previous accessor. Pages
 *     never call this directly; `useShopRoom()` does.
 *   - `switchTo(shopId)` — leave the previous shop's rooms (if any) and join
 *     the new shop's rooms. No-op when `shopId === currentShopId`. When
 *     `shopId === null`, leave the previous rooms and join nothing.
 *   - `currentRooms()` — read-only view of the joined rooms; used by tests
 *     and the future `<ReconnectingIndicator />`.
 *   - `reset()` — drop all in-memory state without emitting anything. Used
 *     by the logout path to ensure a fresh manager on next login.
 */
export class ShopRoomManager {
  /** Currently joined shop id, or null when no shop is active. */
  private currentShopId: string | null = null

  /**
   * Lazy accessor for the Socket.IO client. The manager never calls
   * `io(...)` itself — `<SocketProvider>` owns the connection lifecycle.
   * The accessor returns `null` while the provider is mounting or while the
   * auth token is missing; callers must tolerate that.
   */
  private getSocket: () => Socket | null = () => null

  /**
   * Register the lazy socket accessor. Replacing the accessor mid-flight
   * (e.g. the provider remounts after a token refresh) is supported: the
   * next `switchTo` will see the new socket transparently.
   */
  attachSocket(getSocket: () => Socket | null): void {
    this.getSocket = getSocket
  }

  /**
   * Re-emit `join` for the current shop's rooms. Called after a socket
   * `connect` event so a reconnect re-establishes the rooms automatically
   * (socket.io does not replay client-side joins across disconnects).
   */
  rejoinCurrent(): void {
    if (this.currentShopId === null) return
    const socket = this.getSocket()
    if (!socket || !socket.connected) return
    for (const room of roomsFor(this.currentShopId)) {
      socket.emit("join", room)
    }
  }

  /**
   * Pivot the joined rooms to a new shop scope.
   *
   *   switchTo("s1") from currentShopId=null  → emit join(s1:stock), join(s1:orders)
   *   switchTo("s2") from currentShopId="s1"  → emit leave(s1:stock), leave(s1:orders), join(s2:stock), join(s2:orders)
   *   switchTo(null) from currentShopId="s1"  → emit leave(s1:stock), leave(s1:orders); join nothing
   *   switchTo("s1") from currentShopId="s1"  → no-op
   *   switchTo(null) from currentShopId=null  → no-op
   *
   * The id update happens regardless of socket availability so a later
   * `connect` listener can re-emit the joins via `rejoinCurrent()`.
   */
  switchTo(shopId: string | null): void {
    if (shopId === this.currentShopId) return

    const socket = this.getSocket()
    const canEmit = !!socket && socket.connected

    if (canEmit && this.currentShopId !== null) {
      for (const room of roomsFor(this.currentShopId)) {
        socket!.emit("leave", room)
      }
    }
    if (canEmit && shopId !== null) {
      for (const room of roomsFor(shopId)) {
        socket!.emit("join", room)
      }
    }

    this.currentShopId = shopId
  }

  /** Read-only view of the joined rooms. Empty when no shop is active. */
  currentRooms(): readonly string[] {
    return this.currentShopId === null ? [] : roomsFor(this.currentShopId)
  }

  /** Drop all in-memory state without emitting anything. */
  reset(): void {
    this.currentShopId = null
  }
}

/**
 * Module-level singleton. Idle until `useShopRoom()` runs in a client
 * component — see `hooks/useShopRoom.ts` for the SSR-safety rationale.
 */
export const shopRoomManager = new ShopRoomManager()
