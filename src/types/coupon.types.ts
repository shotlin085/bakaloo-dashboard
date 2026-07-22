/** Who is allowed to redeem a coupon. */
export type CouponTargetType = "ALL" | "SEGMENT" | "INDIVIDUAL" | "FIRST_TIME"

/** Coupon entity — camelCase (backend formats via _format()) */
export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "CASHBACK"
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
  /** Immutable after creation — set once from CreateCouponPayload, never editable via UpdateCouponPayload. */
  couponType?: "PLATFORM_COUPON" | "SHOP_COUPON" | "CATEGORY_COUPON" | "PRODUCT_COUPON" | "DELIVERY_COUPON"
  /** Category or bundle ids this coupon is restricted to. Null/empty = applies to the whole order. */
  applicableCategoryIds: string[] | null
  /** Specific product ids this coupon is restricted to. Null/empty = applies to the whole order. */
  applicableProductIds: string[] | null
  /** Independent of discountType — a PERCENTAGE/FLAT/CASHBACK coupon can also waive delivery. */
  grantsFreeDelivery: boolean
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
  discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "CASHBACK"
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
  couponType?: "PLATFORM_COUPON" | "CATEGORY_COUPON" | "PRODUCT_COUPON"
  applicableCategoryIds?: string[] | null
  applicableProductIds?: string[] | null
  grantsFreeDelivery?: boolean
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
