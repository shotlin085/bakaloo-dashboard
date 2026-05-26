/**
 * Property test for the 401 invariant in the axios response interceptor.
 *
 * Feature: multi-vendor-dashboard-ui, Property 3: 401 invariant
 * Validates: Requirements 1.7
 *
 * Property:
 *   ∀ url ∈ webPath() \ { contains "/auth/me", contains "/auth/login" },
 *   when the response interceptor's rejected handler is invoked with a
 *   synthetic axios error of shape `{ response.status: 401, config.url: url }`,
 *   THEN
 *     • `useAuthStore.getState().isAuthenticated === false`
 *     • `useAuthStore.getState().user === null`
 *     • `useShopContextStore.getState().activeShopId === null`
 *     • `useShopContextStore.getState().mode === "UNSELECTED"`
 *     • The query client's `clear()` is invoked
 *     • `window.location.href` has been assigned `/login`
 *
 * The path matters only for the bypass list: the interceptor short-circuits
 * `/auth/me` and `/auth/login` because those callers handle 401 inline. Every
 * other 401 must trigger the full session reset.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fc from "fast-check"

import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import { getQueryClient } from "@/lib/queryClient"

// Importing the module registers both interceptors on the axios instance.
import api from "@/lib/api"

// ─────────────────────────────────────────────────────────────────────────────
// Pull the rejected handler off the response InterceptorManager. Axios stores
// each handler as `{ fulfilled, rejected, synchronous, runWhen }`; we registered
// exactly one handler in `lib/api.ts`, so index 0 is ours.
// ─────────────────────────────────────────────────────────────────────────────

type RejectedHandler = (error: unknown) => Promise<unknown>

interface InterceptorEntry {
  fulfilled: ((response: unknown) => unknown) | null
  rejected: RejectedHandler | null
}

const responseHandlers = (
  api.interceptors.response as unknown as { handlers: Array<InterceptorEntry | null> }
).handlers

const rejectedEntry = responseHandlers.find(
  (h): h is InterceptorEntry => h !== null && typeof h.rejected === "function",
)
if (!rejectedEntry || !rejectedEntry.rejected) {
  throw new Error("Response interceptor's rejected handler not registered")
}
const onRejected: RejectedHandler = rejectedEntry.rejected

// ─────────────────────────────────────────────────────────────────────────────
// jsdom location stub. Replacing window.location entirely is the canonical
// pattern for capturing href assignments in jsdom — the real Location forbids
// writes from JS in modern jsdom builds.
// ─────────────────────────────────────────────────────────────────────────────

interface LocationStub {
  pathname: string
  href: string
}

let locationStub: LocationStub
let originalLocation: Location

function seedAuthStore(): void {
  useAuthStore.setState({
    // The user shape isn't validated by clearAuth; an opaque object is fine.
    user: {
      id: "u1",
      role: "SHOP_ADMIN",
      email: "u1@example.com",
      name: "User One",
      permissions: [],
    } as unknown as ReturnType<typeof useAuthStore.getState>["user"],
    accessToken: "token-abc",
    isAuthenticated: true,
    isHydrated: true,
  })
}

function seedShopContextStore(): void {
  useShopContextStore.setState({
    activeShopId: "shop-1",
    mode: "STORE_MODE",
    shopRole: "SHOP_ADMIN",
    permissions: ["orders.read", "shop-products.read"],
    shopMeta: {
      id: "shop-1",
      name: "Shop One",
      branchCode: "BC1",
      city: "Pune",
      isActive: true,
    },
    assignedShopIds: [],
    isHydrated: true,
  })
}

beforeEach(() => {
  originalLocation = window.location
  locationStub = { pathname: "/dashboard", href: "" }
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: locationStub,
  })

  // Pre-seed both stores so the test starts from an authenticated, single-shop
  // state. Each property iteration re-seeds for isolation.
  seedAuthStore()
  seedShopContextStore()
})

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
  vi.restoreAllMocks()
})

describe("Property 3: 401 invariant", () => {
  it("clears auth + shop context + query client and navigates to /login for any non-auth url", async () => {
    // The QueryClient is a process-singleton in browser mode; spy on the live
    // instance so we can assert .clear() was called at least once across runs.
    const queryClient = getQueryClient()
    const clearSpy = vi.spyOn(queryClient, "clear")

    // Generator: arbitrary URL paths excluding the auth-route bypass list.
    // `fc.webPath()` produces RFC-3986 path segments starting with `/`.
    const urlArb = fc
      .webPath()
      .filter(
        (u) => !u.includes("/auth/me") && !u.includes("/auth/login"),
      )

    await fc.assert(
      fc.asyncProperty(urlArb, async (url) => {
        // Re-seed per iteration so the previous run's `clearAuth` doesn't
        // leave the stores empty going in — we want to observe the transition
        // every time, not just on the first run.
        seedAuthStore()
        seedShopContextStore()
        locationStub.pathname = "/dashboard"
        locationStub.href = ""

        // Synthetic axios error — only the fields the interceptor reads.
        // `axios.isCancel(error)` returns false for plain objects (no cancel
        // marker symbol), so the cancel-bypass branch is skipped.
        const error = {
          response: {
            status: 401,
            data: {},
            headers: {},
          },
          config: { url },
          isAxiosError: true,
        }

        // The interceptor always re-rejects so the caller's promise chain
        // sees the 401. We assert the rejection and inspect the side effects.
        let propagated = false
        try {
          await onRejected(error)
        } catch {
          propagated = true
        }

        expect(propagated).toBe(true)

        // Auth cleared
        expect(useAuthStore.getState().isAuthenticated).toBe(false)
        expect(useAuthStore.getState().user).toBeNull()
        expect(useAuthStore.getState().accessToken).toBeNull()

        // Shop context cleared
        expect(useShopContextStore.getState().activeShopId).toBeNull()
        expect(useShopContextStore.getState().mode).toBe("UNSELECTED")
        expect(useShopContextStore.getState().shopMeta).toBeNull()
        expect(useShopContextStore.getState().permissions).toEqual([])

        // Navigation issued
        expect(locationStub.href).toBe("/login")
      }),
      { numRuns: 50 },
    )

    // Query client cleared at least once — the singleton is shared across
    // iterations so a single observation across the run is sufficient.
    expect(clearSpy).toHaveBeenCalled()
  })
})
