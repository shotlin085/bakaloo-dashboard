/**
 * Unit tests for the Shop_Context_Store.
 *
 * Covers state transitions, persistence, the vendor tamper guard,
 * graceful recovery from a corrupted localStorage snapshot, and the
 * middleware mirror cookie that `src/middleware.ts` reads.
 *
 * Validates: Requirements 1.6, 1.10, 3.4, 3.5, 3.7.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  useShopContextStore,
  type ShopMeta,
  type ShopContextSnapshot,
} from "@/store/shop-context.store"

const STORAGE_KEY = "shop-context"
const MIDDLEWARE_COOKIE = "shop-context-mw"

const META_A: ShopMeta = {
  id: "shop-a",
  name: "Shop A",
  branchCode: "BR-A",
  city: "Mumbai",
  isActive: true,
}

const META_B: ShopMeta = {
  id: "shop-b",
  name: "Shop B",
  branchCode: "BR-B",
  city: "Pune",
  isActive: true,
}

const META_C: ShopMeta = {
  id: "shop-c",
  name: "Shop C",
  branchCode: "BR-C",
  city: "Delhi",
  isActive: true,
}

/** Minimal in-memory localStorage stub the store can use in jsdom. */
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
    clear: vi.fn(() => {
      map.clear()
    }),
    key: vi.fn((i: number) => Array.from(map.keys())[i] ?? null),
    get length() {
      return map.size
    },
    // expose the backing map so tests can assert / seed contents
    __map: map,
  }
}

let mockStorage: ReturnType<typeof makeMockStorage>

/**
 * Extract the value of `name` from the current `document.cookie` string.
 * Returns `null` when the cookie is absent or has been expired (`max-age=0`).
 */
function readCookie(name: string): string | null {
  const all = document.cookie
  if (!all) return null
  const parts = all.split(/;\s*/)
  for (const part of parts) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    const k = part.slice(0, eq)
    if (k === name) {
      const v = part.slice(eq + 1)
      return v === "" ? null : v
    }
  }
  return null
}

/**
 * Reset `document.cookie` between tests. jsdom does not expose a `clear`,
 * so we read each cookie name and overwrite it with a `max-age=0` entry.
 */
