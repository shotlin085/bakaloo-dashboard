import api from "@/lib/api"
import type {
  ApiResponse,
  Order,
  OrderDetail,
  OrderStatusCounts,
  OrderFilters,
  UpdateOrderStatusPayload,
  AssignRiderPayload,
  RefundOrderPayload,
  CancelOrderPayload,
  BulkStatusPayload,
} from "@/types"

/** List orders with filters + pagination */
export async function getOrders(filters: OrderFilters = {}) {
  const params: Record<string, string | number> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.status) params.status = filters.status
  if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod
  if (filters.search) params.search = filters.search
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate

  const { data } = await api.get<
    ApiResponse<{
      orders: Order[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>
  >("/admin/orders", { params })

  return data.data
}

/** Get order counts by status (for tab badges) */
export async function getOrderStatusCounts(): Promise<OrderStatusCounts> {
  const { data } = await api.get<ApiResponse<OrderStatusCounts>>(
    "/admin/orders/stats-by-status"
  )
  return data.data
}

/** Get full order detail */
export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const { data } = await api.get<ApiResponse<OrderDetail>>(
    `/admin/orders/${orderId}`
  )
  return data.data
}

/** Update order status */
export async function updateOrderStatus(
  orderId: string,
  payload: UpdateOrderStatusPayload
) {
  const { data } = await api.put<
    ApiResponse<{ orderId: string; oldStatus: string; newStatus: string }>
  >(`/admin/orders/${orderId}/status`, payload)
  return data.data
}

/** Assign rider to order */
export async function assignRider(orderId: string, payload: AssignRiderPayload) {
  const { data } = await api.put<
    ApiResponse<{ orderId: string; riderId: string }>
  >(`/admin/orders/${orderId}/assign-rider`, payload)
  return data.data
}

/** Bulk assign riders */
export async function bulkAssignRiders(
  assignments: { orderId: string; riderId: string }[]
) {
  const { data } = await api.post<
    ApiResponse<{ orderId: string; riderId: string; status: string }[]>
  >("/admin/orders/bulk-assign", { assignments })
  return data.data
}

/** Export orders as CSV (returns blob) */
export async function exportOrdersCsv(filters: {
  status?: string
  startDate?: string
  endDate?: string
}) {
  const response = await api.get("/admin/orders/export", {
    params: filters,
    responseType: "blob",
  })
  return response.data
}

/** Download invoice PDF (returns blob) */
export async function downloadInvoice(orderId: string) {
  const response = await api.get(`/admin/orders/${orderId}/invoice`, {
    responseType: "blob",
  })
  return response.data
}

/** Refund order */
export async function refundOrder(
  orderId: string,
  payload: RefundOrderPayload
) {
  const { data } = await api.post<ApiResponse<{ orderId: string; refundAmount: number }>>(
    `/admin/orders/${orderId}/refund`,
    payload
  )
  return data.data
}

/** Cancel order */
export async function cancelOrder(
  orderId: string,
  payload: CancelOrderPayload
) {
  const { data } = await api.post<ApiResponse<{ orderId: string; status: string }>>(
    `/admin/orders/${orderId}/cancel`,
    payload
  )
  return data.data
}

/** Bulk status update */
export async function bulkUpdateStatus(
  payload: BulkStatusPayload
) {
  const { data } = await api.post<ApiResponse<{ updated: number }>>(
    "/admin/orders/bulk-status",
    payload
  )
  return data.data
}

/** Download packing slip PDF */
export async function downloadPackingSlip(orderId: string) {
  const response = await api.get(`/admin/orders/${orderId}/packing-slip`, {
    responseType: "blob",
  })
  return response.data
}
