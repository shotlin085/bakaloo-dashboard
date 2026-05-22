import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOrders,
  getOrderStatusCounts,
  getOrderDetail,
  updateOrderStatus,
  assignRider,
  bulkAssignRiders,
  exportOrdersCsv,
  downloadInvoice,
  refundOrder,
  cancelOrder,
  bulkUpdateStatus,
  downloadPackingSlip,
} from "@/services/orders.service"
import type { OrderFilters, UpdateOrderStatusPayload, AssignRiderPayload, RefundOrderPayload, CancelOrderPayload, BulkStatusPayload } from "@/types"
import { toast } from "sonner"

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => getOrders(filters),
    staleTime: 30 * 1000,
  })
}

export function useOrderStatusCounts() {
  return useQuery({
    queryKey: ["orders", "status-counts"],
    queryFn: getOrderStatusCounts,
    staleTime: 30 * 1000,
  })
}

export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: () => getOrderDetail(orderId!),
    enabled: !!orderId,
    staleTime: 15 * 1000,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string
      payload: UpdateOrderStatusPayload
    }) => updateOrderStatus(orderId, payload),
    onSuccess: (data) => {
      toast.success(`Order status updated to ${data.newStatus}`)
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status")
    },
  })
}

export function useAssignRider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string
      payload: AssignRiderPayload
    }) => assignRider(orderId, payload),
    onSuccess: () => {
      toast.success("Rider assigned successfully")
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign rider")
    },
  })
}

export function useExportOrders() {
  return useMutation({
    mutationFn: (filters: { status?: string; startDate?: string; endDate?: string }) =>
      exportOrdersCsv(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Orders exported!")
    },
    onError: () => {
      toast.error("Failed to export orders")
    },
  })
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: (orderId: string) => downloadInvoice(orderId),
    onSuccess: (blob, orderId) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${orderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: () => {
      toast.error("Failed to download invoice")
    },
  })
}

export function useBulkAssignRiders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignments: { orderId: string; riderId: string }[]) =>
      bulkAssignRiders(assignments),
    onSuccess: (data) => {
      toast.success(`${data.length} order(s) assigned`)
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e: Error) => toast.error(e.message || "Bulk assign failed"),
  })
}

export function useRefundOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: RefundOrderPayload }) =>
      refundOrder(orderId, payload),
    onSuccess: () => {
      toast.success("Refund processed successfully")
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e: Error) => toast.error(e.message || "Refund failed"),
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: CancelOrderPayload }) =>
      cancelOrder(orderId, payload),
    onSuccess: () => {
      toast.success("Order cancelled")
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e: Error) => toast.error(e.message || "Cancel failed"),
  })
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkStatusPayload) =>
      bulkUpdateStatus(payload),
    onSuccess: (data) => {
      toast.success(`${data.updated} order(s) updated`)
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e: Error) => toast.error(e.message || "Bulk update failed"),
  })
}

export function useDownloadPackingSlip() {
  return useMutation({
    mutationFn: (orderId: string) => downloadPackingSlip(orderId),
    onSuccess: (blob, orderId) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `packing-slip-${orderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: () => toast.error("Failed to download packing slip"),
  })
}
