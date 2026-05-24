"use client"

/**
 * `useConnectionStatus` — Socket.IO connection lifecycle as React state.
 *
 * Exposes `{ isConnected, isReconnecting }` so callers can render a
 * non-blocking "Reconnecting…" pill (see `<ReconnectingIndicator />`)
 * without coupling to the underlying socket transport.
 *
 * Listeners attach inside `useEffect` so the hook is SSR-safe: nothing runs
 * during server render. The hook subscribes to the dashboard `SocketProvider`
 * via `useSocket()` so it shares the singleton connection — no extra socket
 * is created.
 *
 * Sibling hook `useConnectionStatus()` exported from `@/hooks/useSocket`
 * returns a string union (`"connected" | "disconnected" | "reconnecting"`)
 * and is used by status indicators that want all three states. This hook
 * intentionally collapses those into the two booleans that the topbar
 * `<ReconnectingIndicator />` needs (Req 11.6, 15.6).
 *
 * Requirements: 11.6, 15.6
 * Design references:
 *   - design.md §12 "Live_Updates_Channel Design" — the
 *     `<ReconnectingIndicator />` reads this hook.
 */

import { useEffect, useState } from "react"

import { useSocket } from "@/components/providers/SocketProvider"

export interface ConnectionStatus {
  /** True after the socket has successfully connected to the server. */
  isConnected: boolean
  /**
   * True while the socket is between connections — either it has dropped and
   * the client is in the middle of a reconnect attempt, or the very first
   * connection has not yet succeeded but the provider has handed us a socket.
   *
   * Mutually exclusive with `isConnected`: when the socket is connected,
   * `isReconnecting` is always `false`.
   */
  isReconnecting: boolean
}

/**
 * Track the live socket connection status.
 *
 * Returns `{ isConnected: false, isReconnecting: false }` when the provider
 * has not yet handed us a socket (e.g. before login) so the indicator stays
 * idle in that case.
 */
export function useConnectionStatus(): ConnectionStatus {
  const socket = useSocket()

  // Seed from the socket's current state so the first render is correct on
  // hot-reload or remount. Defaults to "idle" when there's no socket yet.
  const [status, setStatus] = useState<ConnectionStatus>(() => ({
    isConnected: socket?.connected ?? false,
    isReconnecting: false,
  }))

  useEffect(() => {
    if (!socket) {
      // No socket yet (logged out / before SocketProvider mounts). Reset to
      // idle so the indicator is empty rather than stuck on a stale value.
      setStatus({ isConnected: false, isReconnecting: false })
      return
    }

    // Re-sync on (re)mount: the socket may already be connected by the time
    // this effect runs, e.g. when the indicator mounts after the provider.
    setStatus({
      isConnected: socket.connected,
      isReconnecting: false,
    })

    const onConnect = () =>
      setStatus({ isConnected: true, isReconnecting: false })

    // `disconnect` fires once when the transport drops. Socket.IO will then
    // emit `reconnect_attempt` on `socket.io` (the Manager). We stay in the
    // "reconnecting" state until `connect` fires again.
    const onDisconnect = () =>
      setStatus({ isConnected: false, isReconnecting: true })

    const onReconnectAttempt = () =>
      setStatus({ isConnected: false, isReconnecting: true })

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.io.on("reconnect_attempt", onReconnectAttempt)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.io.off("reconnect_attempt", onReconnectAttempt)
    }
  }, [socket])

  return status
}
