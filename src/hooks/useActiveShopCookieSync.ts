"use client"

/**
 * useActiveShopCookieSync — mirrors `activeShopId` to a cookie consumed by
 * Next.js middleware to keep SSR pages in sync with the client-side shop scope.
 *
 * The Next.js middleware runs in the Edge runtime before any client code and
 * cannot read `localStorage` or Zustand stores. By mirroring the active shop
 * id into a cookie, the middleware can enforce shop-scoped routing rules
 * (e.g., redirecting vendor users without an active shop to `/select-shop`).
 *
 * This hook subscribes to the Shop_Context_Store and writes the cookie
 * whenever `activeShopId` changes. The cookie is cleared on logout via the
 * auth store's `logout()` method.
 *
 * The cookie name is `active-shop-id` and carries only the UUID string (or
 * empty string when no shop is selected). It is NOT HttpOnly (written via
 * `document.cookie`) and carries no secrets — only the shop id that the JWT
 * already authorizes.
 *
 * Tasks: 18.2
 * Requirements: 1.6, 1.10
 */

import { useEffect } from "react"
import { useShopContextStore } from "@/store/shop-context.store"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Cookie name read by Next.js middleware for shop-scoped SSR routing. */
const ACTIVE_SHOP_COOKIE = "active-shop-id"

/** Cookie lifetime — 20 days, matching auth_session cookie. */
const COOKIE_MAX_AGE_SECONDS = 20 * 24 * 60 * 60

// ─────────────────────────────────────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────────────────────────────────────

function writeActiveShopCookie(shopId: string | null): void {
  if (typeof document === "undefined") return
  try {
    const value = shopId ?? ""
    document.cookie =
      `${ACTIVE_SHOP_COOKIE}=${encodeURIComponent(value)}; path=/; ` +
      `max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`
  } catch {
    // Cookie writes can throw in sandboxed iframes — swallow
  }
}

function clearActiveShopCookie(): void {
  if (typeof document === "undefined") return
  try {
    document.cookie = `${ACTIVE_SHOP_COOKIE}=; path=/; max-age=0; samesite=lax`
  } catch {
    // Defensive
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the Shop_Context_Store and mirrors `activeShopId` to a cookie
 * on every change. Mount this once in the dashboard layout (alongside
 * `<ShopContextHydrator />`).
 *
 * The subscription is set up via `useEffect` + Zustand's `subscribe` so it
 * runs outside the React render cycle and catches store updates from any
 * source (ShopSwitcher, selectShop mutation, hydrate, etc.).
 */
export function useActiveShopCookieSync(): void {
  useEffect(() => {
    // Write the initial value on mount
    const { activeShopId } = useShopContextStore.getState()
    writeActiveShopCookie(activeShopId)

    // Subscribe to future changes
    const unsubscribe = useShopContextStore.subscribe((state, prevState) => {
      if (state.activeShopId !== prevState.activeShopId) {
        writeActiveShopCookie(state.activeShopId)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])
}

/**
 * Standalone function to sync the cookie outside React (e.g., during logout).
 * Clears the active-shop-id cookie.
 */
export function clearActiveShopIdCookie(): void {
  clearActiveShopCookie()
}

/**
 * Component wrapper for the hook — mount in the dashboard layout.
 * Renders nothing; exists purely for the side effect.
 */
export function ActiveShopCookieSync() {
  useActiveShopCookieSync()
  return null
}
