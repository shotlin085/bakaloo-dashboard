import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCustomers,
  getCustomerDetail,
  getCustomerOrders,
  toggleBlockCustomer,
  creditCustomerWallet,
  notifyCustomer,
  exportCustomersCsv,
} from "@/services/customers.service"
import type { CustomerFilters } from "@/types"
import { toast } from "sonner"

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: () => getCustomers(filters),
    staleTime: 30 * 1000,
  })
}

export function useCustomerDetail(customerId: string | null) {
  return useQuery({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => getCustomerDetail(customerId!),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  })
}

export function useCustomerOrders(customerId: string | null, page = 1) {
  return useQuery({
    queryKey: ["customers", "orders", customerId, page],
    queryFn: () => getCustomerOrders(customerId!, page),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  })
}

export function useToggleBlockCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      toggleBlockCustomer(id, blocked),
    onSuccess: (_, { blocked }) => {
      toast.success(blocked ? "Customer blocked" : "Customer unblocked")
      qc.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update customer"),
  })
}

export function useCreditWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      amount,
      description,
    }: {
      id: string
      amount: number
      description?: string
    }) => creditCustomerWallet(id, { amount, description }),
    onSuccess: () => {
      toast.success("Wallet credited")
      qc.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to credit wallet"),
  })
}

export function useNotifyCustomer() {
  return useMutation({
    mutationFn: ({
      id,
      title,
      body,
    }: {
      id: string
      title: string
      body: string
    }) => notifyCustomer(id, { title, body }),
    onSuccess: () => toast.success("Notification sent"),
    onError: (e: Error) => toast.error(e.message || "Failed to send notification"),
  })
}

export function useExportCustomers() {
  return useMutation({
    mutationFn: () => exportCustomersCsv(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Customers exported!")
    },
    onError: () => toast.error("Failed to export customers"),
  })
}
