/**
 * Shop-transaction (append-only ledger) types — mirrors
 * `bakaloo-backend/src/modules/shop-transactions` schemas.
 * See design.md §"Data Models" and Requirement 9.3.
 */

/** Discriminator for ledger-row semantics. */
export type ShopTransactionType =
  | "ORDER_REVENUE"
  | "COMMISSION_DEBIT"
  | "DELIVERY_COST"
  | "REFUND_DEBIT"
  | "PAYOUT_CREDIT"
  | "ADJUSTMENT"
  | "EXPENSE"

/** A single immutable ledger row. */
export interface ShopTransaction {
  id: string
  shop_id: string

  type: ShopTransactionType
  amount: number
  balance_after: number

  reference_type: string | null
  reference_id: string | null

  description: string
  created_by: string
  created_at: string
}
