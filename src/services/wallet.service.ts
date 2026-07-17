import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  WalletTransaction,
  WalletTransactionFilters,
  AdminCreditPayload,
  AdminDebitPayload,
  WalletOverviewStats,
} from "@/types/wallet.types"

/** Get transaction list for all users (admin view) with optional userId filter */
export async function getWalletTransactions(
  filters: WalletTransactionFilters = {}
): Promise<{
  data: WalletTransaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.type) params.type = filters.type
  if (filters.userId) params.userId = filters.userId

  const { data } = await api.get<
    ApiResponse<WalletTransaction[]> & {
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }
  >("/wallet/admin/transactions", { params })

  const txns = Array.isArray(data.data) ? data.data : []
  return {
    data: txns,
    pagination: (data as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } })
      .pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: txns.length,
      totalPages: 1,
    },
  }
}

/** Admin credit a user's wallet */
export async function adminCreditWallet(
  userId: string,
  payload: AdminCreditPayload
): Promise<{ wallet: { balance: number }; transaction: WalletTransaction }> {
  const { data } = await api.post<
    ApiResponse<{ wallet: { balance: number }; transaction: WalletTransaction }>
  >(`/wallet/admin/${userId}/credit`, payload)
  return data.data
}

/** Admin debit a user's wallet */
export async function adminDebitWallet(
  userId: string,
  payload: AdminDebitPayload
): Promise<{ wallet: { balance: number }; transaction: WalletTransaction }> {
  const { data } = await api.post<
    ApiResponse<{ wallet: { balance: number }; transaction: WalletTransaction }>
  >(`/wallet/admin/${userId}/debit`, payload)
  return data.data
}

/** Get wallet overview stats */
export async function getWalletOverviewStats(): Promise<WalletOverviewStats> {
  try {
    const { data } = await api.get<ApiResponse<WalletOverviewStats>>("/wallet/admin/stats")
    return data.data
  } catch {
    return { totalBalance: 0, totalAdded: 0, totalUsed: 0, totalRefunded: 0 }
  }
}
