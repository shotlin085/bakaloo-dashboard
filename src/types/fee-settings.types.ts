/**
 * Fee Settings types — mirror the backend `fee_settings` table
 * (bakaloo-backend migration 055) and the canonical TotalsEngine output.
 */

export type FeeValueType = "FLAT" | "PERCENT"

/** Full fee configuration row (GLOBAL or a per-shop override). */
export interface FeeSettings {
  id: string | null
  scope: "GLOBAL" | "STORE"
  shop_id: string | null
  is_active: boolean

  // Delivery (distance-based)
  delivery_fee_enabled: boolean
  min_delivery_fee: number
  base_distance_km: number
  per_km_fee: number
  max_delivery_distance_km: number | null
  free_delivery_enabled: boolean
  free_delivery_above: number | null

  // Handling
  handling_fee_enabled: boolean
  handling_fee_type: FeeValueType
  handling_fee_value: number
  handling_fee_label: string
  handling_fee_description: string | null

  // Platform
  platform_fee_enabled: boolean
  platform_fee_type: FeeValueType
  platform_fee_value: number
  platform_fee_label: string
  platform_fee_description: string | null

  // Small cart
  small_cart_fee_enabled: boolean
  small_cart_threshold: number
  small_cart_fee: number
  small_cart_fee_label: string
  small_cart_fee_description: string | null

  // Surge / rain
  surge_fee_enabled: boolean
  surge_fee_value: number
  surge_fee_label: string
  surge_fee_description: string | null

  // Packaging
  packaging_fee_enabled: boolean
  packaging_fee_value: number
  packaging_fee_label: string
  packaging_fee_description: string | null

  // ETA (display only)
  delivery_eta_minutes: number

  // Quick Delivery surcharge — flat, only charged when the customer
  // explicitly opts into "Quick Delivery" at checkout.
  quick_delivery_surcharge_enabled: boolean
  quick_delivery_surcharge_amount: number
  quick_delivery_surcharge_label: string
  /** How fast delivery is promised once the customer opts in — distinct from delivery_eta_minutes. */
  quick_delivery_eta_minutes: number
}

/** Partial update payload (every field optional). */
export type UpdateFeeSettingsPayload = Partial<
  Omit<FeeSettings, "id" | "scope" | "shop_id">
>

/** A single fee line in the canonical breakdown. */
export interface FeeLine {
  code: string
  label: string
  amount: number
  originalAmount?: number
  waived?: boolean
  description?: string
  metadata?: Record<string, unknown>
}

/** Canonical breakdown returned by the preview endpoint. */
export interface FeePreview {
  itemsSubtotal: number
  couponDiscount: number
  deliveryFee: number
  deliveryFeeOriginal: number
  deliveryFeeWaived: boolean
  deliveryFeeWaiverReason: string | null
  handlingFee: number
  platformFee: number
  smallCartFee: number
  surgeFee: number
  packagingFee: number
  tax: number
  totalSavings: number
  totalPayable: number
  distance: { km: number | null; label: string; known: boolean }
  freeDelivery: {
    enabled: boolean
    threshold: number | null
    unlocked: boolean
    amountToUnlock: number
  }
  deliveryEtaMinutes: number
  fees: FeeLine[]
  configSource?: string
}

export interface FeePreviewInput {
  subtotal: number
  distanceKm?: number
  shopId?: string
}
