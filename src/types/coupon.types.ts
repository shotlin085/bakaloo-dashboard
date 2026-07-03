/** Who is allowed to redeem a coupon. */
export type CouponTargetType = "ALL" | "SEGMENT" | "INDIVIDUAL" | "FIRST_TIME"

/** Coupon entity — camelCase (backend formats via _format()) */
export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "BOGO" | "CASHBACK"
  discountValue: number
  minOrderAmount: number
  maxDiscount: number | null
  bogoProductId?: string | null
  cashbackPercent?: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number
  validFrom: string | null
  validUntil: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
  targetType: CouponTargetType
  targetSegmentId: string | null
  cashbackCreditTrigger: "PAYMENT_SUCCESS" | "ORDER_CONFIRMED" | "ORDER_DELIVERED"
}

/** Coupon list filters */
export interface CouponFilters {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean | null
}

/** Create coupon payload */
export interface CreateCouponPayload {
  code: string
  description?: string
  discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "BOGO" | "CASHBACK"
  discountValue: number
  minOrderAmount?: number
  maxDiscount?: number
  bogoProductId?: string
  cashbackPercent?: number
  usageLimit?: number
  perUserLimit?: number
  validFrom?: string
  validUntil?: string
  targetType?: CouponTargetType
  targetSegmentId?: string
  targetUserIds?: string[]
  cashbackCreditTrigger?: "PAYMENT_SUCCESS" | "ORDER_CONFIRMED" | "ORDER_DELIVERED"
}

/** Update coupon payload — all optional + isActive toggle */
export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {
  isActive?: boolean
}

/** Coupon analytics data */
export interface CouponAnalytics {
  totalRedemptions: number
  revenueGenerated: number
  avgOrderValue: number
  avgDiscount: number
  conversionRate: number
  dailyRedemptions: { date: string; count: number; revenue: number }[]
  topUsers: { name: string; uses: number; totalSpent: number }[]
}
