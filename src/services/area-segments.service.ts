import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  AreaSegment,
  CreateAreaSegmentPayload,
  UpdateAreaSegmentPayload,
  AreaSegmentAddress,
  AreaSegmentCandidate,
  AreaSegmentActiveOrder,
  CustomerAddressOption,
} from "@/types/area-segment.types"

export async function getAreaSegments(): Promise<AreaSegment[]> {
  const { data } = await api.get<ApiResponse<AreaSegment[]>>("/admin/area-segments")
  return data.data
}

export async function getAreaSegment(id: string): Promise<AreaSegment> {
  const { data } = await api.get<ApiResponse<AreaSegment>>(`/admin/area-segments/${id}`)
  return data.data
}

export async function createAreaSegment(payload: CreateAreaSegmentPayload): Promise<AreaSegment> {
  const { data } = await api.post<ApiResponse<AreaSegment>>("/admin/area-segments", payload)
  return data.data
}

export async function updateAreaSegment(id: string, payload: UpdateAreaSegmentPayload): Promise<AreaSegment> {
  const { data } = await api.patch<ApiResponse<AreaSegment>>(`/admin/area-segments/${id}`, payload)
  return data.data
}

export async function deleteAreaSegment(id: string): Promise<void> {
  await api.delete(`/admin/area-segments/${id}`)
}

export async function getAreaSegmentAddresses(
  id: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ addresses: AreaSegmentAddress[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const { data } = await api.get<
    ApiResponse<AreaSegmentAddress[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } }
  >(`/admin/area-segments/${id}/addresses`, { params })
  return { addresses: data.data, pagination: data.pagination }
}

export async function addAreaSegmentAddress(
  id: string,
  payload: { userId: string; addressId: string }
): Promise<{ added: boolean; conflicts: { id: string; name: string; is_active: boolean }[] }> {
  const { data } = await api.post<ApiResponse<{ added: boolean; conflicts: { id: string; name: string; is_active: boolean }[] }>>(
    `/admin/area-segments/${id}/addresses`,
    payload
  )
  return data.data
}

export async function removeAreaSegmentAddress(id: string, addressId: string): Promise<void> {
  await api.delete(`/admin/area-segments/${id}/addresses/${addressId}`)
}

export async function getAreaSegmentActiveOrders(id: string): Promise<AreaSegmentActiveOrder[]> {
  const { data } = await api.get<ApiResponse<AreaSegmentActiveOrder[]>>(`/admin/area-segments/${id}/active-orders`)
  return data.data
}

export async function searchAreaSegmentCandidates(q: string): Promise<AreaSegmentCandidate[]> {
  const { data } = await api.get<ApiResponse<AreaSegmentCandidate[]>>("/admin/area-segments/search-candidates", {
    params: { q },
  })
  return data.data
}

export async function getCustomerAddressesForSegment(userId: string): Promise<CustomerAddressOption[]> {
  const { data } = await api.get<ApiResponse<CustomerAddressOption[]>>(
    `/admin/area-segments/customers/${userId}/addresses`
  )
  return data.data
}
