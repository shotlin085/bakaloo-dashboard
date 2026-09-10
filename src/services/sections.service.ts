import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CreateSectionPayload,
  ReorderSectionsPayload,
  RollbackPayload,
  ScheduleSectionLayoutPayload,
  SectionManifest,
  SectionManifestVersion,
  ThemeAudience,
  UpdateSectionMerchPayload,
  UpdateSectionPayload,
} from "@/types/theme.types"

export async function getSections(
  tabId: string,
  audience: ThemeAudience = "B2C"
): Promise<SectionManifest[]> {
  const { data } = await api.get<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}`,
    { params: { audience } }
  )
  return data.data
}

export async function getSection(id: string): Promise<SectionManifest> {
  const { data } = await api.get<ApiResponse<SectionManifest>>(
    `/admin/sections/item/${id}`
  )
  return data.data
}

export async function addSection(
  tabId: string,
  payload: CreateSectionPayload
): Promise<SectionManifest> {
  const { data } = await api.post<ApiResponse<SectionManifest>>(
    `/admin/sections/${tabId}`,
    payload
  )
  return data.data
}

export async function updateSection(
  id: string,
  payload: UpdateSectionPayload
): Promise<SectionManifest> {
  const { data } = await api.put<ApiResponse<SectionManifest>>(
    `/admin/sections/${id}`,
    payload
  )
  return data.data
}

export async function updateSectionMerch(
  id: string,
  payload: UpdateSectionMerchPayload
): Promise<SectionManifest> {
  const { data } = await api.put<ApiResponse<SectionManifest>>(
    `/admin/sections/${id}/merch`,
    payload
  )
  return data.data
}

export async function deleteSection(id: string): Promise<SectionManifest> {
  const { data } = await api.delete<ApiResponse<SectionManifest>>(
    `/admin/sections/${id}`
  )
  return data.data
}

export async function reorderSections(
  tabId: string,
  payload: ReorderSectionsPayload,
  audience: ThemeAudience = "B2C"
): Promise<SectionManifest[]> {
  const { data } = await api.patch<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}/reorder`,
    payload,
    { params: { audience } }
  )
  return data.data
}

export async function duplicateSection(id: string): Promise<SectionManifest> {
  const { data } = await api.post<ApiResponse<SectionManifest>>(
    `/admin/sections/${id}/duplicate`
  )
  return data.data
}

/**
 * "Copy B2C to B2B" — bootstraps a tab's B2B section list from its current
 * B2C one. Refuses (400, code B2B_SECTIONS_EXIST) if the tab already has
 * B2B sections, so the admin never accidentally clobbers real B2B work.
 */
export async function copySectionsToB2B(tabId: string): Promise<SectionManifest[]> {
  const { data } = await api.post<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}/copy-to-b2b`
  )
  return data.data
}

export async function getSectionVersions(
  tabId: string,
  audience: ThemeAudience = "B2C"
): Promise<SectionManifestVersion[]> {
  const { data } = await api.get<ApiResponse<SectionManifestVersion[]>>(
    `/admin/sections/${tabId}/versions`,
    { params: { audience } }
  )
  return data.data
}

export async function rollbackSectionVersion(
  tabId: string,
  payload: RollbackPayload
): Promise<SectionManifest[]> {
  const { data } = await api.post<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}/rollback`,
    payload
  )
  return data.data
}

export async function scheduleSectionLayout(
  tabId: string,
  payload: ScheduleSectionLayoutPayload,
  audience: ThemeAudience = "B2C"
): Promise<SectionManifestVersion> {
  const { data } = await api.post<ApiResponse<SectionManifestVersion>>(
    `/admin/sections/${tabId}/schedule`,
    payload,
    { params: { audience } }
  )
  return data.data
}

export async function cancelSectionSchedule(
  tabId: string,
  audience: ThemeAudience = "B2C"
): Promise<{ tab_id: string; cancelled_count: number }> {
  const { data } = await api.delete<
    ApiResponse<{ tab_id: string; cancelled_count: number }>
  >(`/admin/sections/${tabId}/schedule`, { params: { audience } })
  return data.data
}
