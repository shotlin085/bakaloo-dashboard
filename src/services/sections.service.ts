import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CreateSectionPayload,
  ReorderSectionsPayload,
  RollbackPayload,
  ScheduleSectionLayoutPayload,
  SectionManifest,
  SectionManifestVersion,
  UpdateSectionMerchPayload,
  UpdateSectionPayload,
} from "@/types/theme.types"

export async function getSections(tabId: string): Promise<SectionManifest[]> {
  const { data } = await api.get<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}`
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
  payload: ReorderSectionsPayload
): Promise<SectionManifest[]> {
  const { data } = await api.patch<ApiResponse<SectionManifest[]>>(
    `/admin/sections/${tabId}/reorder`,
    payload
  )
  return data.data
}

export async function duplicateSection(id: string): Promise<SectionManifest> {
  const { data } = await api.post<ApiResponse<SectionManifest>>(
    `/admin/sections/${id}/duplicate`
  )
  return data.data
}

export async function getSectionVersions(
  tabId: string
): Promise<SectionManifestVersion[]> {
  const { data } = await api.get<ApiResponse<SectionManifestVersion[]>>(
    `/admin/sections/${tabId}/versions`
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
  payload: ScheduleSectionLayoutPayload
): Promise<SectionManifestVersion> {
  const { data } = await api.post<ApiResponse<SectionManifestVersion>>(
    `/admin/sections/${tabId}/schedule`,
    payload
  )
  return data.data
}

export async function cancelSectionSchedule(
  tabId: string
): Promise<{ tab_id: string; cancelled_count: number }> {
  const { data } = await api.delete<
    ApiResponse<{ tab_id: string; cancelled_count: number }>
  >(`/admin/sections/${tabId}/schedule`)
  return data.data
}
