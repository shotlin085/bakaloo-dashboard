import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type {
  BusinessAccount,
  BusinessAccountFilters,
  ApproveBusinessAccountPayload,
  RejectBusinessAccountPayload,
  LedgerAccount,
  LedgerAccountFilters,
  SetupLedgerAccountPayload,
  UpdateLedgerLimitsPayload,
  RepayLedgerAccountPayload,
  LedgerTransaction,
  LedgerBillingCycle,
  MarkLedgerCyclePaidPayload,
} from "@/types/b2b.types"

type Pagination = { page: number; limit: number; total: number; totalPages: number }
interface ListPaginationParams {
  page?: number
  limit?: number
}

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

/* ── B2B Ledger (credit line) ────────────────────────────────────── */

export async function getLedgerAccounts(filters: LedgerAccountFilters = {}) {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.status) params.status = filters.status

  const { data } = await api.get<
    ApiResponse<{ accounts: LedgerAccount[]; pagination: Pagination }>
  >("/admin/ledger", { params })

  return {
    accounts: Array.isArray(data.data?.accounts) ? data.data.accounts : [],
    pagination: data.data?.pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function getLedgerAccountDetail(id: string) {
  const { data } = await api.get<ApiResponse<LedgerAccount>>(`/admin/ledger/${id}`)
  return data.data
}

export async function setupLedgerAccount(businessAccountId: string, payload: SetupLedgerAccountPayload) {
  const { data } = await api.post<ApiResponse<LedgerAccount>>(
    `/admin/ledger/${businessAccountId}/setup`,
    payload
  )
  return data.data
}

export async function updateLedgerLimits(id: string, payload: UpdateLedgerLimitsPayload) {
  const { data } = await api.patch<ApiResponse<LedgerAccount>>(`/admin/ledger/${id}/limits`, payload)
  return data.data
}

export async function setLedgerStatus(id: string, status: LedgerAccount["status"]) {
  const { data } = await api.patch<ApiResponse<LedgerAccount>>(`/admin/ledger/${id}/status`, { status })
  return data.data
}

export async function repayLedgerAccount(id: string, payload: RepayLedgerAccountPayload) {
  const { data } = await api.post<
    ApiResponse<{ account: LedgerAccount; transaction: LedgerTransaction }>
  >(`/admin/ledger/${id}/repay`, payload)
  return data.data
}

export async function getLedgerCycles(id: string, filters: ListPaginationParams = {}) {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit

  const { data } = await api.get<ApiResponse<LedgerBillingCycle[]> & { pagination?: Pagination }>(
    `/admin/ledger/${id}/cycles`,
    { params }
  )

  return {
    cycles: Array.isArray(data.data) ? data.data : [],
    pagination: data.pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function markLedgerCyclePaid(cycleId: string, payload: MarkLedgerCyclePaidPayload = {}) {
  const { data } = await api.post<ApiResponse<LedgerBillingCycle>>(
    `/admin/ledger/cycles/${cycleId}/mark-paid`,
    payload
  )
  return data.data
}
