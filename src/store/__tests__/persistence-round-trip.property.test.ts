/**
 * Property test for auth + shop persistence round-trip.
 *
 * Feature: multi-vendor-dashboard-ui, Property 2: Auth + shop persistence round-trip
 * Validates: Requirements 1.10, 3.4
 *
 * Property:
 *   ∀ valid (AuthSnapshot, ShopContextSnapshot) produced by a successful
 *   login + select-shop sequence,
 *   IF we apply the snapshot to the auth store and shop-context store
 *   (which persists to localStorage),
 *   AND we then reset the in-memory stores and call `hydrate()` on each,
 *   THEN the rehydrated pair is deeply equal to the input pair.
 *
 * Generation strategy:
 *   - AuthSnapshot is `{ token, user }` where `user` is an `AdminUser`.
 *   - ShopContextSnapshot is one of three valid shapes via `fc.oneof`:
 *       1. ALL_SHOPS    — super admin: every field except `mode` empty.
 *       2. SINGLE_SHOP  — `activeShopId === shopMeta.id`; either super
 *                         admin (empty `assignedShopIds`) or vendor
 *                         (`assignedShopIds` includes `activeShopId`).
 *       3. UNSELECTED   — post-login, pre-select-shop: every field empty.
 *
 * The round-trip is exercised end-to-end against the real store actions so
 * we assert the persistence path, not just the JSON serializer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fc from "fast-check"

import { useAuthStore } from "@/store/auth.store"
import {
  useShopContextStore,
  type ShopContextSnapshot,
  type ShopMeta,
} from "@/store/shop-context.store"
import type { AdminUser, UserRole } from "@/types"
import type { ShopRole } from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────────────────────
// Constants for arbitrary generation
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ROLES: readonly ShopRole[] = [
  "SHOP_ADMIN",
  "SHOP_MANAGER",
  "SHOP_STAFF",
  "SHOP_VIEWER",
]

const USER_ROLES: readonly UserRole[] = [
  "CUSTOMER",
  "ADMIN",
  "DELIVERY",
  "SUPER_ADMIN",
]

/** Permission tokens drawn from `lib/permissions.ts`. */
const PERMISSION_TOKENS = [
  "shops.read",
  "shops.write",
  "shops.delete",
  "shop-staff.read",
  "shop-staff.write",
  "shop-staff.delete",
  "shop-products.read",
  "shop-products.write",
  "shop-products.delete",
  "shop-financials.read",
  "shop-transactions.read",
  "orders.read",
  "orders.write",
  "orders.delete",
  "products.read",
  "products.write",
  "products.delete",
  "customers.read",
  "customers.write",
  "activity-log.read",
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSnapshot {
  token: string
  user: AdminUser
}

// ─────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ─────────────────────────────────────────────────────────────────────────────

const adminUserArb: fc.Arbitrary<AdminUser> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.string({ minLength: 1, maxLength: 50 }),
  role: fc.constantFrom(...USER_ROLES),
  phone: fc.string({ minLength: 1, maxLength: 50 }),
})

const authSnapshotArb: fc.Arbitrary<AuthSnapshot> = fc.record({
  token: fc.string({ minLength: 1, maxLength: 50 }),
  user: adminUserArb,
})

/** Shop meta whose id is constrained to match a generated `activeShopId`. */
const shopMetaArb = (id: string): fc.Arbitrary<ShopMeta> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    branchCode: fc.string({ minLength: 1, maxLength: 50 }),
    city: fc.string({ minLength: 1, maxLength: 50 }),
    isActive: fc.boolean(),
  })

/**
 * SINGLE_SHOP branch.
 *
 * Validity rules enforced here:
 *   - `activeShopId === shopMeta.id` (the persisted snapshot wires them up).
 *   - `assignedShopIds` is either `[]` (super admin) OR a non-empty list that
 *     includes `activeShopId` (vendor — the tamper guard would otherwise drop
 *     the activation, see `setActiveShop` in `shop-context.store.ts`).
 */
const singleShopSnapshotArb: fc.Arbitrary<ShopContextSnapshot> = fc
  .uuid()
  .chain((activeShopId) =>
    fc.record({
      activeShopId: fc.constant(activeShopId),
      mode: fc.constant<"STORE_MODE">("STORE_MODE"),
      shopRole: fc.constantFrom(...SHOP_ROLES),
      permissions: fc.array(fc.constantFrom(...PERMISSION_TOKENS), {
        maxLength: 6,
      }),
      shopMeta: shopMetaArb(activeShopId),
      assignedShopIds: fc.oneof(
        // Super admin: empty assignedShopIds (no tamper guard).
        fc.constant<string[]>([]),
        // Vendor: must include activeShopId. Dedupe so the property holds.
        fc
          .array(fc.uuid(), { maxLength: 4 })
          .map((ids) => Array.from(new Set([activeShopId, ...ids]))),
      ),
    }),
  )

