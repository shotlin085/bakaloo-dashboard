export type CartMilestoneRewardType = "CASHBACK" | "FLAT_DISCOUNT" | "COUPON_UNLOCK"
export type MilestoneUserType = "ALL" | "FIRST_TIME" | "SEGMENT"
export type CashbackCreditTrigger = "PAYMENT_SUCCESS" | "ORDER_CONFIRMED" | "ORDER_DELIVERED"

export interface CartMilestone {
  id: string
  name: string
  minCartAmount: number
  rewardType: CartMilestoneRewardType
  rewardValue: number | null
  maxDiscount: number | null
  unlockCouponId: string | null
  messageBefore: string | null
  messageAfter: string | null
  iconUrl: string | null
  isActive: boolean
  applicableUserType: MilestoneUserType
  applicableSegmentId: string | null
  stackableWithCoupon: boolean
  priority: number
  cashbackCreditTrigger: CashbackCreditTrigger
  createdAt: string
}

export interface CreateCartMilestonePayload {
  name: string
  minCartAmount: number
  rewardType: CartMilestoneRewardType
  rewardValue?: number
  maxDiscount?: number
  unlockCouponId?: string
  messageBefore?: string
  messageAfter?: string
  iconUrl?: string
  applicableUserType?: MilestoneUserType
  applicableSegmentId?: string
  stackableWithCoupon?: boolean
  priority?: number
  cashbackCreditTrigger?: CashbackCreditTrigger
}

export interface UpdateCartMilestonePayload extends Partial<CreateCartMilestonePayload> {
  isActive?: boolean
}
