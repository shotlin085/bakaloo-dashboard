export type FirstTimeOfferRewardType =
  | "FREE_DELIVERY"
  | "FLAT_DISCOUNT"
  | "PERCENTAGE_DISCOUNT"
  | "WALLET_CASHBACK"
  | "COUPON_UNLOCK"

export type CashbackCreditTrigger = "PAYMENT_SUCCESS" | "ORDER_CONFIRMED" | "ORDER_DELIVERED"

export interface FirstTimeOffer {
  id: string
  name: string
  minOrderAmount: number
  rewardType: FirstTimeOfferRewardType
  rewardValue: number | null
  maxDiscount: number | null
  unlockCouponId: string | null
  startAt: string | null
  endAt: string | null
  isActive: boolean
  autoApply: boolean
  paymentMethodScope: "ALL" | "ONLINE_ONLY"
  cashbackCreditTrigger: CashbackCreditTrigger
  createdAt: string
}

export interface CreateFirstTimeOfferPayload {
  name: string
  minOrderAmount?: number
  rewardType: FirstTimeOfferRewardType
  rewardValue?: number
  maxDiscount?: number
  unlockCouponId?: string
  startAt?: string
  endAt?: string
  autoApply?: boolean
  paymentMethodScope?: "ALL" | "ONLINE_ONLY"
  cashbackCreditTrigger?: CashbackCreditTrigger
}

export interface UpdateFirstTimeOfferPayload extends Partial<CreateFirstTimeOfferPayload> {
  isActive?: boolean
}
