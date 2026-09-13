import type { ListParams } from "./common.types"

/* ── Business Accounts (B2B applications) ────────────────────────── */

export type BusinessAccountStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"

/** Row shape for the B2B Applications list table (admin list endpoint joins the applicant's user row). */
export interface BusinessAccount {
  id: string
  user_id: string
  company_name: string
  gst_number: string
  gst_document_url: string | null
  status: BusinessAccountStatus
  b2b_enabled: boolean
  rejection_reason: string | null
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
}

export interface BusinessAccountFilters extends ListParams {
  status?: BusinessAccountStatus
}

export interface ApproveBusinessAccountPayload {
  comments?: string
}

export interface RejectBusinessAccountPayload {
  reason: string
}
