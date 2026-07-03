import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CustomerSegment,
  CreateSegmentPayload,
  UpdateSegmentPayload,
  SegmentMember,
  SegmentCandidate,
} from "@/types/customer-segment.types"

export async function getSegments(): Promise<CustomerSegment[]> {
  const { data } = await api.get<ApiResponse<CustomerSegment[]>>("/admin/customer-segments")
  return data.data
}

export async function getSegment(id: string): Promise<CustomerSegment> {
  const { data } = await api.get<ApiResponse<CustomerSegment>>(`/admin/customer-segments/${id}`)
  return data.data
}

export async function createSegment(payload: CreateSegmentPayload): Promise<CustomerSegment> {
  const { data } = await api.post<ApiResponse<CustomerSegment>>("/admin/customer-segments", payload)
  return data.data
}

export async function updateSegment(id: string, payload: UpdateSegmentPayload): Promise<CustomerSegment> {
  const { data } = await api.patch<ApiResponse<CustomerSegment>>(`/admin/customer-segments/${id}`, payload)
  return data.data
}

export async function deleteSegment(id: string): Promise<void> {
  await api.delete(`/admin/customer-segments/${id}`)
}

export async function getSegmentMembers(
  id: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ members: SegmentMember[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const { data } = await api.get<
    ApiResponse<SegmentMember[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } }
  >(`/admin/customer-segments/${id}/members`, { params })
  return { members: data.data, pagination: data.pagination }
}

export async function addSegmentMembers(id: string, userIds: string[]): Promise<{ addedCount: number }> {
  const { data } = await api.post<ApiResponse<{ addedCount: number }>>(
    `/admin/customer-segments/${id}/members`,
    { userIds }
  )
  return data.data
}

export async function removeSegmentMember(id: string, userId: string): Promise<void> {
  await api.delete(`/admin/customer-segments/${id}/members/${userId}`)
}

export async function searchSegmentCandidates(id: string, q: string): Promise<SegmentCandidate[]> {
  const { data } = await api.get<ApiResponse<SegmentCandidate[]>>(
    `/admin/customer-segments/${id}/search-candidates`,
    { params: { q } }
  )
  return data.data
}
