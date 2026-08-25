import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type { LegalPage, UpdateLegalPagePayload } from "@/types/legal-page.types"

export async function getLegalPages(): Promise<LegalPage[]> {
  const { data } = await api.get<ApiResponse<LegalPage[]>>("/admin/legal-pages")
  return Array.isArray(data.data) ? data.data : []
}

export async function getLegalPage(slug: string): Promise<LegalPage> {
  const { data } = await api.get<ApiResponse<LegalPage>>(`/admin/legal-pages/${slug}`)
  return data.data
}

export async function updateLegalPage(
  slug: string,
  payload: UpdateLegalPagePayload
): Promise<LegalPage> {
  const { data } = await api.put<ApiResponse<LegalPage>>(
    `/admin/legal-pages/${slug}`,
    payload
  )
  return data.data
}
