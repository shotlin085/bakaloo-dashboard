/**
 * Property test for the X-Shop-Id header invariant in the axios request
 * interceptor.
 *
 * Feature: multi-vendor-dashboard-ui, Property 4: X-Shop-Id header invariant
 * Validates: Requirements 3.5, 3.6, 10.1
 *
 * Property:
 *   ∀ url ∈ webPath(), ∀ activeShopId ∈ (uuid | null),
 *   when the request interceptor's fulfilled handler is invoked with a
 *   synthetic axios config of shape `{ url, method: "get", headers: {} }`
 *   AND the Shop_Context_Store is seeded with `{ activeShopId, mode }`,
 *   THEN
 *     • when activeShopId is non-null:
 *         config.headers["X-Shop-Id"] === activeShopId
 *     • when activeShopId is null:
 *         config.headers["X-Shop-Id"] === undefined  (header omitted)
 *
 * Rationale: Requirement 3.6 says the API_Client SHALL include the
 * `X-Shop-Id` header on every outbound `/api/v1/*` request whenever
 * Active_Shop_Id is set. Requirement 3.5 says selecting "All Shops" clears
 * Active_Shop_Id and the API_Client SHALL omit the header on subsequent
 * requests. Requirement 10.1 reiterates the invariant for existing pages.
 *
 * The interceptor side-loads two other reads (`accessToken` and
 * `admin-user` from localStorage) which we stub so the property iteration
 * never short-circuits via the cancel-on-viewer branch and never crashes
 * on missing storage entries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fc from "fast-check"

import { useShopContextStore } from "@/store/shop-context.store"

// Importing the module registers both interceptors on the axios instance.
import api from "@/lib/api"

// ─────────────────────────────────────────────────────────────────────────────
// Pull the fulfilled handler off the request InterceptorManager. Axios stores
// each handler as `{ fulfilled, rejected, synchronous, runWhen }`; we
// registered exactly one request handler in `lib/api.ts`, so the first
// non-null entry is ours.
// ─────────────────────────────────────────────────────────────────────────────

interface SyntheticConfig {
  url: string
  method: string
  headers: Record<string, unknown>
}

type FulfilledHandler = (
  config: SyntheticConfig,
) => SyntheticConfig | Promise<SyntheticConfig>

interface InterceptorEntry {
  fulfilled: FulfilledHandler | null
  rejected: ((error: unknown) => unknown) | null
}

const requestHandlers = (
  api.interceptors.request as unknown as { handlers: Array<InterceptorEntry | null> }
).handlers

const fulfilledEntry = requestHandlers.find(
  (h): h is InterceptorEntry => h !== null && typeof h.fulfilled === "function",
)
if (!fulfilledEntry || !fulfilledEntry.fulfilled) {
  throw new Error("Request interceptor's fulfilled handler not registered")
}
const onFulfilled: FulfilledHandler = fulfilledEntry.fulfilled

// ─────────────────────────────────────────────────────────────────────────────
// localStorage stubs.
//
// The interceptor reads two keys before the X-Shop-Id branch:
//   1. `accessToken` for JWT injection — stub to a fixed string so the read
//      doesn't crash and the Authorization header gets set deterministically.
//   2. `admin-user` for the viewer-mutation guard — stub to a non-viewer user
//      so the cancel-on-viewer branch never fires. (We also use method:"get"
//      below, which skips the guard regardless, but we belt-and-suspender
//      this so changes to the guard's logic don't silently break the
//      property.)
//
// jsdom ships a real Storage; we replace `getItem` with a Map-backed mock
// for tighter control over what each key returns.
// ─────────────────────────────────────────────────────────────────────────────

let getItemSpy: ReturnType<typeof vi.spyOn> | null = null

function stubLocalStorage(): void {
  const store = new Map<string, string>()
  store.set("accessToken", "test-token")
  // A Shop_Admin user — has more than just `*.view` permissions, so the
  // viewer-mutation guard treats it as non-viewer.
  store.set(
    "admin-user",
    JSON.stringify({
      id: "u1",
      role: "SHOP_ADMIN",
      permissions: ["orders.read", "orders.write"],
    }),
  )
  getItemSpy = vi
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation((key: string) => store.get(key) ?? null)
}

beforeEach(() => {
  stubLocalStorage()
})

afterEach(() => {
  getItemSpy?.mockRestore()
  getItemSpy = null
  // Reset the store between tests so a stray activeShopId from one run
  // doesn't bleed into the next.
  useShopContextStore.setState({
    activeShopId: null,
    mode: "UNSELECTED",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [],
    isHydrated: true,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

/** Arbitrary URL path. `fc.webPath()` produces RFC-3986 path segments with `/`. */
const urlArb = fc.webPath()

/**
 * Active shop id arbitrary: either a uuid string (the SINGLE_SHOP case) or
 * `null` (the ALL_SHOPS / UNSELECTED case). `fc.option(..., { nil: null })`
 * yields literal `null`, which is what the store and the interceptor
 * compare against.
 */
const activeShopIdArb: fc.Arbitrary<string | null> = fc.option(fc.uuid(), {
  nil: null,
  freq: 2, // bias: ~one in three runs is null so both branches are well-covered
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 4: X-Shop-Id header invariant", () => {
  it("injects X-Shop-Id iff activeShopId is non-null and omits it otherwise", () => {
    fc.assert(
      fc.property(urlArb, activeShopIdArb, (url, activeShopId) => {
        // Seed the store. Bypass the actions (which apply the vendor
        // tamper guard) by writing state directly — this is the canonical
        // Zustand test pattern and matches how 401-invariant.property.test.ts
        // seeds the store.
        useShopContextStore.setState({
          activeShopId,
          mode: activeShopId ? "STORE_MODE" : "UNSELECTED",
          shopRole: activeShopId ? "SHOP_ADMIN" : null,
          permissions: [],
          shopMeta: activeShopId
            ? {
                id: activeShopId,
                name: "Test Shop",
                branchCode: "TST",
                city: "Pune",
                isActive: true,
              }
            : null,
          assignedShopIds: [],
          isHydrated: true,
        })

        // Synthetic axios config — only the fields the interceptor reads.
        // method: "get" sidesteps the viewer-mutation guard regardless of
        // localStorage contents.
        const config: SyntheticConfig = {
          url,
          method: "get",
          headers: {},
        }

        const result = onFulfilled(config) as SyntheticConfig

        if (activeShopId !== null) {
          // Req 3.6, 10.1: header must be present and equal to activeShopId.
          expect(result.headers["X-Shop-Id"]).toBe(activeShopId)
        } else {
          // Req 3.5: header must be omitted entirely (not "" or null).
          expect(result.headers["X-Shop-Id"]).toBeUndefined()
        }
      }),
      { numRuns: 100 },
    )
  })
})
