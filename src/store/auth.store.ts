import { create } from "zustand"
import type { AdminUser } from "@/types"
import { useShopContextStore } from "@/store/shop-context.store"
import { getQueryClient } from "@/lib/queryClient"
import { disconnectSocket } from "@/lib/socket-registry"
import { shopRoomManager } from "@/lib/shop-room-manager"

const TWENTY_DAYS_SECONDS = 20 * 24 * 60 * 60 // 1,728,000

/**
 * Cookie name read by `src/middleware.ts` to identify Super_Admin users.
 *
 * The Next.js middleware runs before any client code and cannot read
 * `localStorage` or the JWT body, so we mirror the role decision into a
 * lightweight cookie. The cookie carries no secrets — only the boolean
 * `"1"` / `"0"` flag derived from the user's role — so it is safe to set
 * via `document.cookie` (browsers disallow `HttpOnly` from JS anyway).
 *
 * Treated as advisory by middleware: a malicious client could forge it,
 * but the API still re-checks the JWT on every request, so the worst case
 * is a redirect mismatch on the client.
 */
const SUPER_ADMIN_COOKIE = "is-super-admin"

/**
 * Roles treated as Super_Admin in the dashboard. Mirrors the whitelist used
 * by `services/auth.service.ts` so the cookie agrees with the login response.
 */
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"])

function writeSuperAdminCookie(isSuperAdmin: boolean): void {
  if (typeof document === "undefined") return
  try {
    document.cookie =
      `${SUPER_ADMIN_COOKIE}=${isSuperAdmin ? "1" : "0"}; path=/; ` +
      `max-age=${TWENTY_DAYS_SECONDS}; samesite=lax`
  } catch {
    // ignore — cookie writes can throw in sandboxed iframes
  }
}

function clearSuperAdminCookie(): void {
  if (typeof document === "undefined") return
  try {
    document.cookie = `${SUPER_ADMIN_COOKIE}=; path=/; max-age=0; samesite=lax`
  } catch {
    // ignore
  }
}

interface AuthState {
  user: AdminUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (user: AdminUser, token: string) => void
  logout: () => void
  hydrate: () => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  login: (user, token) => {
    localStorage.setItem("accessToken", token)
    localStorage.setItem("admin-user", JSON.stringify(user))
    // Set marker cookie for Next.js middleware — 20 days
    document.cookie = `auth_session=1; path=/; max-age=${TWENTY_DAYS_SECONDS}; samesite=lax`
    // Mirror the super-admin flag so middleware can short-circuit shop
    // routing rules without parsing the JWT (Req 1.6, 3.1).
    writeSuperAdminCookie(SUPER_ADMIN_ROLES.has(user.role))
    set({ user, accessToken: token, isAuthenticated: true, isHydrated: true })
  },

  logout: () => {
    // Call backend logout to clear httpOnly cookies (fire-and-forget)
    const token = localStorage.getItem("accessToken")
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin-user")
    // Clear auth cookies
    document.cookie = "auth_session=; path=/; max-age=0"
    document.cookie = "accessToken=; path=/; max-age=0"
    clearSuperAdminCookie()
    // Clear the Shop_Context_Store snapshot — keeping it would leak the
    // previous session's active shop into the next user's localStorage
    // until the next setActiveShop call (Req 1.9).
    try {
      useShopContextStore.getState().clear()
    } catch {
      // Defensive: never block logout on a store-level failure.
    }
    // Drop every TanStack Query cache entry so a re-login starts from a
    // clean slate (mirrors the 401 path in `lib/api.ts`).
    try {
      getQueryClient().clear()
    } catch {
      // clear() is safe on a fresh client; swallow and continue.
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true })
    // Send the WebSocket close handshake **before** the navigation so the
    // backend sees the disconnect promptly instead of waiting for a TCP
    // timeout. The `<SocketProvider>` cleanup effect also runs once
    // `accessToken` flips to `null`, but it fires after the browser has
    // already torn down the page, which delays the close packet. Calling
    // `disconnectSocket()` here is idempotent: if no socket is registered
    // (e.g. the user logged out before the provider finished its initial
    // handshake), the call is a silent no-op. Req 11.7.
    disconnectSocket()
    // Reset the room manager so the next session starts with no joined
    // rooms; otherwise a leftover `currentShopId` would cause the next
    // user's first `connect` to re-join the previous user's shop rooms.
    shopRoomManager.reset()
    window.location.href = "/login"
  },

  // Silently clear auth state without redirect (used when /me fails)
  clearAuth: () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin-user")
    document.cookie = "auth_session=; path=/; max-age=0"
    document.cookie = "accessToken=; path=/; max-age=0"
    clearSuperAdminCookie()
    // Drop the persisted shop scope alongside auth so a stale token never
    // carries an active shop forward into the next session.
    try {
      useShopContextStore.getState().clear()
    } catch {
      // Defensive: never throw out of clearAuth.
    }
    // Tear down the live-updates channel so a subsequent re-login spins up
    // a fresh socket with the new token instead of the old socket lingering
    // with the stale credential. Both calls are idempotent. Req 11.7.
    disconnectSocket()
    shopRoomManager.reset()
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true })
  },

  hydrate: () => {
    if (typeof window === "undefined") return
    const token = localStorage.getItem("accessToken")
    const userStr = localStorage.getItem("admin-user")
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AdminUser
        // Re-mirror the super-admin cookie on hydrate so the middleware
        // remains in sync after a full page reload (Req 1.6, 1.10).
        writeSuperAdminCookie(SUPER_ADMIN_ROLES.has(user.role))
        set({ user, accessToken: token, isAuthenticated: true, isHydrated: true })
      } catch {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("admin-user")
        clearSuperAdminCookie()
        set({ isHydrated: true })
      }
    } else {
      set({ isHydrated: true })
    }
  },
}))
