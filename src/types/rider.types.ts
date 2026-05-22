/** Rider profile — snake_case from DB */
export interface Rider {
  id: string
  name: string
  phone: string
  avatar_url: string | null
  is_active: boolean
  vehicle_type: string
  vehicle_number: string
  is_approved: boolean
  is_online: boolean
  rating: number
  total_deliveries: number
  commission_rate: number
  current_lat: number | null
  current_lng: number | null
  created_at: string
}

/** Rider detail — extended with bank & document info */
export interface RiderDetail extends Rider {
  email: string | null
  license_url: string | null
  aadhar_url: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_name: string | null
  updated_at: string
}

/** Live location entry */
export interface RiderLiveLocation {
  id: string
  name: string
  phone: string
  current_lat: number
  current_lng: number
  vehicle_type: string
  is_online: boolean
  order_id: string | null
  delivery_status: string | null
}

/** Rider earnings response */
export interface RiderEarnings {
  summary: {
    total: number
    delivery_count: number
    avg_per_delivery: number
  }
  daily: Array<{
    date: string
    total: number
    deliveries: number
  }>
}

/** Rider payout */
export interface RiderPayout {
  id: string
  rider_id: string
  amount: number
  period_start: string
  period_end: string
  deliveries: number
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "COMPLETED"
  payment_ref: string | null
  paid_at: string | null
  created_at: string
}

/** Rider document */
export interface RiderDocument {
  id: string
  rider_id: string
  doc_type: "aadhaar" | "license" | "vehicle_rc" | "pan" | "photo" | "bank_proof"
  doc_url: string
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  status?: "APPROVED" | "REJECTED" | null
  rejection_note?: string | null
  uploaded_at: string
}

/** Rider list filters */
export interface RiderFilters {
  page?: number
  limit?: number
  search?: string
  status?: "online" | "offline" | "pending" | "suspended" | null
  sortBy?: "created_at" | "name" | "deliveries" | "rating"
  sortOrder?: "ASC" | "DESC"
}

/** Create payout payload */
export interface CreatePayoutPayload {
  amount: number
  method: "BANK_TRANSFER" | "UPI" | "CASH"
  reference?: string
}
