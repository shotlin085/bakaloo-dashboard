/**
 * Shop_Context_Store — Zustand store holding the active shop scope.
 *
 * This is the single source of truth for `Active_Shop_Id` and feeds three
 * shared mechanisms across the dashboard:
 *   1. The axios request interceptor (injects `X-Shop-Id`).
 *   2. The TanStack Query key factory (keys every shop-scoped query by shop).
 *   3. The Socket.IO room manager (joins/leaves `shop:{id}:*` rooms).
 *
 * Persistence is hand-rolled against `localStorage` under the key
 * `"shop-context"`, matching the pattern already used by `auth.store.ts`. We
 * deliberately avoid `zustand/middleware/persist` to keep the bundle slim and
 * the recovery path explicit.
 *
 * Design references:
 *   - design.md §1 "Shop_Context_Store (Zustand)"
 *   - requirements.md 1.6, 1.10, 3.4, 3.5, 3.7
 */

import { create } from "zustand"
import type { ShopRole } from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Mode of the dashboard shop scope. */
export type ShopMode = "ALL_SHOPS" | "SINGLE_SHOP" | "UNSELECTED"

/**
 * Embedded shop summary persisted in the store. Only the fields needed by the
 * topbar, switcher, and scope badge live here — full shop records are read
 * through `useShop(id)`.
 */
export interface ShopMeta {
  id: string
  name: string
  branchCode: string
  city: string
  isActive: boolean
}

/**
 * Snapshot serialized to `localStorage`. Keep this in sync with the persisted
 * shape so a reload restores the exact same scope (Req 1.10, 3.4).
 */
export interface ShopContextSnapshot {
  activeShopId: string | null
  mode: ShopMode
  shopRole: ShopRole | null
  /**
   * Permission_Token list from `/auth/select-shop`. Typed as `string[]` to
   * match the JWT shape and avoid coupling the store to the
   * `PermissionToken` union — pages perform their own narrowing at the
   * RBAC boundary.
   */
  permissions: string[]
  shopMeta: ShopMeta | null
  /**
   * For Vendor users, the locked set of shop ids they can access.
   * Empty array signals a Super_Admin (no tamper guard applies).
   */
  assignedShopIds: string[]
}

interface ShopContextState extends ShopContextSnapshot {
  /** True once `hydrate()` has run; pages gate render on this to avoid SSR/CSR drift. */
  isHydrated: boolean

  /** Set a single-shop scope. No-op for vendors when `shop.id` is outside `assignedShopIds`. */
  setActiveShop: (
    shop: ShopMeta,
    role: ShopRole,
    permissions: string[],
  ) => void

  /** Switch to All Shops (Super_Admin only). No-op for vendors. */
  setAllShopsMode: () => void

  /** Update the locked vendor shop list. Called once after login from the auth profile. */
  setAssignedShopIds: (ids: string[]) => void

  /** Reset to UNSELECTED and remove the persisted snapshot. */
  clear: () => void

