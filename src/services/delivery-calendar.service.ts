import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CalendarDay,
  GenerateCalendarResult,
  SetDayOverridePayload,
  WeeklyTemplateRow,
} from "@/types/delivery-calendar.types"

/**
 * Delivery Calendar service — talks to `/api/v1/admin/delivery-calendar`
 * (bakaloo-backend migration 072, single global schedule).
 */
export const deliveryCalendarService = {
  async getTemplate(): Promise<WeeklyTemplateRow[]> {
    const { data } = await api.get<ApiResponse<{ rows: WeeklyTemplateRow[] }>>(
      "/admin/delivery-calendar/template",
    )
    return data.data.rows
  },

  async updateTemplate(rows: WeeklyTemplateRow[]): Promise<WeeklyTemplateRow[]> {
    const { data } = await api.put<ApiResponse<{ rows: WeeklyTemplateRow[] }>>(
      "/admin/delivery-calendar/template",
      { rows },
    )
    return data.data.rows
  },

  async getDays(from: string, to: string): Promise<CalendarDay[]> {
    const { data } = await api.get<ApiResponse<{ days: CalendarDay[] }>>(
      "/admin/delivery-calendar/days",
      { params: { from, to } },
    )
    return data.data.days
  },

  async setDayOverride(date: string, payload: SetDayOverridePayload): Promise<CalendarDay> {
    const { data } = await api.patch<ApiResponse<CalendarDay>>(
      `/admin/delivery-calendar/days/${date}`,
      payload,
    )
    return data.data
  },

  async generate(numDays = 30): Promise<GenerateCalendarResult> {
    const { data } = await api.post<ApiResponse<GenerateCalendarResult>>(
      "/admin/delivery-calendar/generate",
      { numDays },
    )
    return data.data
  },
}
