/**
 * Shop-product (per-shop inventory) types — mirrors
 * `bakaloo-backend/src/modules/shop-products` schemas.
 * See design.md §"Data Models" and Requirement 7.2.
 */

/** Embedded master-catalog product summary returned alongside a shop-product. */
export interface ShopProductCatalogRef {
  id: string
  name: string | null
  sku: string | null
  image_url: string | null
  /** Master-catalog category ID. */
  category_id: string | null
  /** Human-readable category name (joined from categories table). */
  category_name: string | null
  /** Master-catalog unit label (e.g. "kg", "gm", "piece") — used to make
   *  bulk-quantity fields unambiguous across products with different units. */
  unit: string | null
}

/** Full shop-product record. */
export interface ShopProduct {
  id: string
  shop_id: string
  product_id: string

  price: number
  sale_price: number | null
  cost_price: number | null
  /** B2B wholesale override for this shop's listing — falls back to the
   *  product's own wholesale price (then retail) when null. */
  wholesale_price: number | null

  stock_quantity: number
  low_stock_threshold: number
  max_order_qty: number

  is_available: boolean
  is_featured: boolean
  /** Whether this listing can be included in a bulk order at this shop. */
  bulk_order_eligible: boolean
  /** Minimum quantity of this listing a bulk-order line must request to
   *  qualify — on top of bulk_orders' own whole-order minimums. Null means
   *  no per-listing minimum. */
  bulk_min_quantity: number | null
  /** Ceiling for the same line. Null means no per-listing maximum. */
  bulk_max_quantity: number | null
  /** Optional bulk-sale window (ISO date-time) — either side null means
   *  unbounded on that side; both null means always eligible whenever
   *  bulk_order_eligible is on. */
  bulk_sale_start_at: string | null
  bulk_sale_end_at: string | null

  sold_out_at: string | null
  restock_eta: string | null

  /** Nested master-catalog product record (joined by the backend list endpoint). */
  product: ShopProductCatalogRef

  /** Name of the shop this record belongs to (joined from shops table). */
  shop_name: string | null
}
