import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  SetOverridePayload,
  StoreStatusDetail,
  WeeklyHours,
} from "@/types/store-status.types"

/**
 * Store Status service — talks to `/api/v1/admin/store-status` (the
 * global "is the storefront open" singleton, bakaloo-backend migration 071).
 */
export const storeStatusService = {
  /** Fetch full detail: current open/closed state plus the weekly schedule. */
  async get(): Promise<StoreStatusDetail> {
    const { data } = await api.get<ApiResponse<StoreStatusDetail>>("/admin/store-status")
    return data.data
  },

  /** Set (status: "OPEN"/"CLOSED") or clear (status: null) the manual override. */
  async setOverride(payload: SetOverridePayload): Promise<StoreStatusDetail> {
    const { data } = await api.put<ApiResponse<StoreStatusDetail>>(
      "/admin/store-status/override",
      payload,
    )
    return data.data
  },

  /** Bulk-replace the weekly hours schedule. */
  async updateWeeklyHours(weeklyHours: WeeklyHours): Promise<StoreStatusDetail> {
    const { data } = await api.put<ApiResponse<StoreStatusDetail>>(
      "/admin/store-status/weekly-hours",
      { weeklyHours },
    )
    return data.data
  },
}
