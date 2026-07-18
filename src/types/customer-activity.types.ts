/* ── Customer Activity Types ─────────────────────────── */

export interface ResolvedActivityUser {
  id: string
  name: string | null
  phone: string
  role: string
  created_at: string
  /** Single rolling "last seen" timestamp — NOT a login history. No
   *  individual login/app-open events are recorded anywhere in this
   *  system, so this is the only "how recently active" signal available. */
  last_active_at: string | null
}

export type CustomerActivityEventType =
  | "ORDER_PLACED"
  | "ORDER_STATUS"
  | "WALLET"
  | "NOTIFICATION"
  | "REVIEW"
  | "PRODUCT_VIEW"
  | "CART_EVENT"
  | "ADDRESS_ADDED"
  | "ADDRESS_REMOVED"

export interface CustomerActivityEvent {
  eventType: CustomerActivityEventType
  eventAt: string
  meta: Record<string, unknown>
}

export interface CustomerActivityFilters {
  page?: number
  limit?: number
  eventType?: CustomerActivityEventType
  from?: string
  to?: string
}