/** ALL_SHOPS branch — super admin only, all other fields empty. */
const allShopsSnapshotArb: fc.Arbitrary<ShopContextSnapshot> = fc.constant({
  activeShopId: null,
  mode: "HQ_MODE",
  shopRole: null,
  permissions: [],
  shopMeta: null,
  assignedShopIds: [],
})

/** UNSELECTED branch — post-login, pre-select-shop default. */
const unselectedSnapshotArb: fc.Arbitrary<ShopContextSnapshot> = fc.constant({
  activeShopId: null,
  mode: "UNSELECTED",
  shopRole: null,
  permissions: [],
  shopMeta: null,
  assignedShopIds: [],
})

const shopContextSnapshotArb: fc.Arbitrary<ShopContextSnapshot> = fc.oneof(
  singleShopSnapshotArb,
  allShopsSnapshotArb,
  unselectedSnapshotArb,
)

// ─────────────────────────────────────────────────────────────────────────────
// Mock storage + store reset helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal in-memory `Storage` stub. Replacing the global keeps every store
 * write/read inside the iteration's own backing map so iterations cannot
 * bleed into each other.
 */
function makeMockStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

/** Reset the in-memory auth store WITHOUT touching localStorage. */
function resetAuthStoreMemory(): void {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isHydrated: false,
  })
}

/** Reset the in-memory shop-context store WITHOUT touching localStorage. */
function resetShopContextStoreMemory(): void {
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

/**
 * Apply a `ShopContextSnapshot` via the public store actions (the same path
 * a successful login + select-shop sequence walks through).
 *
 *   - UNSELECTED: nothing to apply; the default state already represents it.
 *   - ALL_SHOPS:  `setAllShopsMode()` (works only for super admins, i.e.
 *                  `assignedShopIds === []`).
 *   - SINGLE_SHOP: seed `assignedShopIds` first when the snapshot belongs to
 *                  a vendor, then `setActiveShop(...)`.
 */
function applyShopContextSnapshot(snap: ShopContextSnapshot): void {
  if (snap.mode === "UNSELECTED") return

  if (snap.mode === "HQ_MODE") {
    useShopContextStore.getState().setAllShopsMode()
    return
  }

  // SINGLE_SHOP — `shopMeta` and `shopRole` are guaranteed non-null by the
  // arbitrary above.
  if (snap.assignedShopIds.length > 0) {
    useShopContextStore.getState().setAssignedShopIds(snap.assignedShopIds)
  }
  useShopContextStore
    .getState()
    .setActiveShop(
      snap.shopMeta as ShopMeta,
      snap.shopRole as ShopRole,
      snap.permissions,
    )
}

/** Read the current shop-context state as a `ShopContextSnapshot`. */
function readShopContextSnapshot(): ShopContextSnapshot {
  const s = useShopContextStore.getState()
  return {
    activeShopId: s.activeShopId,
    mode: s.mode,
    shopRole: s.shopRole,
    permissions: s.permissions,
    shopMeta: s.shopMeta,
    assignedShopIds: s.assignedShopIds,
  }
}

/** Read the current auth state as the persistable `{ token, user }` pair. */
function readAuthSnapshot(): { token: string | null; user: AdminUser | null } {
  const s = useAuthStore.getState()
  return { token: s.accessToken, user: s.user }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeMockStorage())
  resetAuthStoreMemory()
  resetShopContextStoreMemory()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 2: Auth + shop persistence round-trip", () => {
  it("∀ (AuthSnapshot, ShopContextSnapshot): apply → reset → hydrate yields a deeply equal pair", () => {
    fc.assert(
      fc.property(authSnapshotArb, shopContextSnapshotArb, (auth, ctx) => {
        // Fresh storage + clean in-memory stores per iteration to keep runs
        // independent. `vi.stubGlobal` replaces the previous stub.
        vi.stubGlobal("localStorage", makeMockStorage())
        resetAuthStoreMemory()
        resetShopContextStoreMemory()

        // Apply the snapshots through the real action path.
        useAuthStore.getState().login(auth.user, auth.token)
        applyShopContextSnapshot(ctx)

        // Simulate a full reload: drop in-memory state, then re-hydrate
        // from the same backing storage.
        resetAuthStoreMemory()
        resetShopContextStoreMemory()
        useAuthStore.getState().hydrate()
        useShopContextStore.getState().hydrate()

        // The rehydrated pair must be deeply equal to the input pair.
        const rehydratedAuth = readAuthSnapshot()
        const rehydratedCtx = readShopContextSnapshot()

        expect(rehydratedAuth.token).toEqual(auth.token)
        expect(rehydratedAuth.user).toEqual(auth.user)
        expect(rehydratedCtx).toEqual(ctx)
      }),
      { numRuns: 100 },
    )
  })
})
