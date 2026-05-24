/**
 * Property test for Property 13: Shop-switch cache invalidation.
 *
 * Validates: Requirements 3.4 (single shop predicate invalidation),
 *            Requirements 10.3 (existing surfaces participate via shopId).
 *
 * Property statement (design.md §Property 13):
 *   For any QueryClient state containing entries keyed by the central key
 *   factory and any Super_Admin shop switch from `s1` to `s2`, every cache
 *   entry whose key is shop-scoped is marked invalid; non-shop-scoped
 *   entries are left untouched.
 *
 * Test strategy:
 *   We exercise the exact predicate used by `<ShopSwitcher />` (and by
 *   `useMyShops` post-selectShop):
 *
 *     queryClient.invalidateQueries({
 *       predicate: (q) => isShopScopedKey(q.queryKey),
 *     })
 *
 *   without rendering the component. For each generated key list we seed a
 *   fresh `QueryClient`, run the invalidation, then assert that every query
 *   whose key is shop-scoped reports `state.isInvalidated === true` and
 *   every non-shop-scoped query reports `state.isInvalidated === false`.
 */

import { describe, it, expect } from "vitest"
import fc from "fast-check"
import { QueryClient } from "@tanstack/react-query"

import { qk, isShopScopedKey } from "@/lib/query-keys"
import type { ListParams } from "@/types/common.types"

// ── Smart generators ────────────────────────────────────────────────────────

/**
 * Two distinct shop ids drawn from a tiny universe so we frequently hit the
 * `s1 ≠ s2` collision lane the property cares about.
 */
const shopIdArb = fc.constantFrom("shop-1", "shop-2", "shop-3", "ALL")

/** Minimal `ListParams` so the second-or-deeper segments still vary. */
const listParamsArb: fc.Arbitrary<ListParams> = fc.record({
  page: fc.integer({ min: 1, max: 10 }),
  limit: fc.integer({ min: 1, max: 100 }),
})

// Each entry is `{ key, scoped }` where `scoped` is the *expected* outcome
// of `isShopScopedKey(key)`. The generators below are constructed so this
// label matches the predicate by construction (no oracle leak — we are
// asserting the predicate's effect on the cache, not re-deriving it).

interface KeyEntry {
  readonly key: readonly unknown[]
  readonly scoped: boolean
}

const shopScopedKeyArb: fc.Arbitrary<KeyEntry> = fc.oneof(
  // First-class multi-vendor surfaces
  listParamsArb.map((p) => ({ key: qk.shops(p), scoped: true as const })),
  shopIdArb.map((id) => ({ key: qk.shop(id), scoped: true as const })),
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.shopProducts(id, p), scoped: true as const })),
  fc.tuple(shopIdArb, fc.uuid()).map(([id, pid]) => ({
    key: qk.shopProduct(id, pid),
    scoped: true as const,
  })),
  fc
    .tuple(
      shopIdArb,
      fc.constantFrom("daily", "weekly", "monthly"),
      fc.constantFrom("2024-01", "2024-02", "2024-Q1"),
    )
    .map(([id, period, range]) => ({
      key: qk.shopFinancials(id, period, range),
      scoped: true as const,
    })),
  fc.tuple(shopIdArb, listParamsArb).map(([id, p]) => ({
    key: qk.shopTransactions(id, p),
    scoped: true as const,
  })),
  fc.tuple(shopIdArb, listParamsArb).map(([id, p]) => ({
    key: qk.shopStaff(id, p),
    scoped: true as const,
  })),
  // Wrapped existing surfaces (Req 10.3) — every one must invalidate too
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.orders(id, p), scoped: true as const })),
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.customers(id, p), scoped: true as const })),
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.products(id, p), scoped: true as const })),
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.reviews(id, p), scoped: true as const })),
  fc
    .tuple(shopIdArb, listParamsArb)
    .map(([id, p]) => ({ key: qk.categories(id, p), scoped: true as const })),
  fc.tuple(shopIdArb, listParamsArb).map(([id, p]) => ({
    key: qk.dashboardHome(id, p),
    scoped: true as const,
  })),
  fc.tuple(shopIdArb, listParamsArb).map(([id, p]) => ({
    key: qk.activityLog(id, p),
    scoped: true as const,
  })),
)

const nonShopScopedKeyArb: fc.Arbitrary<KeyEntry> = fc.oneof(
  // Per-user, must survive the switch (the whole point of `my-shops`)
  fc.constant({ key: qk.myShops(), scoped: false as const }),
  // Bespoke keys outside the registry
  fc.constant({ key: ["roles"] as const, scoped: false as const }),
  fc.constant({ key: ["auth", "session"] as const, scoped: false as const }),
  fc.constant({ key: ["i18n", "en"] as const, scoped: false as const }),
  fc.constant({ key: ["theme"] as const, scoped: false as const }),
  // An unknown tag with shop-shaped second segment — still must NOT invalidate
  shopIdArb.map((id) => ({
    key: ["unknown-feature", id] as const,
    scoped: false as const,
  })),
)

const keyEntryArb = fc.oneof(shopScopedKeyArb, nonShopScopedKeyArb)

/**
 * A non-empty list of cache entries with stable, distinct keys. We dedupe by
 * stringified key so `setQueryData` calls don't collapse onto the same cache
 * slot (which would silently shrink the assertion set).
 */
const cacheStateArb: fc.Arbitrary<readonly KeyEntry[]> = fc
  .array(keyEntryArb, { minLength: 1, maxLength: 25 })
  .map((entries) => {
    const seen = new Set<string>()
    const out: KeyEntry[] = []
    for (const e of entries) {
      const sig = JSON.stringify(e.key)
      if (seen.has(sig)) continue
      seen.add(sig)
      out.push(e)
    }
    return out
  })
  .filter((entries) => entries.length > 0)

// ── Property ────────────────────────────────────────────────────────────────

describe("Property 13: shop-switch cache invalidation", () => {
  it("marks every shop-scoped entry invalid and leaves non-shop-scoped entries untouched", async () => {
    await fc.assert(
      fc.asyncProperty(cacheStateArb, async (entries) => {
        // Sanity: our generator labels match the predicate. If this ever
        // diverges, the test is meaningless.
        for (const { key, scoped } of entries) {
          expect(isShopScopedKey(key)).toBe(scoped)
        }

        const queryClient = new QueryClient({
          // Disable retries so any accidental refetch fails fast rather
          // than racing against the assertion phase.
          defaultOptions: { queries: { retry: false } },
        })

        try {
          // Seed each key with arbitrary data so the cache holds a real
          // Query object the predicate can be evaluated against.
          for (const { key } of entries) {
            queryClient.setQueryData(key as readonly unknown[], {
              seeded: true,
            })
          }

          // Drive the same call site `<ShopSwitcher />` uses on shop change.
          // `refetchType: "none"` keeps the test deterministic: there are no
          // observers and no `queryFn`, so we only care about the
          // `isInvalidated` flag, not refetch side-effects.
          await queryClient.invalidateQueries({
            predicate: (q) => isShopScopedKey(q.queryKey),
            refetchType: "none",
          })

          for (const { key, scoped } of entries) {
            const state = queryClient.getQueryState(key as readonly unknown[])
            expect(
              state,
              `expected query to exist for key ${JSON.stringify(key)}`,
            ).toBeDefined()
            expect(
              state!.isInvalidated,
              `key ${JSON.stringify(key)} expected isInvalidated=${scoped}`,
            ).toBe(scoped)
          }
        } finally {
          queryClient.clear()
        }
      }),
      { numRuns: 50 },
    )
  })
})
