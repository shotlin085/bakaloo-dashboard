import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  Rider,
  RiderDetail,
  RiderLiveLocation,
  RiderEarnings,
  RiderPayout,
  RiderDocument,
  RiderFilters,
  CreatePayoutPayload,
} from "@/types/rider.types"

function toNumberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRiderCoords<
  T extends { current_lat: unknown; current_lng: unknown }
>(raw: T): T & { current_lat: number | null; current_lng: number | null } {
  return {
    ...raw,
    current_lat: toNumberOrNull(raw.current_lat),
    current_lng: toNumberOrNull(raw.current_lng),
  }
}

export async function getRiders(
  filters: RiderFilters = {}
): Promise<{ riders: Rider[]; total: number }> {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search) params.search = filters.search
  if (filters.status) params.status = filters.status
  if (filters.sortBy) params.sortBy = filters.sortBy
  if (filters.sortOrder) params.sortOrder = filters.sortOrder

  const { data } = await api.get<
    ApiResponse<{ riders: Rider[]; total: number }>
  >("/admin/riders", { params })

  const result = data.data
  return {
    riders: (result?.riders ?? []).map((rider) => normalizeRiderCoords(rider)),
    total: result?.total ?? 0,
  }
}

export async function getRiderDetail(id: string): Promise<RiderDetail> {
  const { data } = await api.get<ApiResponse<RiderDetail>>(
    `/admin/riders/${id}`
  )
  return normalizeRiderCoords(data.data)
}

export async function getRiderLiveLocations(): Promise<RiderLiveLocation[]> {
  const { data } = await api.get<ApiResponse<RiderLiveLocation[]>>(
    "/admin/riders/live-locations"
  )
  if (!Array.isArray(data.data)) {
    return []
  }
  return data.data.map((item) => normalizeRiderCoords(item))
}

export async function getRiderEarnings(
  id: string,
  params?: { startDate?: string; endDate?: string }
): Promise<RiderEarnings> {
  const { data } = await api.get<ApiResponse<RiderEarnings>>(
    `/admin/riders/${id}/earnings`,
    { params }
  )
  return data.data
}

export async function getRiderPayouts(id: string): Promise<RiderPayout[]> {
  const { data } = await api.get<ApiResponse<RiderPayout[]>>(
    `/admin/riders/${id}/payouts`
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function createRiderPayout(
  riderId: string,
  payload: CreatePayoutPayload
): Promise<RiderPayout> {
  const { data } = await api.post<ApiResponse<RiderPayout>>(
    `/admin/riders/${riderId}/payouts`,
    payload
  )
  return data.data
}

export async function toggleRiderSuspend(
  id: string,
  suspended: boolean
): Promise<{ id: string; name: string; is_active: boolean }> {
  const { data } = await api.put<
    ApiResponse<{ id: string; name: string; is_active: boolean }>
  >(`/admin/riders/${id}/suspend`, { suspended })
  return data.data
}

export async function approveRider(
  id: string,
  is_approved: boolean
): Promise<{ user_id: string; is_approved: boolean }> {
  const { data } = await api.put<
    ApiResponse<{ user_id: string; is_approved: boolean }>
  >(`/admin/riders/${id}/approve`, { is_approved })
  return data.data
}

export async function updateRiderCommission(
  id: string,
  rate: number
): Promise<{ user_id: string; commission_rate: number }> {
  const { data } = await api.put<
    ApiResponse<{ user_id: string; commission_rate: number }>
  >(`/admin/riders/${id}/commission`, { rate })
  return data.data
}

export async function getRiderDocuments(id: string): Promise<RiderDocument[]> {
  const { data } = await api.get<ApiResponse<RiderDocument[]>>(
    `/admin/riders/${id}/documents`
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function verifyRiderDocument(
  riderId: string,
  documentId: string,
  payload: { status: "APPROVED" | "REJECTED"; note?: string }
): Promise<RiderDocument> {
  const { data } = await api.put<ApiResponse<RiderDocument>>(
    `/admin/riders/${riderId}/documents/${documentId}/verify`,
    payload
  )
  return data.data
}
