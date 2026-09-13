import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type {
  BusinessAccount,
  BusinessAccountFilters,
  ApproveBusinessAccountPayload,
  RejectBusinessAccountPayload,
} from "@/types/b2b.types"

type Pagination = { page: number; limit: number; total: number; totalPages: number }

/* ── Business Accounts (B2B applications) ────────────────────────── */

export async function getBusinessAccounts(filters: BusinessAccountFilters = {}) {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.status) params.status = filters.status

  const { data } = await api.get<
    ApiResponse<{ requests: BusinessAccount[]; pagination: Pagination }>
  >("/admin/business-accounts", { params })

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

export async function getBusinessAccountDetail(id: string) {
  const { data } = await api.get<ApiResponse<BusinessAccount>>(`/admin/business-accounts/${id}`)
  return data.data
}

export async function approveBusinessAccount(id: string, payload: ApproveBusinessAccountPayload) {
  const { data } = await api.post<ApiResponse<BusinessAccount>>(
    `/admin/business-accounts/${id}/approve`,
    payload
  )
  return data.data
}

export async function rejectBusinessAccount(id: string, payload: RejectBusinessAccountPayload) {
  const { data } = await api.post<ApiResponse<BusinessAccount>>(
    `/admin/business-accounts/${id}/reject`,
    payload
  )
  return data.data
}
