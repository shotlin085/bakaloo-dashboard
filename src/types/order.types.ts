import type { OrderStatus, OrderType, PaymentMethod } from "@/lib/constants"

export interface DeliveryAddress {
  // The originating `addresses.id` row this order's delivery snapshot was
  // taken from — present because checkout spreads the full saved-address
  // row into `orders.delivery_address` (see backend
  // orders/orders.service.js). Used to match "same delivery address" for
  // the sticky rider suggestion, since address text can drift.
  id?: string
  line1?: string
  line2?: string
  label?: string
  address_line?: string
  // Checkout snapshots this address from the customer's saved address row,
  // whose repository formats columns to camelCase (`addressLine1` etc) —
  // that's the shape actually stored in `orders.delivery_address`.
  addressLine1?: string
  addressLine2?: string
  landmark?: string
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
   * The rider previously assigned to this customer's same saved address, if
   * any — only populated by the backend when `rider_id` is not yet set.
   * Pre-fills (but never auto-confirms) the Rider Assignment dropdown once
   * an order reaches PACKED.
   */
  suggested_rider?: { id: string; name: string; phone: string; is_online: boolean } | null
  /** Which tier of the resolver decided the current rider — null before any assignment. */
  assignment_method?: 'MANUAL' | 'AREA_SEGMENT' | 'AUTO' | null
  area_segment_id?: string | null
  area_segment_name?: string | null
  assigned_at?: string | null
  notification_sent_at?: string | null
  pickup_token_status?: 'ACTIVE' | 'VERIFIED' | 'CONSUMED' | 'REVOKED' | 'EXPIRED' | null
  pickup_status?: 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | null
  assignment_history?: AssignmentLogEntry[]
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
  /** Derived server-side from delivery_mode + quick_delivery_selected. */
  order_type?: OrderType
}

/** An internal, staff-only note on an order — a running CRM-style thread. */
export interface OrderNote {
  id: string
  order_id: string
  author_id: string
  author_name: string | null
  body: string
  created_at: string
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
  /** Product's net quantity/weight (e.g. "500g", "1.5kg") joined from the
   *  product catalog — not a per-order snapshot, so it reflects the
   *  product's current weight rather than what was true at order time. */
  net_quantity?: string | null
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
  // Razorpay's own decline-reason fields, captured on payment.failed —
  // null for anything that never failed, and for payments that failed
  // before this capture existed.
  error_code?: string | null
  error_description?: string | null
  error_source?: string | null
  error_step?: string | null
  error_reason?: string | null
  // Set when a payment was captured by Razorpay after its order had
  // already moved on (almost always cancelled) — the backend deliberately
  // does NOT auto-confirm this case (the order's stock may have already
  // been restored to the shelf), so it needs a human to decide whether to
  // re-confirm or refund. See PaymentsService.completeVerifiedPayment.
  metadata?: { needs_manual_review?: boolean; reason?: string } | null
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
  /** COD only — how much the rider recorded as collected in cash / via the
   *  UPI QR at delivery time. Null until the order is delivered, and null
   *  forever for Wallet/Online orders (already paid). */
  cash_collected: number | null
  upi_collected: number | null
}

/** The shop that fulfilled the order — its saved location, used as the
 *  route origin for "View live on Map" and (when available) road-distance
 *  calculation. Never the customer's browser location or a hardcoded pin. */
export interface OrderStore {
  id: string
  name: string | null
  lat: number | null
  lng: number | null
}

/**
 * A genuine road-route distance sourced from a Google route already stored
 * against the order (see `resolveRoadRouteDistance` on the backend).
 * `distance_km` is `null` — not a haversine fallback — when no real route
 * data exists for this order; the UI must render that as "unavailable",
 * never compute or display a straight-line substitute.
 */
export interface OrderDeliveryRoute {
  distance_km: number | null
  source: string | null
}

/** Full payment detail fetched live from Razorpay's own record — everything
 *  they track that isn't mirrored into our own `payments` table. */
export interface RazorpayPaymentDetail {
  id: string
  status: string
  method: string
  amount: number
  amountRefunded: number
  refundStatus: string | null
  currency: string
  fee: number | null
  tax: number | null
  international: boolean
  email: string | null
  contact: string | null
  vpa: string | null
  bank: string | null
  wallet: string | null
  card: { last4: string; network: string; type: string; issuer: string | null } | null
  acquirerReference: string | null
  upiTransactionId: string | null
  createdAt: string | null
  errorCode: string | null
  errorDescription: string | null
  errorReason: string | null
  notes: Record<string, unknown> | null
}

/** One row of rider_assignment_log — "which rule selected the final rider, and why." */
export interface AssignmentLogEntry {
  id: string
  order_id: string
  rider_id: string | null
  rider_name: string | null
  method: 'MANUAL' | 'AREA_SEGMENT' | 'AUTO' | 'NONE'
  reason: string | null
  triggered_by: string | null
  decided_at: string
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
  store: OrderStore | null
  delivery_route: OrderDeliveryRoute
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
  /** Orders where Razorpay captured a payment after the order had already
   *  moved on (almost always cancelled) — flagged for manual review rather
   *  than auto-confirmed, since stock may already be back on the shelf. */
  needsPaymentReview?: boolean
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

/**
 * Refund payload. No `amount` field — the refund amount is never
 * admin-editable; the backend always refunds exactly what the customer
 * paid (see `AdminOrdersService.refundOrder`).
 */
export interface RefundOrderPayload {
  reason: string
  refundTo: "wallet" | "original" | "none"
}

/** Cancel payload */
export interface CancelOrderPayload {
  reason: string
  refundTo?: "wallet" | "original" | "none"
}

/** Reschedule delivery payload (admin mistake-correction action) */
export interface RescheduleOrderPayload {
  scheduledSlotStart: string
  scheduledSlotEnd: string
  scheduledSlotLabel: string
  reason?: string
}

/** Bulk status update payload */
export interface BulkStatusPayload {
  orderIds: string[]
  status: OrderStatus
  note?: string
}
