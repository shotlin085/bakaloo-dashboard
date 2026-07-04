/**
 * Delivery Calendar types — mirror the backend `delivery_calendar_*` tables
 * (bakaloo-backend migration 072) field-for-field, snake_case, same
 * convention as Shop.operating_hours/FeeSettings/Banner (no camelCase
 * mapping layer). Single global schedule (this app is one storefront,
 * not per-shop).
 */

export interface WeeklyTemplateRow {
  id?: string
  weekday: number // 0=Sunday .. 6=Saturday
  is_available: boolean
  start_time: string // "HH:MM"
  end_time: string
  label: string
  display_order?: number
}

export interface CalendarSlot {
  id: string
  start_time: string
  end_time: string
  label: string
  is_active: boolean
  display_order: number
}

export interface CalendarDay {
  id: string
  calendar_date: string // "YYYY-MM-DD"
  is_available: boolean
  note: string | null
  slots: CalendarSlot[]
}

export interface SetDayOverridePayload {
  is_available: boolean
  note?: string
  slots?: Array<{
    start_time: string
    end_time: string
    label: string
    is_active?: boolean
    display_order?: number
  }>
}

export interface GenerateCalendarResult {
  generated: number
}
