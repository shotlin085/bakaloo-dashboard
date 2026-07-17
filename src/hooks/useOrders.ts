import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOrders,
  getOrderStatusCounts,
  getOrderDetail,
  getOrderNotes,
  addOrderNote,
  updateOrderStatus,
  assignRider,
  bulkAssignRiders,
  exportOrdersCsv,
  downloadInvoice,
  refundOrder,
  cancelOrder,
  rescheduleOrder,
  bulkUpdateStatus,
  downloadPackingSlip,
} from "@/services/orders.service"
import type { OrderFilters, UpdateOrderStatusPayload, AssignRiderPayload, RefundOrderPayload, CancelOrderPayload, RescheduleOrderPayload, BulkStatusPayload } from "@/types"
import { toast } from "sonner"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"

/**
 * Sentinel `shopKey` slot used while the Shop_Context_Store hydrates.
 *
 * `qk.orders(shopKey, filters)` requires a stable second segment for the
 * cache key, but we don't actually want to fire a request before the shop
 * context is ready (vendor) or the Super_Admin has chosen between
 * SINGLE_SHOP and ALL_SHOPS. Combining `shopKey === "NONE"` with
 * `enabled: shopKey !== "NONE"` gives us a stable key shape and a gated
 * request — matching the convention established by `useShopProductsList`
 * and `useShopFinancials`.
 *
 * Requirements: 10.1, 10.3, 10.4, 10.6.
 */
const NONE_SHOP_KEY = "NONE"

/**
 * Paginated orders list, keyed by the central query-key factory so the
 * Shop_Switcher's predicate-based invalidation (Req 3.4, 10.3) reaches
 * every orders cache entry in one pass.
 *
 * Scope semantics:
 *   - `mode === "HQ_MODE"` (Super_Admin viewing every shop):
 *     `shopKey = "ALL"`. The axios interceptor omits `X-Shop-Id`, the
 *     backend returns aggregated orders (Req 10.6).
 *   - `mode === "STORE_MODE"`: `shopKey = activeShopId`. The interceptor
 *     injects `X-Shop-Id`, the backend returns shop-scoped orders.
 *   - Otherwise (`UNSELECTED` / hydrating): `shopKey = "NONE"` and the
 *     query is gated off so no request is issued.
 *   The `Shop` table column itself is always rendered regardless of mode.
 */
export function useOrders(filters: OrderFilters) {
  const { mode, activeShopId } = useShopContext()
  const shopKey =
    mode === "HQ_MODE"
      ? "ALL"
      : activeShopId ?? NONE_SHOP_KEY

  return useQuery({
    queryKey: qk.orders(shopKey, filters),
    queryFn: () => getOrders(filters),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
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

export function useOrderNotes(orderId: string | null) {
  return useQuery({
    queryKey: ["orders", "notes", orderId],
    queryFn: () => getOrderNotes(orderId!),
    enabled: !!orderId,
    staleTime: 15 * 1000,
  })
}

export function useAddOrderNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: string }) =>
      addOrderNote(orderId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders", "notes", variables.orderId] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add note"),
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

export function useRescheduleOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: RescheduleOrderPayload }) =>
      rescheduleOrder(orderId, payload),
    onSuccess: () => {
      toast.success("Delivery rescheduled")
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e: Error) => toast.error(e.message || "Reschedule failed"),
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
