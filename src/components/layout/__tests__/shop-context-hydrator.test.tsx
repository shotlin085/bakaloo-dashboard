/**
 * Unit tests for `<ShopContextHydrator />`.
 *
 * Validates: Requirements 3.1, 3.2, 4.6 (and the dependent 1.6, 1.10, 3.7
 * behaviors the component preserves).
 *
 * Coverage:
 *   - On mount, calls `useShopContextStore.getState().hydrate()` exactly once
 *     so the persisted snapshot is restored before any page reads scope.
 *   - When the auth `accessToken` reference changes (re-login flow),
 *     `hydrate()` is called again so the store re-reads localStorage.
 *   - For Super_Admin users (role `"SUPER_ADMIN"` or `"ADMIN"`), the
 *     component clears any leftover `assignedShopIds` so the Shop_Switcher
 *     visibility check stays correct.
 *   - For vendor users that carry a `shopAssignments` field, the component
 *     mirrors the ids into `assignedShopIds` so the tamper guard can lock
 *     subsequent shop changes (Req 3.7).
 *   - For vendor users without `shopAssignments`, the component leaves the
 *     persisted set untouched (login dispatcher is the authoritative writer).
 *   - Identical id sets do not trigger a redundant `setAssignedShopIds`
 *     write (avoids unnecessary persistence churn).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"

import { ShopContextHydrator } from "@/components/layout/shop-context-hydrator"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import type { AdminUser } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// localStorage mock — matches the pattern used by the shop-context store tests
// ─────────────────────────────────────────────────────────────────────────────

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
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth-store helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildUser(
  partial: Partial<Omit<AdminUser, "role">> & {
    role?: string
    shopAssignments?: Array<{ id: string }>
  } = {},
): AdminUser {
  // Cast through `unknown` so we can attach the optional `shopAssignments`
  // field and accept shop-role strings (`SHOP_MANAGER`, `SHOP_STAFF`, …) that
  // aren't yet in the public `UserRole` union — the hydrator reads `role`
  // structurally via its internal `AuthProfileWithAssignments` shape, so the
  // tests model the future backend payload without widening `AdminUser`.
  return {
    id: "u1",
    name: "Test User",
    email: "user@example.com",
    phone: "+10",
    role: "SUPER_ADMIN",
    permissions: [],
    ...partial,
  } as unknown as AdminUser
}

function setAuthUser(
  user: AdminUser | null,
  accessToken: string | null = "tok",
) {
  act(() => {
    useAuthStore.setState({
      user,
      accessToken,
      isAuthenticated: user != null,
      isHydrated: true,
    })
  })
}

function resetStores() {
  act(() => {
    useShopContextStore.setState({
      activeShopId: null,
      mode: "UNSELECTED",
      shopRole: null,
      permissions: [],
      shopMeta: null,
      assignedShopIds: [],
      isHydrated: false,
    })
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: true,
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: makeMockStorage(),
    writable: true,
  })
  resetStores()
})

afterEach(() => {
  vi.restoreAllMocks()
  resetStores()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<ShopContextHydrator /> — hydrate on mount", () => {
  it("calls hydrate() once on first render", () => {
    const hydrateSpy = vi.spyOn(useShopContextStore.getState(), "hydrate")

    render(<ShopContextHydrator />)

    expect(hydrateSpy).toHaveBeenCalledTimes(1)
  })

  it("flips the store's isHydrated flag from false to true after mount", () => {
    expect(useShopContextStore.getState().isHydrated).toBe(false)

    render(<ShopContextHydrator />)

    expect(useShopContextStore.getState().isHydrated).toBe(true)
  })
})

describe("<ShopContextHydrator /> — re-hydrate on accessToken change", () => {
  it("calls hydrate() again when the accessToken reference changes", () => {
    setAuthUser(buildUser({ role: "SUPER_ADMIN" }), "tok-1")

    const hydrateSpy = vi.spyOn(useShopContextStore.getState(), "hydrate")

    render(<ShopContextHydrator />)
    // Mount triggers the first call.
    expect(hydrateSpy).toHaveBeenCalledTimes(1)

    // Token swap (e.g. re-login or refresh) — the effect re-runs.
    act(() => {
      useAuthStore.setState({ accessToken: "tok-2" })
    })

    expect(hydrateSpy).toHaveBeenCalledTimes(2)
  })
})

describe("<ShopContextHydrator /> — assignedShopIds sync (Req 3.7, 4.6)", () => {
  it("clears assignedShopIds for a Super_Admin (SUPER_ADMIN role)", () => {
    // Seed a leftover vendor list to verify it gets cleared.
    act(() => {
      useShopContextStore.getState().setAssignedShopIds(["legacy-shop"])
    })
    expect(useShopContextStore.getState().assignedShopIds).toEqual([
      "legacy-shop",
    ])

    setAuthUser(buildUser({ role: "SUPER_ADMIN" }))
    render(<ShopContextHydrator />)

    expect(useShopContextStore.getState().assignedShopIds).toEqual([])
  })

  it("clears assignedShopIds for the legacy ADMIN role too", () => {
    act(() => {
      useShopContextStore.getState().setAssignedShopIds(["legacy-shop"])
    })

    setAuthUser(buildUser({ role: "ADMIN" }))
    render(<ShopContextHydrator />)

    expect(useShopContextStore.getState().assignedShopIds).toEqual([])
  })

  it("mirrors shopAssignments ids into the lock list for vendor users", () => {
    setAuthUser(
      buildUser({
        role: "SHOP_MANAGER",
        shopAssignments: [{ id: "shop-a" }, { id: "shop-b" }],
      }),
    )

    render(<ShopContextHydrator />)

    expect(useShopContextStore.getState().assignedShopIds).toEqual([
      "shop-a",
      "shop-b",
    ])
  })

  it("leaves the persisted lock list untouched when shopAssignments is absent", () => {
    // Seed a list mirrored by the login dispatcher.
    act(() => {
      useShopContextStore
        .getState()
        .setAssignedShopIds(["shop-from-login-dispatcher"])
    })

    setAuthUser(buildUser({ role: "SHOP_STAFF" /* no shopAssignments */ }))
    render(<ShopContextHydrator />)

    expect(useShopContextStore.getState().assignedShopIds).toEqual([
      "shop-from-login-dispatcher",
    ])
  })

  it("does not write when the derived list already matches the store", () => {
    act(() => {
      useShopContextStore.getState().setAssignedShopIds(["shop-a", "shop-b"])
    })

    const setIdsSpy = vi.spyOn(
      useShopContextStore.getState(),
      "setAssignedShopIds",
    )

    setAuthUser(
      buildUser({
        role: "SHOP_MANAGER",
        shopAssignments: [{ id: "shop-a" }, { id: "shop-b" }],
      }),
    )
    render(<ShopContextHydrator />)

    expect(setIdsSpy).not.toHaveBeenCalled()
  })

  it("does not write when no auth user is present", () => {
    const setIdsSpy = vi.spyOn(
      useShopContextStore.getState(),
      "setAssignedShopIds",
    )

    // No `setAuthUser` — user is null.
    render(<ShopContextHydrator />)

    expect(setIdsSpy).not.toHaveBeenCalled()
  })
})

describe("<ShopContextHydrator /> — render output", () => {
  it("renders nothing in the DOM", () => {
    setAuthUser(buildUser({ role: "SUPER_ADMIN" }))

    const { container } = render(<ShopContextHydrator />)

    expect(container).toBeEmptyDOMElement()
  })
})