  /** Restore the snapshot from `localStorage`. Recovers gracefully on parse failure. */
  hydrate: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers — every localStorage call wrapped in try/catch
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "shop-context"

/**
 * Cookie name read by `src/middleware.ts` to enforce vendor routing rules
 * (Req 1.6). The Next.js middleware runs before any client code and cannot
 * read `localStorage`, so we mirror the minimum slice of state it needs
 * (`activeShopId` + `assignedShopIds`) into this cookie on every write.
 *
 * The cookie is intentionally NOT `HttpOnly` because the writer is
 * `document.cookie` (the browser disallows setting HttpOnly from JS); the
 * trade-off is acceptable here because the cookie carries no secrets — only
 * the active and assigned shop ids that the JWT already authorizes.
 */
const MIDDLEWARE_COOKIE = "shop-context-mw"

/**
 * Lifetime of the middleware mirror cookie. Mirrors the 20-day lifetime used
 * by `auth.store.ts` for `auth_session` so the two cookies expire together.
 */
const MIDDLEWARE_COOKIE_MAX_AGE_SECONDS = 20 * 24 * 60 * 60

/** Initial snapshot used by `clear()` and as the store's default state. */
const EMPTY_SNAPSHOT: ShopContextSnapshot = {
  activeShopId: null,
  mode: "UNSELECTED",
  shopRole: null,
  permissions: [],
  shopMeta: null,
  assignedShopIds: [],
}

/**
 * Slice of the snapshot mirrored into the middleware cookie. Keeping this
 * type narrow ensures we never leak `permissions` or `shopMeta` into a
 * non-HttpOnly cookie.
 */
interface MiddlewareCookiePayload {
  activeShopId: string | null
  assignedShopIds: string[]
}

/** Mirror the middleware-relevant slice of the snapshot into a cookie. */
function writeMiddlewareCookie(snap: ShopContextSnapshot): void {
  if (typeof document === "undefined") return
  const payload: MiddlewareCookiePayload = {
    activeShopId: snap.activeShopId,
    assignedShopIds: snap.assignedShopIds,
  }
  try {
    const value = encodeURIComponent(JSON.stringify(payload))
    document.cookie =
      `${MIDDLEWARE_COOKIE}=${value}; path=/; ` +
      `max-age=${MIDDLEWARE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
  } catch {
    // Cookie writes can throw in obscure environments (e.g. sandboxed
    // iframes) — swallow so the in-memory state stays consistent.
  }
}

/** Remove the middleware mirror cookie. */
function clearMiddlewareCookie(): void {
  if (typeof document === "undefined") return
  try {
    document.cookie = `${MIDDLEWARE_COOKIE}=; path=/; max-age=0; samesite=lax`
  } catch {
    // ignore
  }
}

/** Persist a snapshot. Failures (quota, disabled storage) are swallowed. */
function writeSnapshot(snap: ShopContextSnapshot): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // Storage may be full, disabled, or in private mode — fall through.
  }
  // Always mirror to the cookie too so middleware sees the latest scope
  // even when localStorage is unavailable (private mode falls back to the
  // cookie alone, which middleware can still read).
  writeMiddlewareCookie(snap)
}

/** Remove the persisted snapshot. Failures are swallowed. */
function clearSnapshot(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  clearMiddlewareCookie()
}

/**
 * Read and parse the persisted snapshot.
 * Returns `null` when there is no snapshot, when storage access throws, or
 * when the stored JSON is malformed. On parse failure the corrupt entry is
 * removed so the next write starts from a clean slate.
 */
function readSnapshot(): ShopContextSnapshot | null {
  if (typeof window === "undefined") return null
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    return JSON.parse(raw) as ShopContextSnapshot
  } catch {
    clearSnapshot()
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useShopContextStore = create<ShopContextState>((set, get) => ({
  ...EMPTY_SNAPSHOT,
  isHydrated: false,

  setActiveShop: (shop, role, permissions) => {
    // Vendor tamper guard (Req 3.7, 1.6): when `assignedShopIds` is non-empty
    // (i.e. the user is a vendor), reject any attempt to activate a shop that
    // is not in the locked list. Super_Admins keep an empty `assignedShopIds`,
    // so the guard is skipped for them.
    const { assignedShopIds } = get()
    if (assignedShopIds.length > 0 && !assignedShopIds.includes(shop.id)) {
      return
    }

    const snap: ShopContextSnapshot = {
      activeShopId: shop.id,
      mode: "SINGLE_SHOP",
      shopRole: role,
      permissions,
      shopMeta: shop,
      assignedShopIds,
    }
    writeSnapshot(snap)
    set({ ...snap, isHydrated: true })
  },

  setAllShopsMode: () => {
    // Vendor tamper guard (Req 3.7): vendors cannot enter ALL_SHOPS mode.
    const { assignedShopIds } = get()
    if (assignedShopIds.length > 0) return

    const snap: ShopContextSnapshot = {
      activeShopId: null,
      mode: "ALL_SHOPS",
      shopRole: null,
      permissions: [],
      shopMeta: null,
      assignedShopIds: [],
    }
    writeSnapshot(snap)
    set({ ...snap, isHydrated: true })
  },

  setAssignedShopIds: (ids) => {
    // Persist alongside the rest of the snapshot so a reload retains the
    // tamper-guard set even before the next shop selection (Req 1.10).
    const current = get()
    const snap: ShopContextSnapshot = {
      activeShopId: current.activeShopId,
      mode: current.mode,
      shopRole: current.shopRole,
      permissions: current.permissions,
      shopMeta: current.shopMeta,
      assignedShopIds: ids,
    }
    writeSnapshot(snap)
    set({ assignedShopIds: ids })
  },

  clear: () => {
    clearSnapshot()
    set({ ...EMPTY_SNAPSHOT, isHydrated: true })
  },

  hydrate: () => {
    const snap = readSnapshot()
    if (snap) {
      // Re-mirror the cookie so the middleware sees the active shop scope
      // even if the cookie expired before localStorage did, or if the user
      // visited the dashboard from a fresh browser tab. (Req 1.6, 1.10)
      writeMiddlewareCookie(snap)
      set({ ...snap, isHydrated: true })
    } else {
      set({ isHydrated: true })
    }
  },
}))