function clearAllCookies() {
  if (typeof document === "undefined") return
  const all = document.cookie
  if (!all) return
  for (const part of all.split(/;\s*/)) {
    const eq = part.indexOf("=")
    const name = eq === -1 ? part : part.slice(0, eq)
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`
    }
  }
}

function resetStore() {
  // Reset the live store back to a clean unhydrated state without going
  // through `clear()` (which would also touch storage).
  useShopContextStore.setState({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [],
    isHydrated: false,
  })
}

beforeEach(() => {
  mockStorage = makeMockStorage()
  vi.stubGlobal("localStorage", mockStorage)
  clearAllCookies()
  resetStore()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearAllCookies()
})

describe("setActiveShop — super admin", () => {
  it("sets SINGLE_SHOP mode and persists the snapshot", () => {
    const { setActiveShop } = useShopContextStore.getState()
    setActiveShop(META_A, "SHOP_ADMIN", ["orders.read"])

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBe("shop-a")
    expect(state.mode).toBe("SINGLE_SHOP")
    expect(state.shopRole).toBe("SHOP_ADMIN")
    expect(state.permissions).toEqual(["orders.read"])
    expect(state.shopMeta).toEqual(META_A)
    expect(state.isHydrated).toBe(true)

    // Persisted to localStorage
    const raw = mockStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw as string) as ShopContextSnapshot
    expect(persisted.activeShopId).toBe("shop-a")
    expect(persisted.mode).toBe("SINGLE_SHOP")
  })
})

describe("setAllShopsMode — super admin", () => {
  it("clears active shop and persists ALL_SHOPS mode", () => {
    const { setActiveShop, setAllShopsMode } = useShopContextStore.getState()
    setActiveShop(META_A, "SHOP_ADMIN", ["orders.read"])
    setAllShopsMode()

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBeNull()
    expect(state.mode).toBe("ALL_SHOPS")
    expect(state.shopMeta).toBeNull()
    expect(state.permissions).toEqual([])

    const persisted = JSON.parse(
      mockStorage.getItem(STORAGE_KEY) as string,
    ) as ShopContextSnapshot
    expect(persisted.mode).toBe("ALL_SHOPS")
  })
})

describe("vendor tamper guard", () => {
  it("setActiveShop is a no-op for an out-of-list shop id", () => {
    const { setAssignedShopIds, setActiveShop } =
      useShopContextStore.getState()
    setAssignedShopIds(["shop-a", "shop-b"])

    setActiveShop(META_C, "SHOP_VIEWER", ["orders.read"])

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBeNull()
    expect(state.mode).toBe("UNSELECTED")
    expect(state.shopMeta).toBeNull()
  })

  it("setActiveShop succeeds for an in-list shop id", () => {
    const { setAssignedShopIds, setActiveShop } =
      useShopContextStore.getState()
    setAssignedShopIds(["shop-a", "shop-b"])

    setActiveShop(META_B, "SHOP_VIEWER", ["orders.read"])

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBe("shop-b")
    expect(state.mode).toBe("SINGLE_SHOP")
  })

  it("setAllShopsMode is a no-op for vendors", () => {
    const { setAssignedShopIds, setActiveShop, setAllShopsMode } =
      useShopContextStore.getState()
    setAssignedShopIds(["shop-a"])
    setActiveShop(META_A, "SHOP_VIEWER", [])

    setAllShopsMode()

    const state = useShopContextStore.getState()
    expect(state.mode).toBe("SINGLE_SHOP")
    expect(state.activeShopId).toBe("shop-a")
  })
})

describe("setAssignedShopIds", () => {
  it("updates the locked id list and persists alongside the rest of the snapshot", () => {
    const { setAssignedShopIds } = useShopContextStore.getState()
    setAssignedShopIds(["shop-a", "shop-b"])

    expect(useShopContextStore.getState().assignedShopIds).toEqual([
      "shop-a",
      "shop-b",
    ])
    const persisted = JSON.parse(
      mockStorage.getItem(STORAGE_KEY) as string,
    ) as ShopContextSnapshot
    expect(persisted.assignedShopIds).toEqual(["shop-a", "shop-b"])
  })
})

describe("clear", () => {
  it("resets state to UNSELECTED and removes the persisted snapshot", () => {
    const { setActiveShop, clear } = useShopContextStore.getState()
    setActiveShop(META_A, "SHOP_ADMIN", ["orders.read"])

    clear()

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBeNull()
    expect(state.mode).toBe("UNSELECTED")
    expect(state.permissions).toEqual([])
    expect(state.shopMeta).toBeNull()
    expect(state.assignedShopIds).toEqual([])

    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe("hydrate", () => {
  it("restores a previously persisted snapshot", () => {
    const persisted: ShopContextSnapshot = {
      activeShopId: "shop-a",
      mode: "SINGLE_SHOP",
      shopRole: "SHOP_ADMIN",
      permissions: ["orders.read", "shop-products.read"],
      shopMeta: META_A,
      assignedShopIds: ["shop-a", "shop-b"],
    }
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    useShopContextStore.getState().hydrate()

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBe("shop-a")
    expect(state.mode).toBe("SINGLE_SHOP")
    expect(state.shopRole).toBe("SHOP_ADMIN")
    expect(state.permissions).toEqual(["orders.read", "shop-products.read"])
    expect(state.shopMeta).toEqual(META_A)
    expect(state.assignedShopIds).toEqual(["shop-a", "shop-b"])
    expect(state.isHydrated).toBe(true)
  })

  it("recovers gracefully from a corrupt JSON snapshot", () => {
    mockStorage.setItem(STORAGE_KEY, "{not-valid-json")

    expect(() => useShopContextStore.getState().hydrate()).not.toThrow()

    const state = useShopContextStore.getState()
    expect(state.activeShopId).toBeNull()
    expect(state.mode).toBe("UNSELECTED")
    expect(state.isHydrated).toBe(true)
    // Corrupt entry was removed so the next write starts clean.
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  it("marks the store hydrated when no snapshot exists", () => {
    useShopContextStore.getState().hydrate()
    const state = useShopContextStore.getState()
    expect(state.isHydrated).toBe(true)
    expect(state.mode).toBe("UNSELECTED")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Middleware mirror cookie (Req 1.6)
// ─────────────────────────────────────────────────────────────────────────────

describe("middleware mirror cookie (shop-context-mw)", () => {
  it("setActiveShop mirrors activeShopId + assignedShopIds into the cookie", () => {
    const { setAssignedShopIds, setActiveShop } =
      useShopContextStore.getState()
    setAssignedShopIds(["shop-a", "shop-b"])
    setActiveShop(META_A, "SHOP_ADMIN", ["orders.read"])

    const raw = readCookie(MIDDLEWARE_COOKIE)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(decodeURIComponent(raw as string))
    expect(payload.activeShopId).toBe("shop-a")
    expect(payload.assignedShopIds).toEqual(["shop-a", "shop-b"])
  })

  it("setAllShopsMode writes a cookie with activeShopId=null and empty assignments", () => {
    useShopContextStore.getState().setAllShopsMode()

    const raw = readCookie(MIDDLEWARE_COOKIE)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(decodeURIComponent(raw as string))
    expect(payload.activeShopId).toBeNull()
    expect(payload.assignedShopIds).toEqual([])
  })

  it("setAssignedShopIds persists the locked id list into the cookie", () => {
    useShopContextStore.getState().setAssignedShopIds(["shop-a", "shop-b"])

    const raw = readCookie(MIDDLEWARE_COOKIE)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(decodeURIComponent(raw as string))
    expect(payload.activeShopId).toBeNull()
    expect(payload.assignedShopIds).toEqual(["shop-a", "shop-b"])
  })

  it("clear() removes the middleware cookie", () => {
    const { setActiveShop, clear } = useShopContextStore.getState()
    setActiveShop(META_A, "SHOP_ADMIN", [])
    expect(readCookie(MIDDLEWARE_COOKIE)).not.toBeNull()

    clear()

    expect(readCookie(MIDDLEWARE_COOKIE)).toBeNull()
  })

  it("hydrate() re-mirrors the cookie when localStorage has a snapshot", () => {
    const persisted: ShopContextSnapshot = {
      activeShopId: "shop-a",
      mode: "SINGLE_SHOP",
      shopRole: "SHOP_ADMIN",
      permissions: ["orders.read"],
      shopMeta: META_A,
      assignedShopIds: ["shop-a", "shop-b"],
    }
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    // Cookie starts empty; hydrate must restore it for middleware.
    expect(readCookie(MIDDLEWARE_COOKIE)).toBeNull()

    useShopContextStore.getState().hydrate()

    const raw = readCookie(MIDDLEWARE_COOKIE)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(decodeURIComponent(raw as string))
    expect(payload.activeShopId).toBe("shop-a")
    expect(payload.assignedShopIds).toEqual(["shop-a", "shop-b"])
  })

  it("does not write a cookie that contains permissions or shopMeta", () => {
    useShopContextStore
      .getState()
      .setActiveShop(META_A, "SHOP_ADMIN", ["orders.read", "shop-products.write"])

    const raw = readCookie(MIDDLEWARE_COOKIE)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(decodeURIComponent(raw as string)) as Record<
      string,
      unknown
    >
    // The cookie is non-HttpOnly, so we deliberately keep its surface narrow.
    expect(payload).not.toHaveProperty("permissions")
    expect(payload).not.toHaveProperty("shopMeta")
    expect(payload).not.toHaveProperty("shopRole")
  })

  it("vendor tamper-guard no-op does not produce a cookie write", () => {
    const { setAssignedShopIds, setActiveShop } =
      useShopContextStore.getState()
    setAssignedShopIds(["shop-a"]) // vendor with one assigned shop

    // Reset the cookie set by setAssignedShopIds so we can isolate
    // the next call's effect.
    clearAllCookies()
    expect(readCookie(MIDDLEWARE_COOKIE)).toBeNull()

    // Out-of-list shop id: setActiveShop must short-circuit and skip the
    // cookie write so middleware never sees a forbidden activeShopId.
    setActiveShop(META_C, "SHOP_VIEWER", [])

    expect(readCookie(MIDDLEWARE_COOKIE)).toBeNull()
  })
})
