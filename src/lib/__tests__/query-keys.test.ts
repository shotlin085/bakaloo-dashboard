/**
 * Unit tests for the central query-key factory and `isShopScopedKey`.
 *
 * Validates: Requirements 3.4 (single shop predicate invalidation),
 *            Requirements 10.3 (existing surfaces participate via shopId).
 */

import { describe, it, expect } from "vitest"

import {
  qk,
  isShopScopedKey,
  __SHOP_SCOPED_TAGS_FOR_TEST,
} from "@/lib/query-keys"

const NOOP_PARAMS = { page: 1, limit: 20 }

describe("qk.* shape", () => {
  it("myShops() returns ['my-shops'] (per-user, not shop-scoped)", () => {
    expect(qk.myShops()).toEqual(["my-shops"])
  })

  it("shops() / shop() / shopActivity() carry the 'shops' tag", () => {
    expect(qk.shops(NOOP_PARAMS)[0]).toBe("shops")
    expect(qk.shop("shop-1")[0]).toBe("shops")
    expect(qk.shopActivity("shop-1", NOOP_PARAMS)[0]).toBe("shops")
  })

  it("shopStaff() embeds shopId in the second segment", () => {
    const key = qk.shopStaff("shop-1", NOOP_PARAMS)
    expect(key[0]).toBe("shop-staff")
    expect(key[1]).toBe("shop-1")
  })

  it("shopProducts() / shopProduct() embed shopId in the second segment", () => {
    expect(qk.shopProducts("shop-1", NOOP_PARAMS)[0]).toBe("shop-products")
    expect(qk.shopProducts("shop-1", NOOP_PARAMS)[1]).toBe("shop-1")
    expect(qk.shopProduct("shop-1", "p-1")[1]).toBe("shop-1")
  })

  it("shopFinancials() / shopTransactions() embed shopId", () => {
    expect(qk.shopFinancials("shop-1", "monthly", "2024-01")[0]).toBe(
      "shop-financials",
    )
    expect(qk.shopFinancials("shop-1", "monthly", "2024-01")[1]).toBe("shop-1")
    expect(qk.shopTransactions("shop-1", NOOP_PARAMS)[1]).toBe("shop-1")
  })

  it("wrapped existing surfaces accept a shopId or 'ALL' as the second segment", () => {
    expect(qk.orders("shop-1", NOOP_PARAMS)).toEqual([
      "orders",
      "shop-1",
      NOOP_PARAMS,
    ])
    expect(qk.orders("ALL", NOOP_PARAMS)[1]).toBe("ALL")
    expect(qk.customers("shop-1", NOOP_PARAMS)[0]).toBe("customers")
    expect(qk.products("ALL", NOOP_PARAMS)[1]).toBe("ALL")
    expect(qk.dashboardHome("shop-1", NOOP_PARAMS)[0]).toBe("dashboard-home")
    expect(qk.activityLog("shop-1", NOOP_PARAMS)[0]).toBe("activity-log")
  })
})

describe("isShopScopedKey", () => {
  it("returns false for the empty key", () => {
    expect(isShopScopedKey([])).toBe(false)
  })

  it("returns false for the per-user my-shops key", () => {
    expect(isShopScopedKey(qk.myShops())).toBe(false)
    expect(isShopScopedKey(["my-shops"])).toBe(false)
  })

  it("returns true for every shop-scoped tag in the registry", () => {
    for (const tag of __SHOP_SCOPED_TAGS_FOR_TEST) {
      expect(isShopScopedKey([tag, "shop-1"])).toBe(true)
    }
  })

  it("returns true for shop-aware existing surfaces (orders, products, etc.)", () => {
    expect(isShopScopedKey(qk.orders("shop-1", NOOP_PARAMS))).toBe(true)
    expect(isShopScopedKey(qk.products("ALL", NOOP_PARAMS))).toBe(true)
    expect(isShopScopedKey(qk.shopProducts("shop-1", NOOP_PARAMS))).toBe(true)
    expect(isShopScopedKey(qk.shopStaff("shop-1", NOOP_PARAMS))).toBe(true)
  })

  it("returns false for unknown / non-shop-scoped first segments", () => {
    expect(isShopScopedKey(["unknown-tag", "shop-1"])).toBe(false)
    expect(isShopScopedKey(["auth", "session"])).toBe(false)
  })

  it("tolerates non-string first segments without throwing", () => {
    expect(isShopScopedKey([42 as unknown as string])).toBe(false)
    expect(isShopScopedKey([null as unknown as string, "x"])).toBe(false)
  })
})
