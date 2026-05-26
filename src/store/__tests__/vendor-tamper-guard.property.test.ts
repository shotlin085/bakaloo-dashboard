/**
 * Property-based tests for the vendor tamper guard on the Shop_Context_Store.
 *
 * Feature: multi-vendor-dashboard-ui, Property 5: Vendor cannot mutate
 * Active_Shop_Id.
 *
 * Validates: Requirements 3.7, 1.6.
 *
 * The store's contract for vendors (a user whose `assignedShopIds.length > 0`):
 *   - `setActiveShop(shop, …)` is a no-op when `shop.id` is not in
 *     `assignedShopIds`.
 *   - `setAllShopsMode()` is a no-op for vendors (they can never enter
 *     ALL_SHOPS).
 *
 * Phrasing of the property test (per task 4.8): for every randomized
 * vendor session and every randomized sequence of mutator calls (a mix of
 * in-list and out-of-list shop ids), the following invariants must hold
 * after every step:
 *
 *   1. Whenever `mode === "STORE_MODE"`, the resulting `activeShopId`
 *      is in `assignedShopIds`.
 *   2. `mode` never becomes `"HQ_MODE"` — vendors cannot enter that
 *      mode no matter what they call.
 *   3. If at least one in-list `setActiveShop` call has landed, the
 *      resulting `activeShopId` is non-null. (Before any such call lands,
 *      `activeShopId` may legitimately remain at its initial `null` value.)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fc from "fast-check"

import {
  useShopContextStore,
  type ShopMeta,
} from "@/store/shop-context.store"
import type { ShopRole } from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────────────────────
// localStorage / cookie stubs (mirror the unit test harness so the store's
// persistence side-effects don't bleed across fast-check runs)
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
    clear: vi.fn(() => {
      map.clear()
    }),
    key: vi.fn((i: number) => Array.from(map.keys())[i] ?? null),
    get length() {
      return map.size
    },
  }
}

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

let mockStorage: ReturnType<typeof makeMockStorage>

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

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ROLES: readonly ShopRole[] = [
  "SHOP_ADMIN",
  "SHOP_MANAGER",
  "SHOP_STAFF",
  "SHOP_VIEWER",
]

/** Build a `ShopMeta` for a given id. The other fields are filler — the
 *  tamper guard only inspects `shop.id`. */
function metaFor(id: string): ShopMeta {
  return {
    id,
    name: `Shop ${id.slice(0, 4)}`,
    branchCode: `BR-${id.slice(0, 4).toUpperCase()}`,
    city: "Test City",
    isActive: true,
  }
}

/** UUID-shaped string arbitrary; uniqueness is enforced at the array level. */
const uuidArb = fc.uuid()

/** Vendor's locked set: 1..5 unique uuids. */
const assignedShopIdsArb = fc.uniqueArray(uuidArb, {
  minLength: 1,
  maxLength: 5,
})

/** Out-of-list uuid arbitrary that is guaranteed not to collide with the
 *  vendor's assigned ids. */
function outOfListIdArb(assigned: readonly string[]) {
  return uuidArb.filter((id) => !assigned.includes(id))
}

/**
 * Operation arbitrary: a `setActiveShop` call (with id either in or out
 * of the locked list) or a `setAllShopsMode` call. Roughly 50% in-list
 * vs. 50% out-of-list, plus an `setAllShopsMode` branch with lower
 * weight to keep the operation mix interesting.
 */
type Operation =
  | {
      kind: "setActiveShop"
      shop: ShopMeta
      role: ShopRole
      permissions: string[]
      /** Whether the id is expected to be in `assignedShopIds`. Used by
       *  the assertion harness to know which calls "should land". */
      inList: boolean
    }
  | { kind: "setAllShopsMode" }

function operationArb(assigned: readonly string[]): fc.Arbitrary<Operation> {
  const inListShop = fc
    .constantFrom(...assigned)
    .map((id) => ({ id, inList: true }))
  const outOfListShop = outOfListIdArb(assigned).map((id) => ({
    id,
    inList: false,
  }))

  // 50/50 mix between in-list and out-of-list shop ids for setActiveShop.
  const setActiveShopArb: fc.Arbitrary<Operation> = fc
    .tuple(
      fc.oneof(inListShop, outOfListShop),
      fc.constantFrom(...SHOP_ROLES),
      fc.uniqueArray(
        fc.constantFrom(
          "orders.read",
          "orders.write",
          "shop-products.read",
          "shop-products.write",
          "shop-financials.read",
        ),
        { maxLength: 5 },
      ),
    )
    .map(([{ id, inList }, role, permissions]) => ({
      kind: "setActiveShop" as const,
      shop: metaFor(id),
      role,
      permissions,
      inList,
    }))

  const setAllShopsModeArb: fc.Arbitrary<Operation> = fc.constant({
    kind: "setAllShopsMode" as const,
  })

  // Weight setActiveShop higher than setAllShopsMode so the trace stays
  // dominated by the operation that's most likely to expose a guard bug.
  return fc.oneof(
    { weight: 4, arbitrary: setActiveShopArb },
    { weight: 1, arbitrary: setAllShopsModeArb },
  )
}

const sessionArb = assignedShopIdsArb.chain((assigned) =>
  fc
    .array(operationArb(assigned), { minLength: 1, maxLength: 30 })
    .map((operations) => ({ assigned, operations })),
)

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 5: Vendor cannot mutate Active_Shop_Id", () => {
  it("preserves the tamper-guard invariants across arbitrary mutator sequences", () => {
    fc.assert(
      fc.property(sessionArb, ({ assigned, operations }) => {
        // Reset between fast-check runs so each shrink starts from a clean
        // store. (beforeEach only runs once per `it`.)
        resetStore()
        clearAllCookies()

        const store = useShopContextStore.getState()
        store.setAssignedShopIds(assigned)

        let anyValidActivationLanded = false

        for (const op of operations) {
          if (op.kind === "setActiveShop") {
            useShopContextStore
              .getState()
              .setActiveShop(op.shop, op.role, op.permissions)
            if (op.inList) {
              anyValidActivationLanded = true
            }
          } else {
            useShopContextStore.getState().setAllShopsMode()
          }

          const state = useShopContextStore.getState()

          // (1) Whenever the store is in SINGLE_SHOP mode, the active id
          // must belong to the vendor's locked list.
          if (state.mode === "STORE_MODE") {
            expect(state.activeShopId).not.toBeNull()
            expect(assigned).toContain(state.activeShopId)
          }

          // (2) Vendors must never enter ALL_SHOPS mode regardless of
          // what mutator was called.
          expect(state.mode).not.toBe("HQ_MODE")

          // (3) Once any in-list setActiveShop has landed, activeShopId
          // is non-null for the rest of the trace (subsequent ops can
          // only re-target other in-list ids — out-of-list ids and
          // setAllShopsMode are no-ops for vendors).
          if (anyValidActivationLanded) {
            expect(state.activeShopId).not.toBeNull()
            expect(assigned).toContain(state.activeShopId)
            expect(state.mode).toBe("STORE_MODE")
          }
        }

        // Final post-condition mirrors invariant (3): if at least one
        // valid activation landed, activeShopId is non-null at the end.
        const finalState = useShopContextStore.getState()
        if (anyValidActivationLanded) {
          expect(finalState.activeShopId).not.toBeNull()
          expect(assigned).toContain(finalState.activeShopId)
        }

        // The vendor's locked list must never be silently mutated by
        // any of the calls above.
        expect(finalState.assignedShopIds).toEqual(assigned)
      }),
      { numRuns: 200 },
    )
  })
})
