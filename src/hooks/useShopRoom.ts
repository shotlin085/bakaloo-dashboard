"use client"

/**
 * `useShopRoom` — page-level hook that wires the `<SocketProvider>` socket
 * into the module-level `shopRoomManager` so Socket.IO room rotation tracks
 * the Shop_Context_Store automatically.
 *
 * The pure manager class and its singleton live in `@/lib/shop-room-manager`
 * so non-React modules (notably `@/store/auth.store`, which must call
 * `shopRoomManager.reset()` on logout for Req 11.7) can depend on them
 * without dragging the React tree in. We re-export those symbols here so
 * existing call sites — `shop-switcher.tsx`, the test suite — keep working
 * without an import-path change.
 *
 * The dashboard subscribes to two rooms per shop on the live-updates channel:
 *   - `shop:{id}:stock`  for stock-out / low-stock events (Req 7.8, 11.3, 11.4)
 *   - `shop:{id}:orders` for new-order events           (Req 11.2, 11.5)
 *
 * Whenever the active shop changes (Super_Admin pivots via the Shop_Switcher,
 * a vendor logs in and the single assigned shop is auto-selected, or anyone
 * logs out and the store is cleared), we must leave the previous shop's two
 * rooms before joining the new shop's two rooms. Doing this ad-hoc per page
 * leaks rooms across navigations; centralizing it in a singleton ensures the
 * rotation is consistent regardless of which surface triggered the change.
 *
 * Design references:
 *   - design.md §12 "Live_Updates_Channel Design"
 *   - requirements.md 11.2, 11.7
 *
 * ── Singleton lifecycle ─────────────────────────────────────────────────────
 *
 * `shopRoomManager` is a module-level singleton, but it is **idle until first
 * use**: nothing in `lib/shop-room-manager.ts` touches `localStorage`, the
 * auth store, or the socket at import time. The wiring to the
 * Shop_Context_Store happens inside `useShopRoom()`, which is mounted from a
 * client component. This keeps SSR safe (Next.js App Router imports modules
 * during render) and makes the manager a pure object until something asks it
 * to do work.
 *
 * The `switchTo(null)` call leaves both prev rooms and joins nothing — this
 * is the logout path and the "All Shops" pivot path.
 *
 * If `switchTo` runs before a socket exists (e.g. the auth token is still
 * being refreshed), the call still updates `currentShopId` so a future
 * `attachSocket()` + reconnect can replay the joins. The actual emit is
 * guarded by a connection check — emits issued while the socket is
 * disconnected are dropped on the floor, matching socket.io-client's default
 * behavior; the next reconnect does not auto-replay them, so we attach a
 * `connect` listener inside `useShopRoom()` to cover that case.
 */

import { useEffect } from "react"

import { useSocket } from "@/components/providers/SocketProvider"
import { useShopContextStore } from "@/store/shop-context.store"
import {
  ShopRoomManager,
  shopRoomManager,
} from "@/lib/shop-room-manager"

// Re-export so existing import paths (`@/hooks/useShopRoom`) continue to work.
export { ShopRoomManager, shopRoomManager }

// ─────────────────────────────────────────────────────────────────────────────
// Store subscription (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-shot subscription to the Shop_Context_Store. The first call wires
 * `setActiveShop` / `setAllShopsMode` / `clear` to `shopRoomManager.switchTo`;
 * subsequent calls are no-ops. We reach for a module-local flag rather than
 * Zustand's built-in idempotence because the store does not deduplicate
 * subscribers — without the flag, every `useShopRoom()` mount would attach a
 * new listener and `switchTo` would be invoked N times per state change.
 */
let storeSubscriptionAttached = false

/**
 * Wire the manager to shop-context state transitions. Called from
 * `useShopRoom()` so the subscription only attaches in the browser.
 *
 * The listener compares `activeShopId` against `prev.activeShopId` so we
 * don't pivot on unrelated state changes (e.g. an `assignedShopIds` update
 * during login). Mode transitions are covered transitively:
 *
 *   - `setActiveShop(s)`     → `activeShopId` changes from old → s.id
 *   - `setAllShopsMode()`    → `activeShopId` changes to null
 *   - `clear()`              → `activeShopId` changes to null
 *   - `setAssignedShopIds()` → `activeShopId` unchanged → ignored
 */
function ensureStoreSubscription(): void {
  if (storeSubscriptionAttached) return
  storeSubscriptionAttached = true

  useShopContextStore.subscribe((state, prev) => {
    if (state.activeShopId === prev.activeShopId) return
    shopRoomManager.switchTo(state.activeShopId)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `useShopRoom` — page-level hook that:
 *   1. Returns the singleton `shopRoomManager` so call sites can call
 *      `switchTo` directly when they have an explicit pivot moment (e.g. the
 *      Shop_Switcher).
 *   2. Ensures the store subscription is active so any `setActiveShop` /
 *      `setAllShopsMode` / `clear` triggers room rotation automatically,
 *      regardless of the call site.
 *   3. Wires the live socket reference into the manager via `attachSocket`
 *      so `switchTo` can emit. Re-runs on socket reference change so a
 *      provider remount (token refresh) re-attaches transparently.
 *   4. Re-emits the current shop's joins after every `connect` event so a
 *      reconnect re-establishes the rooms automatically.
 *
 * Idempotent: mounting the hook from multiple components in the same render
 * tree does not duplicate the store subscription; only the socket attachment
 * effect runs per mount and replaces the accessor in place.
 */
export function useShopRoom(): ShopRoomManager {
  const socket = useSocket()

  useEffect(() => {
    ensureStoreSubscription()
    // Wire the manager's socket accessor to the latest `socket` ref. The
    // accessor closes over `socket` so the next `switchTo` always sees the
    // current connection without needing to re-emit on every render.
    shopRoomManager.attachSocket(() => socket)

    if (!socket) return

    // On (re)connect, re-emit the joins for whatever shop is currently
    // active. This covers the dropped-while-disconnected case mentioned in
    // the file header — emits made while disconnected are silently dropped
    // by socket.io-client, so we replay them once the link comes back up.
    const onConnect = () => shopRoomManager.rejoinCurrent()
    socket.on("connect", onConnect)

    // If the socket is already connected by the time this effect runs (the
    // typical case after the initial `<SocketProvider>` mount finishes its
    // handshake), seed the rooms from the current shop-context snapshot so
    // the page mount itself acts as a `switchTo`.
    if (socket.connected) {
      const { activeShopId } = useShopContextStore.getState()
      shopRoomManager.switchTo(activeShopId)
    }

    return () => {
      socket.off("connect", onConnect)
    }
  }, [socket])

  return shopRoomManager
}

// ─────────────────────────────────────────────────────────────────────────────
// Test hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reset the module-level subscription flag. Exported for tests only —
 * production code never needs to re-subscribe because the store outlives
 * every page navigation in the SPA.
 */
export function __resetShopRoomSubscriptionForTests(): void {
  storeSubscriptionAttached = false
  shopRoomManager.reset()
}
