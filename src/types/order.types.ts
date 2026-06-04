import type { OrderStatus, PaymentMethod } from "@/lib/constants"

export interface DeliveryAddress {
  line1?: string
  line2?: string
  label?: string
  address_line?: string
  city: string
  state?: string
  pincode: string
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  rider_id: string | null
  status: OrderStatus
  items: OrderItem[] | null
  subtotal: number
  discount_amount: number
  delivery_fee: number
  handling_fee: number
  late_night_fee: number
  tip_amount: number
  platform_fee: number
  tax_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: string
  coupon_code: string | null
  delivery_address: DeliveryAddress
  delivery_notes: string | null
  delivery_instructions: string | null
  estimated_delivery: string | null
  savings_total: number
  delivered_at: string | null
  created_at: string
  updated_at: string
  // Joined fields from list API
  customer_name?: string
  customer_phone?: string
  rider_name?: string | null
  /**
   * Shop attribution joined by the backend on cross-shop list responses
   * (Super_Admin "All Shops" mode). All fields are optional so the type
   * stays backwards-compatible with single-shop list responses that omit
   * them. The dashboard prefers `shop_name`, falls back to `shop?.name`,
   * and renders `"—"` when neither is present.
   */
  shop_id?: string | null
  shop_name?: string | null
  shop?: { id?: string; name?: string } | null
  // Delivery slot fields
  delivery_mode?: 'ASAP' | 'SCHEDULED'
  scheduled_slot_label?: string | null
  scheduled_slot_start?: string | null
  scheduled_slot_end?: string | null
  scheduled_delivery_at?: string | null
}

export interface OrderItem {
  id?: string
  order_id?: string
  product_id: string
  name: string
  price: number
  quantity: number
  unit: string
  total: number
  thumbnail_url?: string | null
  created_at?: string
}

export interface OrderTimeline {
  id?: string
  order_id?: string
  from_status: string | null
  to_status: string
  changed_by: string | null
  changed_by_name?: string
  note: string | null
  changed_at: string
}

export interface OrderPayment {
  id: string
  order_id: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  amount: number
  currency: string
  status: string
  method: string
  created_at: string
}

export interface DeliveryAssignment {
  id: string
  order_id: string
  rider_id: string
  status: string
  assigned_at: string
  accepted_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  delivery_otp: string | null
  proof_photo_url: string | null
  distance_km: number | null
  earnings: number | null
  delivery_time_minutes: number | null
  tip_amount: number
  rating: number | null
  rating_note: string | null
}

export interface OrderDetail extends Order {
  customer_name: string
  customer_phone: string
  customer_email?: string
  rider_name: string | null
  rider_phone: string | null
  proof_photo_url: string | null
  cancelled_reason: string | null
  items: OrderItem[]
  timeline: OrderTimeline[]
  payment: OrderPayment | null
  delivery: DeliveryAssignment | null
}

/** Order count by status (for tab badges) */
export type OrderStatusCounts = Record<string, number>

/** Filters for order list */
export interface OrderFilters {
  page?: number
  limit?: number
  status?: OrderStatus | ""
  paymentMethod?: PaymentMethod | ""
  search?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  deliveryType?: string
  riderId?: string
  area?: string
}

/** Status update payload */
export interface UpdateOrderStatusPayload {
  status: OrderStatus
  note?: string
}

/** Rider assignment payload */
export interface AssignRiderPayload {
  riderId: string
}

/** Refund payload */
export interface RefundOrderPayload {
  amount: number
  reason: string
  refundTo: "wallet" | "original" | "manual"
}

/** Cancel payload */
export interface CancelOrderPayload {
  reason: string
  refundTo?: "wallet" | "original" | "none"
}

/** Bulk status update payload */
export interface BulkStatusPayload {
  orderIds: string[]
  status: OrderStatus
  note?: string
}
