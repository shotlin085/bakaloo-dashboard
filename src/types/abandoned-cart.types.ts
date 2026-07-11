export type AbandonedCartStatus = "OPEN" | "RECOVERED" | "CONVERTED" | "EXPIRED"

/** Row shape for the Abandoned Carts list table. */
export interface AbandonedCart {
  id: string
  userId: string
  userName: string | null
  userPhone: string
  userEmail: string | null
  status: AbandonedCartStatus
  abandonedAt: string
  itemCount: number
  totalQuantity: number
  cartValue: number
  priorityScore: number
  reminderCount: number
  lastReminderSentAt: string | null
  recoveredAt: string | null
  convertedAt: string | null
}

export interface AbandonedCartItem {
  productId: string | null
  shopId: string | null
  productName: string
  thumbnailUrl: string | null
  unit: string | null
  quantity: number
  unitPrice: number
  listPrice: number
  lineTotal: number
}

export interface AbandonedCartEvent {
  eventType: "DETECTED" | "RESWEPT" | "RECOVERED" | "CONVERTED" | "EXPIRED" | "REMINDER_SENT" | "COUPON_ISSUED"
  actorType: "SYSTEM" | "ADMIN" | "CUSTOMER"
  actorId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AbandonedCartNotificationEntry {
  id: string
  title: string | null
  body: string | null
  sentBy: string | null
  createdAt: string
}

export interface AbandonedCartCouponEntry {
  id: string
  couponId: string
  code: string | null
  discountType: string | null
  discountValue: number | null
  issuedBy: string | null
  createdAt: string
}

/** Full detail payload for the Abandoned Cart drawer. */
export interface AbandonedCartDetail extends Omit<AbandonedCart, "userName" | "userPhone" | "userEmail"> {
  detectedAt: string
  priorityBreakdown: Record<string, { raw: number; normalized: number; weight: number; contribution: number }>
  convertedOrderId: string | null
  expiredAt: string | null
  user: {
    id: string
    name: string | null
    phone: string
    email: string | null
    walletBalance: number
    loyaltyPoints: number
  }
  items: AbandonedCartItem[]
  events: AbandonedCartEvent[]
  notificationsSent: AbandonedCartNotificationEntry[]
  couponsIssued: AbandonedCartCouponEntry[]
}

export interface AbandonedCartFilters {
  page?: number
  limit?: number
  search?: string
  status?: AbandonedCartStatus | "ALL"
  minValue?: number
  maxValue?: number
  sortBy?: "priority_score" | "cart_value" | "abandoned_at" | "item_count"
  sortOrder?: "ASC" | "DESC"
}

export interface AbandonedCartSummary {
  openCount: number
  openValue: number
  avgCartValue: number
  recoveredToday: number
  recoveredValueToday: number
  convertedToday: number
  convertedValueToday: number
  recoveryRate7d: number
}

export interface SendReminderPayload {
  title: string
  body: string
  imageUrl?: string
  deepLink?: string
}

/** Mode A: assign an already-existing coupon. Mode B: create a new one
 * (individually targeted to this episode's user server-side). */
export type IssueCouponPayload =
  | { couponId: string }
  | {
      code: string
      description?: string
      discountType: "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "BOGO" | "CASHBACK"
      discountValue: number
      minOrderAmount?: number
      maxDiscount?: number
      usageLimit?: number
      perUserLimit?: number
      validFrom?: string
      validUntil?: string
    }
