import api from "@/lib/api"
import type { ApiResponse } from "@/types"

/**
 * Coverage Map service — talks to `/admin/coverage-map/:shopId`.
 * Returns a store's pin, every currently-covered customer's pin (live
 * pincode/radius match, same logic that gates allocation), and a boundary
 * circle per pincode group, centered on that group's customers.
 */
export interface CoverageMapShop {
  id: string
  name: string
  lat: number
  lng: number
  city: string
  state: string
  pincode: string
  isActive: boolean
}

export interface CoverageMapCustomer {
  userId: string
  name: string | null
  initial: string
  lat: number
  lng: number
  pincode: string | null
  /** True when this customer has an order that hasn't been delivered/cancelled/refunded yet. */
  hasActiveOrder: boolean
}

export interface CoverageMapBoundary {
  pincode: string
  count: number
  /** [lat, lng] polygon ring. */
  polygon: [number, number][]
}

export interface CoverageMapData {
  shop: CoverageMapShop
  serviceablePincodes: string[]
  uncoveredPincodes: string[]
  customers: CoverageMapCustomer[]
  boundaries: CoverageMapBoundary[]
  totalCustomers: number
}

export const coverageMapService = {
  async get(shopId: string): Promise<CoverageMapData> {
    const { data } = await api.get<ApiResponse<CoverageMapData>>(
      `/admin/coverage-map/${shopId}`
    )
    return data.data
  },
}
