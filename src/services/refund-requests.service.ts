import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type {
  RefundRequest,
  RefundRequestFilters,
  ApproveRefundRequestPayload,
  RejectRefundRequestPayload,
} from "@/types/refund-request.types"

export async function getRefundRequests(filters: RefundRequestFilters = {}) {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search) params.search = filters.search
  if (filters.status) params.status = filters.status
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate

  const { data } = await api.get<
    ApiResponse<{
      requests: RefundRequest[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>
  >("/admin/refund-requests", { params })

  return {
    requests: Array.isArray(data.data?.requests) ? data.data.requests : [],
    pagination: data.data?.pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function getRefundRequestDetail(id: string) {
  const { data } = await api.get<ApiResponse<RefundRequest>>(`/admin/refund-requests/${id}`)
  return data.data
}

export async function approveRefundRequest(id: string, payload: ApproveRefundRequestPayload) {
  const { data } = await api.post<ApiResponse<RefundRequest>>(
    `/admin/refund-requests/${id}/approve`,
    payload
  )
  return data.data
}

export async function rejectRefundRequest(id: string, payload: RejectRefundRequestPayload) {
  const { data } = await api.post<ApiResponse<RefundRequest>>(
    `/admin/refund-requests/${id}/reject`,
    payload
  )
  return data.data
}
