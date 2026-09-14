import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  NavButton,
  CreateNavButtonPayload,
  UpdateNavButtonPayload,
} from "@/types/nav-button.types"

export async function getNavButtons(): Promise<NavButton[]> {
  const { data } = await api.get<ApiResponse<NavButton[]>>("/admin/nav-buttons")
  return Array.isArray(data.data) ? data.data : []
}

export async function getNavButton(id: string): Promise<NavButton> {
  const { data } = await api.get<ApiResponse<NavButton>>(`/admin/nav-buttons/${id}`)
  return data.data
}

export async function createNavButton(
  payload: CreateNavButtonPayload
): Promise<NavButton> {
  const { data } = await api.post<ApiResponse<NavButton>>("/admin/nav-buttons", payload)
  return data.data
}

export async function updateNavButton(
  id: string,
  payload: UpdateNavButtonPayload
): Promise<NavButton> {
  const { data } = await api.put<ApiResponse<NavButton>>(
    `/admin/nav-buttons/${id}`,
    payload
  )
  return data.data
}

export async function deleteNavButton(id: string): Promise<void> {
  await api.delete(`/admin/nav-buttons/${id}`)
}

export async function reorderNavButtons(orderedIds: string[]): Promise<void> {
  await api.put("/admin/nav-buttons/reorder", { orderedIds })
}
