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

/* ── B2B Ledger (credit line) ────────────────────────────────────── */

export type LedgerAccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED"

/** Row shape for the Financial/Ledger list table (joins business_accounts + users). */
export interface LedgerAccount {
  id: string
  business_account_id: string
  monthly_credit_limit: number
  hard_limit: number
  current_balance: number
  billing_day: number
  status: LedgerAccountStatus
  created_at: string
  updated_at: string
  company_name: string
  gst_number: string
  user_id: string
  customer_name: string | null
  customer_phone: string | null
}

export interface LedgerAccountFilters extends ListParams {
  status?: LedgerAccountStatus
}

export interface SetupLedgerAccountPayload {
  monthlyCreditLimit: number
  hardLimit?: number
  billingDay?: number
}

export interface UpdateLedgerLimitsPayload {
  monthlyCreditLimit?: number
  hardLimit?: number
  billingDay?: number
}

export interface RepayLedgerAccountPayload {
  amount: number
  description?: string
}

export type LedgerTransactionType = "DRAW" | "REPAYMENT" | "ADJUSTMENT"

export interface LedgerTransaction {
  id: string
  ledger_account_id: string
  type: LedgerTransactionType
  amount: number
  description: string | null
  order_id: string | null
  bulk_order_id: string | null
  billing_cycle_id: string | null
  balance_after: number
  created_at: string
}

export type LedgerCycleStatus = "DUE" | "OVERDUE" | "PAID"

export interface LedgerBillingCycle {
  id: string
  ledger_account_id: string
  period_start: string
  period_end: string
  amount_due: number
  overage_amount: number
  amount_paid: number | null
  status: LedgerCycleStatus
  due_date: string
  paid_at: string | null
  payment_reference: string | null
  reminder_count: number
  created_at: string
  updated_at: string
}

export interface MarkLedgerCyclePaidPayload {
  amountPaid?: number
  paymentReference?: string
}
