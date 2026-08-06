/**
 * Admin-defined zone with one assigned rider, covering a set of exact
 * (customer, saved address) pairs — never "this customer" alone. See
 * RiderAssignmentSection/order.types.ts for how assignment_method surfaces
 * this on the order card.
 */
export interface AreaSegment {
  id: string
  name: string
  description: string | null
  is_active: boolean
  rider_id: string | null
  rider_name: string | null
  rider_phone: string | null
  priority: number
  address_count: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateAreaSegmentPayload {
  name: string
  description?: string
  riderId?: string
  priority?: number
}

export interface UpdateAreaSegmentPayload {
  name?: string
  description?: string
  isActive?: boolean
  riderId?: string | null
  priority?: number
}

/** One exact (customer, saved address) pair covered by a segment. */
export interface AreaSegmentAddress {
  id: string
  user_id: string
  address_id: string
  lat: number | null
  lng: number | null
  added_at: string
  customer_name: string | null
  customer_phone: string
  label: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  pincode: string | null
}

/** A customer's saved address, for the "pick the exact address" step when adding to a segment. */
export interface CustomerAddressOption {
  id: string
  label: string
  address_line1: string
  address_line2: string | null
  landmark: string | null
  city: string
  state: string | null
  pincode: string
  lat: number | null
  lng: number | null
  is_default: boolean
}

/** A customer search result when adding a new address to a segment. */
export interface AreaSegmentCandidate {
  id: string
  name: string | null
  phone: string
  email: string | null
}

export interface AreaSegmentActiveOrder {
  id: string
  order_number: string
  status: string
  rider_id: string | null
  rider_name: string | null
  assignment_method: string | null
  assigned_at: string | null
  customer_name: string | null
}
