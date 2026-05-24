/**
 * Shop_Financials KPI aggregator (task 9.4).
 *
 * Pure function that reduces a list of `ShopFinancialPeriod` rows into the
 * eight totals rendered by the KPI strip on the Shop_Financials page
 * (Req 8.4):
 *
 *   - gross_revenue   → sum
 *   - net_revenue     → sum
 *   - total_orders    → sum
 *   - avg_order_value → weighted: sum(gross_revenue) / sum(total_orders)
 *                       (returns 0 when there are no orders so the UI never
 *                        has to deal with NaN / Infinity)
 *   - platform_commission → sum
 *   - delivery_costs      → sum
 *   - refund_amount       → sum
 *   - payout_amount       → sum
 *
 * Extracted from the inline `useMemo` in `page.tsx` so it can be unit-tested
 * without mounting React. The page now calls this helper directly.
 */

import type { ShopFinancialPeriod } from "@/types/shop-financial.types"

/** Aggregated KPI tuple consumed by the eight KPI tiles on the page. */
export interface ShopFinancialKpis {
  gross: number
  net: number
  totalOrders: number
  avgOrderValue: number
  commission: number
  delivery: number
  refund: number
  payout: number
}

/** Identity element for {@link aggregateShopFinancialKpis}. */
export const EMPTY_SHOP_FINANCIAL_KPIS: ShopFinancialKpis = {
  gross: 0,
  net: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  commission: 0,
  delivery: 0,
  refund: 0,
  payout: 0,
}

/**
 * Aggregate the visible page rows into the 8 KPI tile values.
 *
 * Pure: depends only on `rows`, never touches global state, and never
 * mutates its input. Safe to call inside `useMemo`.
 *
 * @param rows - The currently visible `ShopFinancialPeriod` rows.
 * @returns The 8 KPI totals. When `rows` is empty, all fields are `0`.
 */
export function aggregateShopFinancialKpis(
  rows: readonly ShopFinancialPeriod[],
): ShopFinancialKpis {
  let gross = 0
  let net = 0
  let totalOrders = 0
  let commission = 0
  let delivery = 0
  let refund = 0
  let payout = 0
  for (const r of rows) {
    gross += r.gross_revenue
    net += r.net_revenue
    totalOrders += r.total_orders
    commission += r.platform_commission
    delivery += r.delivery_costs
    refund += r.refund_amount
    payout += r.payout_amount
  }
  // Weighted mean over the visible window — periods with zero orders should
  // not drag the average toward zero, and an all-zero window must surface
  // a finite `0` rather than `NaN` / `Infinity`.
  const avgOrderValue = totalOrders > 0 ? gross / totalOrders : 0
  return {
    gross,
    net,
    totalOrders,
    avgOrderValue,
    commission,
    delivery,
    refund,
    payout,
  }
}
