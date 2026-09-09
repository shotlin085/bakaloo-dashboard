export type SpinPrizeType =
  | "FREE_DELIVERY"
  | "PERCENTAGE_OFF"
  | "FLAT_OFF"
  | "BUY_ONE_GET_ONE"
  | "CASHBACK"
  | "BETTER_LUCK"

export type SpinIconKey =
  | "shopping_cart"
  | "percent"
  | "basket"
  | "coins"
  | "gift"
  | "sad_face"
  | "star"
  | "ticket"

export type SpinTriggerMode = "ALWAYS_ON_LOGIN" | "MILESTONE_ONLY" | "MANUAL_ONLY"

export type SpinMilestoneType = "ORDER_COUNT" | "TOTAL_SPEND"

export type SpinRewardStatus = "ISSUED" | "FAILED" | "N_A"

export interface SpinPrize {
  id: string
  type: SpinPrizeType
  iconKey: SpinIconKey
  label: string
  value: number | null
  winProbability: number
  displayOrder: number
  isActive: boolean
  linkedCouponId: string | null
  createdAt: string
}

export interface CreateSpinPrizePayload {
  type: SpinPrizeType
  iconKey?: SpinIconKey
  label: string
  value?: number | null
  winProbability?: number
  isActive?: boolean
  linkedCouponId?: string | null
}

export interface UpdateSpinPrizePayload extends Partial<CreateSpinPrizePayload> {}

export interface SpinWheelSettings {
  id: string
  dailyFreeSpins: number
  triggerMode: SpinTriggerMode
  updatedAt: string
}

export interface UpdateSpinWheelSettingsPayload {
  dailyFreeSpins?: number
  triggerMode?: SpinTriggerMode
}

export interface SpinMilestoneRule {
  id: string
  milestoneType: SpinMilestoneType
  threshold: number
  bonusSpins: number
  isRepeating: boolean
  isActive: boolean
  createdAt: string
}

export interface CreateSpinMilestoneRulePayload {
  milestoneType: SpinMilestoneType
  threshold: number
  bonusSpins?: number
  isRepeating?: boolean
  isActive?: boolean
}

export interface UpdateSpinMilestoneRulePayload extends Partial<CreateSpinMilestoneRulePayload> {}

export interface GrantSpinsPayload {
  userId: string
  amount: number
}

export interface GrantSpinsResult {
  success: boolean
  spinsAvailable: number
}

export interface SpinHistoryEntry {
  id: string
  userId: string
  userName: string | null
  userPhone: string | null
  prizeType: SpinPrizeType
  prizeLabel: string
  prizeValue: number | null
  isWin: boolean
  rewardStatus: SpinRewardStatus
  rewardRef: string | null
  spunAt: string
}

export interface SpinHistoryResult {
  total: number
  entries: SpinHistoryEntry[]
}

export interface SpinHistoryFilters {
  limit?: number
  offset?: number
  userId?: string
}
