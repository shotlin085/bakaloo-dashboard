/**
 * Unit tests for the Shop_Financials KPI aggregator (task 9.4).
 *
 * Covers the closed-form arithmetic the page renders into the 8 KPI tiles:
 *   - Empty input → all KPIs are zero.
 *   - Single row  → totals equal that row; AOV = gross / total_orders.
 *   - Multi-row   → sums add up; AOV = sum(gross) / sum(orders) — i.e.
 *                   a weighted mean, not the unweighted mean of per-row
 *                   AOVs (this is the "8.4 closed-form" expectation).
 *   - Divide-by-zero — zero orders yield AOV = 0 (never NaN / Infinity).
 *
 * `formatCurrency` 2-decimal INR output is already covered by
 * `src/lib/__tests__/i18n.test.ts`, so this file does not duplicate that
 * assertion.
 *
 * Validates: Requirements 8.4, 8.8
 */

import { describe, it, expect } from "vitest"

import {
  aggregateShopFinancialKpis,
  EMPTY_SHOP_FINANCIAL_KPIS,
} from "@/app/(dashboard)/shop-financials/_lib/aggregate-kpis"
import type { ShopFinancialPeriod } from "@/types/shop-financial.types"

// ─── Test fixtures ──────────────────────────────────────────────────────────

/**
 * Build a `ShopFinancialPeriod` row with sensible defaults. Tests override
 * only the numeric fields they care about; the metadata fields (id,
 * timestamps, payout status) are constant so the aggregator's behavior is
 * isolated to the numeric reduction.
 */
