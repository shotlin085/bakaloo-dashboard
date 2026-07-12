import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  TutorialVideo,
  CreateTutorialPayload,
  UpdateTutorialPayload,
} from "@/types/tutorial.types"

export async function getTutorials(): Promise<TutorialVideo[]> {
  const { data } = await api.get<ApiResponse<TutorialVideo[]>>("/admin/tutorials")
  return Array.isArray(data.data) ? data.data : []
}

export async function createTutorial(
  payload: CreateTutorialPayload
): Promise<TutorialVideo> {
  const { data } = await api.post<ApiResponse<TutorialVideo>>("/admin/tutorials", payload)
  return data.data
}

export async function updateTutorial(
  id: string,
  payload: UpdateTutorialPayload
): Promise<TutorialVideo> {
  const { data } = await api.put<ApiResponse<TutorialVideo>>(
    `/admin/tutorials/${id}`,
    payload
  )
  return data.data
}

export async function deleteTutorial(id: string): Promise<void> {
  await api.delete(`/admin/tutorials/${id}`)
}

export async function reorderTutorials(orderedIds: string[]): Promise<void> {
  await api.put("/admin/tutorials/reorder", { orderedIds })
}
