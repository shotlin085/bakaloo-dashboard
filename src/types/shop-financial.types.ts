/**
 * Shop financial period (P&L) types — mirrors
 * `bakaloo-backend/src/modules/shop-financials` schemas.
 * See design.md §"Data Models" and Requirement 8.6.
 */

/** Settlement bucket type. */
export type ShopFinancialPeriodType = "DAILY" | "WEEKLY" | "MONTHLY"

/** Lifecycle of a shop's payout for a given period. */
export type ShopFinancialPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "HELD"

/** A single per-shop, per-period P&L row returned by `/api/v1/shop-financials`. */
export interface ShopFinancialPeriod {
  id: string
  shop_id: string

  period_type: ShopFinancialPeriodType
  period_start: string
  period_end: string

  gross_revenue: number
  net_revenue: number
  total_orders: number
  avg_order_value: number

  platform_commission: number
  delivery_costs: number
  refund_amount: number

  payout_amount: number
  payout_status: ShopFinancialPayoutStatus
  payout_ref: string | null
  paid_at: string | null
}
