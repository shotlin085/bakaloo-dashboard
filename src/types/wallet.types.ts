/** Wallet entity */
export interface Wallet {
  id: string
  userId: string
  balance: number
  createdAt: string
  updatedAt: string
}

/** Wallet transaction */
export interface WalletTransaction {
  id: string
  walletId: string
  type: "CREDIT" | "DEBIT"
  subType?: "REFUND" | "BONUS" | "SCRATCH" | "CASHBACK" | "ORDER" | "TOPUP" | null
  amount: number
  description: string
  referenceId: string | null
  balanceAfter: number | null
  status?: "PENDING" | "COMPLETED" | "FAILED"
  createdAt: string
  /** Admin view fields — present when fetching via /admin/transactions */
  userId?: string
  userName?: string | null
  userPhone?: string | null
}

/** Transaction filters */
export interface WalletTransactionFilters {
  page?: number
  limit?: number
  type?: "CREDIT" | "DEBIT" | "REFUND" | null
  userId?: string
}

/** Wallet overview stats */
export interface WalletOverviewStats {
  totalBalance: number
  totalAdded: number
  totalUsed: number
  totalRefunded: number
}

/** Admin credit payload */
export interface AdminCreditPayload {
  amount: number
  description?: string
  referenceId?: string
}