function makePeriod(
  overrides: Partial<ShopFinancialPeriod> = {},
): ShopFinancialPeriod {
  return {
    id: "fp-test",
    shop_id: "shop-a",
    period_type: "DAILY",
    period_start: "2025-01-01",
    period_end: "2025-01-01",
    gross_revenue: 0,
    net_revenue: 0,
    total_orders: 0,
    avg_order_value: 0,
    platform_commission: 0,
    delivery_costs: 0,
    refund_amount: 0,
    payout_amount: 0,
    payout_status: "PAID",
    payout_ref: null,
    paid_at: null,
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("aggregateShopFinancialKpis — empty input", () => {
  it("returns all zeros for an empty period list", () => {
    expect(aggregateShopFinancialKpis([])).toEqual(EMPTY_SHOP_FINANCIAL_KPIS)
  })

  it("does not return NaN or Infinity for any field on empty input", () => {
    const out = aggregateShopFinancialKpis([])
    for (const value of Object.values(out)) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})

describe("aggregateShopFinancialKpis — single period", () => {
  it("mirrors the row's totals and computes AOV = gross / orders", () => {
    const row = makePeriod({
      gross_revenue: 1000,
      net_revenue: 800,
      total_orders: 10,
      platform_commission: 100,
      delivery_costs: 50,
      refund_amount: 25,
      payout_amount: 750,
    })

    expect(aggregateShopFinancialKpis([row])).toEqual({
      gross: 1000,
      net: 800,
      totalOrders: 10,
      avgOrderValue: 100, // 1000 / 10
      commission: 100,
      delivery: 50,
      refund: 25,
      payout: 750,
    })
  })

  it("uses the running totals for AOV — ignores the row's own avg_order_value field", () => {
    // The row's `avg_order_value` field is set to a wildly wrong number;
    // the aggregator must compute AOV from `gross_revenue / total_orders`
    // and not just pass through the per-row column.
    const row = makePeriod({
      gross_revenue: 200,
      total_orders: 5,
      avg_order_value: 9999,
    })

    expect(aggregateShopFinancialKpis([row]).avgOrderValue).toBe(40)
  })
})

describe("aggregateShopFinancialKpis — multi-period sums", () => {
  it("sums every monetary field and computes the weighted AOV", () => {
    const rows = [
      makePeriod({
        gross_revenue: 1000,
        net_revenue: 800,
        total_orders: 10,
        platform_commission: 100,
        delivery_costs: 50,
        refund_amount: 25,
        payout_amount: 750,
      }),
      makePeriod({
        gross_revenue: 500,
        net_revenue: 400,
        total_orders: 5,
        platform_commission: 50,
        delivery_costs: 25,
        refund_amount: 0,
        payout_amount: 400,
      }),
      makePeriod({
        gross_revenue: 300,
        net_revenue: 250,
        total_orders: 3,
        platform_commission: 30,
        delivery_costs: 20,
        refund_amount: 10,
        payout_amount: 240,
      }),
    ]

    expect(aggregateShopFinancialKpis(rows)).toEqual({
      gross: 1800,
      net: 1450,
      totalOrders: 18,
      avgOrderValue: 100, // 1800 / 18
      commission: 180,
      delivery: 95,
      refund: 35,
      payout: 1390,
    })
  })

  it("computes the weighted AOV — not the unweighted mean of per-row AOVs", () => {
    // Per-row AOV values differ; the closed-form is sum(gross)/sum(orders).
    //   row A: gross 200, orders 1 → per-row AOV 200
    //   row B: gross 200, orders 4 → per-row AOV 50
    // Unweighted mean of those AOVs = (200 + 50) / 2 = 125.
    // Weighted (correct) mean       = (200 + 200) / (1 + 4) = 80.
    const rows = [
      makePeriod({ gross_revenue: 200, total_orders: 1 }),
      makePeriod({ gross_revenue: 200, total_orders: 4 }),
    ]

    expect(aggregateShopFinancialKpis(rows).avgOrderValue).toBe(80)
  })

  it("matches the per-field reduce(sum) closed-form for arbitrary row counts", () => {
    const rows = [
      makePeriod({
        gross_revenue: 11,
        net_revenue: 9,
        total_orders: 2,
        platform_commission: 1,
        delivery_costs: 1,
        refund_amount: 0,
        payout_amount: 9,
      }),
      makePeriod({
        gross_revenue: 22,
        net_revenue: 18,
        total_orders: 3,
        platform_commission: 2,
        delivery_costs: 2,
        refund_amount: 1,
        payout_amount: 17,
      }),
      makePeriod({
        gross_revenue: 33,
        net_revenue: 27,
        total_orders: 4,
        platform_commission: 3,
        delivery_costs: 3,
        refund_amount: 2,
        payout_amount: 25,
      }),
      makePeriod({
        gross_revenue: 44,
        net_revenue: 36,
        total_orders: 5,
        platform_commission: 4,
        delivery_costs: 4,
        refund_amount: 3,
        payout_amount: 33,
      }),
    ]
    const closedForm = (key: keyof ShopFinancialPeriod) =>
      rows.reduce((acc, r) => acc + (r[key] as number), 0)

    const out = aggregateShopFinancialKpis(rows)
    expect(out.gross).toBe(closedForm("gross_revenue"))
    expect(out.net).toBe(closedForm("net_revenue"))
    expect(out.totalOrders).toBe(closedForm("total_orders"))
    expect(out.commission).toBe(closedForm("platform_commission"))
    expect(out.delivery).toBe(closedForm("delivery_costs"))
    expect(out.refund).toBe(closedForm("refund_amount"))
    expect(out.payout).toBe(closedForm("payout_amount"))
    expect(out.avgOrderValue).toBe(out.gross / out.totalOrders)
  })
})

describe("aggregateShopFinancialKpis — divide-by-zero safety (Req 8.4)", () => {
  it("returns AOV = 0 when total_orders is zero across a non-empty list", () => {
    const rows = [
      makePeriod({ gross_revenue: 0, total_orders: 0 }),
      makePeriod({ gross_revenue: 0, total_orders: 0 }),
    ]
    const out = aggregateShopFinancialKpis(rows)
    expect(out.avgOrderValue).toBe(0)
    expect(Number.isFinite(out.avgOrderValue)).toBe(true)
  })

  it("returns AOV = 0 even when gross_revenue is non-zero but orders are zero", () => {
    // Defensive case: shouldn't happen in production data (gross with no
    // orders), but the math must still be finite — never Infinity.
    const rows = [makePeriod({ gross_revenue: 500, total_orders: 0 })]
    const out = aggregateShopFinancialKpis(rows)
    expect(out.avgOrderValue).toBe(0)
    expect(Number.isFinite(out.avgOrderValue)).toBe(true)
  })

  it("does not mutate its input array", () => {
    const original = [
      makePeriod({ id: "a", gross_revenue: 1, total_orders: 1 }),
      makePeriod({ id: "b", gross_revenue: 2, total_orders: 2 }),
    ]
    const snapshot = JSON.parse(JSON.stringify(original))
    aggregateShopFinancialKpis(original)
    expect(original).toEqual(snapshot)
  })
})
