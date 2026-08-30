import type { ListParams } from "./common.types"

export type RefundRequestStatus = "PENDING" | "APPROVED" | "REJECTED"
export type RefundRequestItemScope = "ALL" | "SPECIFIC"

export interface RefundRequestItem {
  productId: string
  name: string
  quantity: number
  total: number
}

/** Row shape for the Refund Requests list table and detail view. */
export interface RefundRequest {
  id: string
  order_id: string
  order_number: string
  user_id: string
  customer_name: string | null
  customer_phone: string | null
  item_scope: RefundRequestItemScope
  items: RefundRequestItem[] | null
  description: string
  status: RefundRequestStatus
  admin_note: string | null
  processed_by: string | null
  processed_at: string | null
  refund_amount: number | null
  refund_to: "wallet" | "original" | null
  total_amount: number
  wallet_amount_used: number
  created_at: string
  updated_at: string
}

export interface RefundRequestFilters extends ListParams {
  status?: RefundRequestStatus
  startDate?: string
  endDate?: string
}

export interface ApproveRefundRequestPayload {
  refundTo: "wallet" | "original"
}

export interface RejectRefundRequestPayload {
  adminNote?: string
}
