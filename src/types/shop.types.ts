/**
 * Shop entity types — mirrors `bakaloo-backend/src/modules/shops` schemas.
 * See design.md §"Data Models".
 */

import type { Weekday } from "./common.types"

/** Operating hours for a single weekday. */
export interface ShopOperatingHours {
  open: string
  close: string
  closed: boolean
}

/** Full shop record returned by `GET /api/v1/shops` and `GET /api/v1/shops/[id]`. */
export interface Shop {
  id: string
  name: string
  slug: string
  branch_code: string

  description?: string
  logo_url?: string
  banner_url?: string

  phone?: string
  email?: string
  whatsapp?: string

  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  lat: number
  lng: number

  serviceable_pincodes: string[]
  delivery_radius_km: number
  /** When true, this shop is matchable ONLY via serviceable_pincodes — delivery_radius_km is never a fallback match. */
  pincode_only: boolean

  is_active: boolean
  is_verified: boolean

  operating_hours: Record<Weekday, ShopOperatingHours>

  commission_rate: number
  gst_number?: string
  pan_number?: string

  bank_account_number?: string
  bank_ifsc?: string
  bank_name?: string
  bank_holder_name?: string

  total_orders: number
  total_revenue: number
  avg_rating: number
  rating_count: number

  created_at: string
  updated_at: string
}
