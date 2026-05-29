/**
 * Product family types — mirrors backend `product_families` table
 * (migration 048) and `/api/v1/admin/product-families` endpoints.
 *
 * A product family groups related purchasable options (e.g. Tomato 250g,
 * 500g, 1kg) under a shared name. Each option is a distinct `Product` row
 * with `product_family_id` linking back to its family.
 */

export interface ProductFamily {
  id: string
  name: string
  slug: string
  category_id: string | null
  thumbnail_url: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  /** Populated by GET /:id — count of active products in this family */
  product_count?: number
}

export interface ProductFamilyCreatePayload {
  name: string
  slug?: string
  category_id?: string | null
  thumbnail_url?: string | null
  description?: string | null
  is_active?: boolean
}

export interface ProductFamilyUpdatePayload {
  name?: string
  slug?: string
  category_id?: string | null
  thumbnail_url?: string | null
  description?: string | null
  is_active?: boolean
}

export interface ProductFamilyListParams {
  page?: number
  limit?: number
  search?: string
  category_id?: string
  is_active?: "true" | "false"
}
