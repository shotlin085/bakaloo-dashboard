import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CreateThemePayload,
  RollbackPayload,
  ScheduleThemePayload,
  Theme,
  ThemeVersion,
  UpdateThemePayload,
} from "@/types/theme.types"

export async function getThemes(): Promise<Theme[]> {
  const { data } = await api.get<ApiResponse<Theme[]>>("/admin/themes")
  return data.data
}

export async function getTheme(id: string): Promise<Theme> {
  const { data } = await api.get<ApiResponse<Theme>>(`/admin/themes/${id}`)
  return data.data
}

export async function createTheme(payload: CreateThemePayload): Promise<Theme> {
  const { data } = await api.post<ApiResponse<Theme>>("/admin/themes", payload)
  return data.data
}

export async function updateTheme(
  id: string,
  payload: UpdateThemePayload
): Promise<Theme> {
  const { data } = await api.put<ApiResponse<Theme>>(
    `/admin/themes/${id}`,
    payload
  )
  return data.data
}

export async function activateTheme(id: string): Promise<Theme> {
  const { data } = await api.put<ApiResponse<Theme>>(
    `/admin/themes/${id}/activate`
  )
  return data.data
}

export async function deleteTheme(id: string): Promise<void> {
  await api.delete(`/admin/themes/${id}`)
}

export async function getTabThemes(): Promise<Theme[]> {
  const { data } = await api.get<ApiResponse<Theme[]>>("/admin/themes/tabs")
  return data.data
}

export async function scheduleTheme(
  id: string,
  payload: ScheduleThemePayload
): Promise<Theme> {
  const { data } = await api.post<ApiResponse<Theme>>(
    `/admin/themes/${id}/schedule`,
    payload
  )
  return data.data
}

export async function cancelSchedule(id: string): Promise<Theme> {
  const { data } = await api.delete<ApiResponse<Theme>>(
    `/admin/themes/${id}/schedule`
  )
  return data.data
}

export async function getThemeVersions(id: string): Promise<ThemeVersion[]> {
  const { data } = await api.get<ApiResponse<ThemeVersion[]>>(
    `/admin/themes/${id}/versions`
  )
  return data.data
}

export async function rollbackThemeVersion(
  themeId: string,
  payload: RollbackPayload
): Promise<Theme> {
  const { data } = await api.post<ApiResponse<Theme>>(
    `/admin/themes/${themeId}/rollback`,
    payload
  )
  return data.data
}
