export type CartMilestoneRewardType = "CASHBACK" | "FLAT_DISCOUNT" | "COUPON_UNLOCK"
export type MilestoneUserType = "ALL" | "FIRST_TIME" | "SEGMENT"
export type CashbackCreditTrigger = "PAYMENT_SUCCESS" | "ORDER_CONFIRMED" | "ORDER_DELIVERED"

export interface CartMilestone {
  id: string
  name: string
  minCartAmount: number
  rewardType: CartMilestoneRewardType
  rewardValue: number | null
  rewardPercent: number | null
  maxDiscount: number | null
  unlockCouponId: string | null
  messageBefore: string | null
  messageAfter: string | null
  iconUrl: string | null
  isActive: boolean
  applicableUserType: MilestoneUserType
  applicableSegmentId: string | null
  excludedSegmentId: string | null
  stackableWithCoupon: boolean
  priority: number
  cashbackCreditTrigger: CashbackCreditTrigger
  usageLimitPerUser: number | null
  grantsFreeDelivery: boolean
  applicableCategoryIds: string[] | null
  applicableProductIds: string[] | null
  createdAt: string
}

export interface CreateCartMilestonePayload {
  name: string
  minCartAmount: number
  rewardType: CartMilestoneRewardType
  rewardValue?: number
  rewardPercent?: number | null
  maxDiscount?: number
  unlockCouponId?: string
  messageBefore?: string
  messageAfter?: string
  iconUrl?: string
  applicableUserType?: MilestoneUserType
  applicableSegmentId?: string
  excludedSegmentId?: string | null
  stackableWithCoupon?: boolean
  priority?: number
  cashbackCreditTrigger?: CashbackCreditTrigger
  usageLimitPerUser?: number | null
  grantsFreeDelivery?: boolean
  applicableCategoryIds?: string[] | null
  applicableProductIds?: string[] | null
}

export interface UpdateCartMilestonePayload extends Partial<CreateCartMilestonePayload> {
  isActive?: boolean
}
