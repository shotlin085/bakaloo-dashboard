import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  AppSettings,
  UpdateSettingsPayload,
} from "@/types/settings.types"

export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get<ApiResponse<AppSettings>>("/admin/settings")
  return data.data
}

export async function updateSettings(
  payload: UpdateSettingsPayload
): Promise<AppSettings> {
  const { data } = await api.put<ApiResponse<AppSettings>>(
    "/admin/settings",
    payload
  )
  return data.data
}
