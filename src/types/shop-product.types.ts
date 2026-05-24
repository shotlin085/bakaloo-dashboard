/**
 * Shop-product (per-shop inventory) types — mirrors
 * `bakaloo-backend/src/modules/shop-products` schemas.
 * See design.md §"Data Models" and Requirement 7.2.
 */

/** Embedded master-catalog product summary returned alongside a shop-product. */
export interface ShopProductCatalogRef {
  id: string
  name: string
  sku: string
  image_url: string
}

/** Full shop-product record. */
export interface ShopProduct {
  id: string
  shop_id: string
  product_id: string

  price: number
  sale_price: number | null
  cost_price: number | null

  stock_quantity: number
  low_stock_threshold: number
  max_order_qty: number

  is_available: boolean
  is_featured: boolean

  sold_out_at: string | null
  restock_eta: string | null

  product: ShopProductCatalogRef
}
