/* ── Analytics Types ─────────────────────────────── */

export interface SalesTimeSeriesPoint {
  period: string
  revenue: number
  orders: number
  avg_order_value: number
  total_discount: number
}

export interface SalesSummary {
  total_revenue: number
  total_orders: number
  avg_order_value: number
  unique_customers: number
  total_discounts: number
}

export interface SalesAnalytics {
  summary: SalesSummary
  timeSeries: SalesTimeSeriesPoint[]
}

export interface ProductPerformance {
  id: string
  name: string
  thumbnail_url: string
  category: string
  units_sold: number
  revenue: number
  unique_buyers: number
  views: number
  conversion_rate: number
}

export interface CustomerCohort {
  cohort_month: string
  cohort_size: number
  order_month: string
  active_users: number
  retention_pct: number
}

export interface DeliverySummary {
  total_deliveries: number
  avg_delivery_time: string
  avg_distance: string
  avg_rating: string
  on_time_percentage: number
  total_tips: number
}

export interface DeliveryByHour {
  hour: number
  deliveries: number
  avg_time: string
}

export interface DeliveryAnalytics {
  summary: DeliverySummary
  byHour: DeliveryByHour[]
}

export interface FinancialRevenue {
  gross: number
  discounts: number
  delivery_fees: number
  net: number
  order_count: number
}

export interface PaymentMethodBreakdown {
  payment_method: string
  revenue: number
  count: number
}

export interface GstBreakdown {
  gst_rate: number
  taxable_amount: number
  gst_amount: number
}

export interface FinancialReport {
  revenue: FinancialRevenue
  byPaymentMethod: PaymentMethodBreakdown[]
  gstBreakdown: GstBreakdown[]
}

export interface ComparisonMetrics {
  revenue: number
  orders: number
  customers: number
  aov: number
}

export interface ComparisonAnalytics {
  current: ComparisonMetrics
  previous: ComparisonMetrics
  changes: ComparisonMetrics
}

export interface AnalyticsDateRange {
  startDate: string
  endDate: string
}

export type GroupBy = "day" | "week" | "month"

export interface DeadStockProduct {
  id: string
  name: string
  sku: string
  stock_quantity: number
  last_sold_at: string | null
  days_since_sold: number
  category: string
}

export interface GeographicData {
  area: string
  orders: number
  revenue: number
  customers: number
  avg_order_value: number
}

export interface TipAnalytics {
  totalTips: number
  averageTip: number
  mostPopularAmount: number | null
  tippedOrders: number
}

export interface FeeRevenueAnalytics {
  totalDeliveryFees: number
  totalHandlingFees: number
  totalLateNightFees: number
}

export interface CartEnhancementAnalytics {
  tipAnalytics: TipAnalytics
  feeRevenue: FeeRevenueAnalytics
}
