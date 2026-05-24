/**
 * Socket disconnect registry — the bridge that lets non-React code (the
 * `useAuthStore.logout()` action and the 401 path in `lib/api.ts`) issue a
 * clean `socket.disconnect()` without importing React or the
 * `<SocketProvider>` directly.
 *
 * Why a registry?
 * ---------------
 * The Socket.IO client lives inside `<SocketProvider>` React state and is
 * recreated whenever the access token changes. The auth store cannot import
 * the provider because that would create an `auth.store → SocketProvider →
 * auth.store` cycle, and we don't want to thread the socket reference
 * through every logout call site either.
 *
 * Instead the provider registers a `disconnect` callback at mount time and
 * unregisters it at unmount. The auth store calls `disconnectSocket()` —
 * which invokes whatever callback is currently registered — right before
 * the redirect to `/login`. The provider's own cleanup effect still runs
 * shortly after when `accessToken` flips to `null`, but by then the close
 * handshake has already been sent so the backend sees the disconnect
 * promptly instead of waiting for a TCP timeout.
 *
 * Validates Requirements: 11.7 (clean socket disconnect on logout).
 */

/**
 * The callback signature is intentionally loose — the provider will pass
 * `socket.disconnect.bind(socket)` so we don't depend on the socket.io
 * surface here.
 */
type DisconnectCallback = () => void

let disconnectCallback: DisconnectCallback | null = null

/**
 * Register a disconnect callback. Called by `<SocketProvider>` when a fresh
 * socket has been created. Replacing the callback while a previous one is
 * registered is supported (the new callback wins) — this matches the
 * provider's effect-driven lifecycle, where a token rotation tears down the
 * old socket and stands up a new one.
 */
export function registerSocketDisconnect(cb: DisconnectCallback): void {
  disconnectCallback = cb
}

/**
 * Unregister the callback. Called by `<SocketProvider>` cleanup. Idempotent:
 * unregistering when no callback is set is a no-op.
 *
 * Only clears the slot when the unregistering callback matches the current
 * one. This avoids a race where a remount registers a new callback before
 * the previous mount's cleanup runs and accidentally clears the new one.
 */
export function unregisterSocketDisconnect(cb: DisconnectCallback): void {
  if (disconnectCallback === cb) {
    disconnectCallback = null
  }
}

/**
 * Disconnect the active socket if one is registered. Safe to call when no
 * socket is currently open (e.g. logout was triggered before login finished
 * its handshake) — the call is a silent no-op in that case.
 *
 * The callback is invoked inside a `try/catch` so a misbehaving disconnect
 * never blocks the surrounding logout flow; we always want the auth state
 * cleared and the redirect to fire even if the socket throws.
 */
export function disconnectSocket(): void {
  const cb = disconnectCallback
  if (!cb) return
  try {
    cb()
  } catch {
    // Defensive: never throw out of disconnectSocket.
  }
}

/**
 * Test hook: clear the registry so a fresh test starts from a clean slate.
 * Production code never needs this because the registry survives every page
 * navigation in the SPA.
 */
export function __resetSocketRegistryForTests(): void {
  disconnectCallback = null
}
