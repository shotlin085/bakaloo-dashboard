/**
 * Purchase Limit Rules — admin-configured caps on how many units of a
 * CATEGORY or PRODUCT a customer may buy per order and/or over a rolling
 * time window (e.g. "5 per week"). Platform-wide (scope is always GLOBAL
 * from this dashboard — see query-keys.ts's platform-wide block), not
 * shop-scoped.
 *
 * Field names are camelCase to match the backend's `_format()` response
 * shape exactly (see the `/api/v1/purchase-limits` contract).
 */

export type PurchaseLimitTargetType = "CATEGORY" | "PRODUCT"
export type PurchaseLimitWindowPeriod = "DAY" | "WEEK" | "MONTH"
export type PurchaseLimitScope = "GLOBAL" | "STORE"

/** Purchase limit rule entity — camelCase, pre-joined category/product names. */
export interface PurchaseLimitRule {
  id: string
  /** Always "GLOBAL" for rules created from this dashboard (no scope/shop picker exposed in the UI). */
  scope: PurchaseLimitScope
  shopId: string | null
  targetType: PurchaseLimitTargetType
  categoryId: string | null
  /** Pre-joined by the backend — use directly for display, no separate category lookup needed. */
  categoryName: string | null
  productId: string | null
  /** Pre-joined by the backend — use directly for display, no separate product lookup needed. */
  productName: string | null
  label: string
  maxQtyPerOrder: number | null
  windowEnabled: boolean
  windowPeriod: PurchaseLimitWindowPeriod | null
  windowCount: number | null
  maxQtyPerWindow: number | null
  /** When true, `maxQtyPerOrder` is skipped for an order that also has products outside this rule's scope. Never affects the window cap. */
  exemptOrderCapWithOtherItems: boolean
  isActive: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Create payload — `targetType` is required and immutable after creation
 * (changing it would orphan the categoryId/productId pairing), so it is
 * intentionally excluded from {@link UpdatePurchaseLimitRulePayload} below
 * rather than merely left optional.
 */
export interface CreatePurchaseLimitRulePayload {
  targetType: PurchaseLimitTargetType
  /** Required if targetType === "CATEGORY". */
  categoryId?: string
  /** Required if targetType === "PRODUCT". */
  productId?: string
  /** 1-150 chars. */
  label: string
  /** Integer >= 1, or null/omitted for "no per-order limit". */
  maxQtyPerOrder?: number | null
  windowEnabled?: boolean
  /** Required if windowEnabled is true. */
  windowPeriod?: PurchaseLimitWindowPeriod
  /** Integer >= 1. Required if windowEnabled is true (e.g. period=WEEK, count=2 means "every 2 weeks"). */
  windowCount?: number
  /** Integer >= 1. Required if windowEnabled is true. */
  maxQtyPerWindow?: number
  /** Default false. When true, an order that also contains products outside this rule's scope skips the per-order cap (the window cap still always applies). */
  exemptOrderCapWithOtherItems?: boolean
}

/** Update payload — any subset of the (non-targetType) create fields, plus the isActive toggle. */
export interface UpdatePurchaseLimitRulePayload
  extends Partial<Omit<CreatePurchaseLimitRulePayload, "targetType">> {
  isActive?: boolean
}
