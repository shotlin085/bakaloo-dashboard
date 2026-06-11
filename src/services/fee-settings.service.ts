import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  FeeSettings,
  UpdateFeeSettingsPayload,
  FeePreview,
  FeePreviewInput,
} from "@/types/fee-settings.types"

/**
 * Fee Settings service — talks to the canonical
 * `/api/v1/admin/fee-settings` endpoints (dynamic fee + delivery engine).
 */
export const feeSettingsService = {
  /** Fetch the effective global fee configuration. */
  async get(): Promise<FeeSettings> {
    const { data } = await api.get<ApiResponse<FeeSettings>>("/admin/fee-settings")
    return data.data
  },

  /** Update the global fee configuration. */
  async update(payload: UpdateFeeSettingsPayload): Promise<FeeSettings> {
    const { data } = await api.put<ApiResponse<FeeSettings>>(
      "/admin/fee-settings",
      payload,
    )
    return data.data
  },

  /** Preview a fee breakdown for a subtotal + distance (calculator). */
  async preview(input: FeePreviewInput): Promise<FeePreview> {
    const { data } = await api.post<ApiResponse<FeePreview>>(
      "/admin/fee-settings/preview",
      input,
    )
    return data.data
  },
}
