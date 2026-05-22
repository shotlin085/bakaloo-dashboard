import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getWalletTransactions,
  adminCreditWallet,
  getWalletOverviewStats,
} from "@/services/wallet.service"
import type { WalletTransactionFilters, AdminCreditPayload } from "@/types/wallet.types"

export function useWalletStats() {
  return useQuery({
    queryKey: ["wallet", "overview-stats"],
    queryFn: getWalletOverviewStats,
    staleTime: 60_000,
  })
}

export function useWalletTransactions(filters: WalletTransactionFilters = {}) {
  return useQuery({
    queryKey: ["wallet", "transactions", filters],
    queryFn: () => getWalletTransactions(filters),
    staleTime: 30_000,
  })
}

export function useAdminCredit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AdminCreditPayload }) =>
      adminCreditWallet(userId, payload),
    onSuccess: () => {
      toast.success("Wallet credited successfully")
      qc.invalidateQueries({ queryKey: ["wallet"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to credit wallet")
    },
  })
}
