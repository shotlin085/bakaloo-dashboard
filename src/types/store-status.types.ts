import type { Weekday } from "@/types/common.types"

/**
 * Store Status types — mirror the backend `store_status` singleton table
 * (bakaloo-backend migration 071). This app is a single storefront: there
 * is exactly one global row, not one per shop.
 */

export interface WeekdayHours {
  open: string
  close: string
  closed: boolean
}

export type WeeklyHours = Partial<Record<Weekday, WeekdayHours>>

export type StoreStatusSource = "MANUAL_OVERRIDE" | "WEEKLY_SCHEDULE" | "DEFAULT"

/** Public/admin "is the store open right now" result. */
export interface StoreStatus {
  isOpen: boolean
  source: StoreStatusSource
  reason: string | null
}

/** Full admin detail — status plus the configured weekly schedule. */
export interface StoreStatusDetail extends StoreStatus {
  weeklyHours: WeeklyHours
}

export interface SetOverridePayload {
  status: "OPEN" | "CLOSED" | null
  note?: string
}
