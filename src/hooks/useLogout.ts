"use client"

/**
 * useLogout — comprehensive logout handler that clears all session state.
 *
 * Performs the following cleanup in order:
 *   1. Clears the auth store (user, accessToken, isAuthenticated)
 *   2. Clears the activeShopId and mode from Shop_Context_Store
 *   3. Clears all TanStack Query caches
 *   4. Clears auth-related cookies (auth_session, is-super-admin, shop-context-mw)
 *   5. Clears localStorage entries (accessToken, admin-user, shop-context)
 *   6. Disconnects the Socket.IO connection
 *   7. Navigates to `/login`
 *
 * The existing `auth.store.ts` `logout()` method already performs most of
 * these steps. This hook provides a React-friendly wrapper that can be used
 * in components and also exposes the logout as a stable callback reference.
 *
 * Tasks: 18.1
 * Requirements: 1.9
 */

import { useCallback } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import { getQueryClient } from "@/lib/queryClient"
import { disconnectSocket } from "@/lib/socket-registry"
import { shopRoomManager } from "@/lib/shop-room-manager"

/**
 * Returns a stable logout callback that performs full session cleanup.
 *
 * This hook wraps the auth store's `logout()` which handles:
 *   - Backend logout API call (fire-and-forget)
 *   - localStorage cleanup (accessToken, admin-user)
 *   - Cookie cleanup (auth_session, accessToken, is-super-admin)
 *   - Shop_Context_Store clear
 *   - TanStack Query cache clear
 *   - Socket.IO disconnect
 *   - Shop room manager reset
 *   - Navigation to /login via window.location.href
 *
 * Use this instead of calling `useAuthStore.logout()` directly when you need
 * a stable callback reference in a React component.
 */
export function useLogout() {
  const logout = useCallback(() => {
    useAuthStore.getState().logout()
  }, [])

  return { logout }
}

/**
 * Programmatic logout for use outside React components (e.g., axios
 * interceptors, service workers). Performs the same cleanup as the hook
 * but without React hooks.
 *
 * This is the function to call from the 401 interceptor in `lib/api.ts`.
 */
export function performLogout(): void {
  // Clear TanStack Query cache
  try {
    getQueryClient().clear()
  } catch {
    // Swallow — may not be available in all contexts
  }

  // Clear shop context
  try {
    useShopContextStore.getState().clear()
  } catch {
    // Defensive
  }

  // Disconnect socket
  try {
    disconnectSocket()
    shopRoomManager.reset()
  } catch {
    // Defensive
  }

  // Clear localStorage
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin-user")
    localStorage.removeItem("shop-context")
  } catch {
    // Defensive — storage may be unavailable
  }

  // Clear cookies
  if (typeof document !== "undefined") {
    try {
      document.cookie = "auth_session=; path=/; max-age=0; samesite=lax"
      document.cookie = "accessToken=; path=/; max-age=0; samesite=lax"
      document.cookie = "is-super-admin=; path=/; max-age=0; samesite=lax"
      document.cookie = "shop-context-mw=; path=/; max-age=0; samesite=lax"
    } catch {
      // Defensive
    }
  }

  // Clear auth store state
  try {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: true,
    })
  } catch {
    // Defensive
  }

  // Navigate to login
  window.location.href = "/login"
}
