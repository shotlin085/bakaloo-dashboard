export type ScratchPrizeType =
  | "FREE_DELIVERY"
  | "PERCENTAGE_OFF"
  | "FLAT_OFF"
  | "BUY_ONE_GET_ONE"
  | "CASHBACK"
  | "BETTER_LUCK"

// No BETTER_LUCK — the first-time reward pool exists to guarantee a real
// win on a customer's first-ever scratch, so that type never applies here.
export type ScratchFirstTimePrizeType = Exclude<ScratchPrizeType, "BETTER_LUCK">

export type ScratchIconKey =
  | "shopping_cart"
  | "percent"
  | "basket"
  | "coins"
  | "gift"
  | "sad_face"
  | "star"
  | "ticket"

export type ScratchTriggerMode = "ALWAYS_ON_LOGIN" | "MILESTONE_ONLY" | "MANUAL_ONLY"

export type ScratchMilestoneType = "ORDER_COUNT" | "TOTAL_SPEND"

export type ScratchRewardStatus = "ISSUED" | "FAILED" | "N_A"

export interface ScratchPrize {
  id: string
  type: ScratchPrizeType
  iconKey: ScratchIconKey
  label: string
  value: number | null
  winProbability: number
  displayOrder: number
  isActive: boolean
  linkedCouponId: string | null
  createdAt: string
}

export interface CreateScratchPrizePayload {
  type: ScratchPrizeType
  iconKey?: ScratchIconKey
  label: string
  value?: number | null
  winProbability?: number
  isActive?: boolean
  linkedCouponId?: string | null
}

export type UpdateScratchPrizePayload = Partial<CreateScratchPrizePayload>

export interface ScratchFirstTimePrize {
  id: string
  type: ScratchFirstTimePrizeType
  iconKey: ScratchIconKey
  label: string
  value: number | null
  winProbability: number
  displayOrder: number
  isActive: boolean
  linkedCouponId: string | null
  createdAt: string
}

export interface CreateScratchFirstTimePrizePayload {
  type: ScratchFirstTimePrizeType
  iconKey?: ScratchIconKey
  label: string
  value?: number | null
  winProbability?: number
  isActive?: boolean
  linkedCouponId?: string | null
}

export type UpdateScratchFirstTimePrizePayload = Partial<CreateScratchFirstTimePrizePayload>

export interface ScratchCardSettings {
  id: string
  dailyFreeScratches: number
  triggerMode: ScratchTriggerMode
  firstTimeRewardEnabled: boolean
  coverImageUrl: string | null
  coverImagePublicId: string | null
  updatedAt: string
}

export interface UpdateScratchCardSettingsPayload {
  dailyFreeScratches?: number
  triggerMode?: ScratchTriggerMode
  firstTimeRewardEnabled?: boolean
  coverImageUrl?: string | null
  coverImagePublicId?: string | null
}

export interface ScratchMilestoneRule {
  id: string
  milestoneType: ScratchMilestoneType
  threshold: number
  bonusScratches: number
  isRepeating: boolean
  isActive: boolean
  createdAt: string
}

export interface CreateScratchMilestoneRulePayload {
  milestoneType: ScratchMilestoneType
  threshold: number
  bonusScratches?: number
  isRepeating?: boolean
  isActive?: boolean
}

export type UpdateScratchMilestoneRulePayload = Partial<CreateScratchMilestoneRulePayload>

export interface GrantScratchesPayload {
  userId: string
  amount: number
}

export interface GrantScratchesResult {
  success: boolean
  scratchesAvailable: number
}

export interface ScratchHistoryEntry {
  id: string
  userId: string
  userName: string | null
  userPhone: string | null
  prizeType: ScratchPrizeType
  prizeLabel: string
  prizeValue: number | null
  isWin: boolean
  rewardStatus: ScratchRewardStatus
  rewardRef: string | null
  isFirstTimeReward: boolean
  scratchedAt: string
}

export interface ScratchHistoryResult {
  total: number
  entries: ScratchHistoryEntry[]
}

export interface ScratchHistoryFilters {
  limit?: number
  offset?: number
  userId?: string
}
