export type ProductReturnPolicy = "no_return" | "7_day" | "instant"

export interface ProductAttribute {
  label: string
  value: string
}

export interface ProductPayload {
  name: string
  description?: string
  categoryId?: string
  price: number
  salePrice?: number
  costPrice?: number
  stock: number
  unit: string
  sku?: string
  barcode?: string
  thumbnailUrl?: string
  tags?: string[]
  isFeatured?: boolean
  isActive?: boolean
  lowStockThreshold?: number
  maxOrderQty?: number
  variants?: Array<{
    name: string
    price: number
    salePrice?: number
    stockQuantity: number
    sku?: string
    isActive: boolean
  }>
  metaTitle?: string
  metaDescription?: string
  ingredients?: string
  allergenInfo?: string
  shelfLife?: string
  storageInstructions?: string
  certifications?: string[]
  nutritionInfo?: Record<string, string>
  brand?: string
  brandLogoUrl?: string
  netQuantity?: string
  highlights?: Record<string, string>
  attributes?: ProductAttribute[]
  vendorName?: string
  vendorAddress?: string
  vendorFssai?: string
  returnPolicy?: ProductReturnPolicy
  avgRating?: number
  ratingCount?: number
  isAuthentic?: boolean
}

/** Product in list view */
export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description?: string | null
  category_id: string
  category_name?: string
  brand?: string | null
  price: number          // backend field name (replaces mrp in API responses)
  mrp?: number           // kept for compat; same as price
  sale_price: number | null
  cost_price?: number | null
  gst_rate?: number
  hsn_code?: string | null
  stock_quantity: number
  low_stock_threshold: number
  sku?: string | null
  barcode?: string | null
  unit: string
  net_weight?: string | null
  netQuantity?: string | null
  net_quantity?: string | null
  max_order_qty?: number | null
  thumbnail_url: string | null
  images?: string[]
  is_active: boolean
  is_featured: boolean
  is_new_arrival?: boolean
  brandLogoUrl?: string | null
  brand_logo_url?: string | null
  highlights?: Record<string, string> | null
  attributes?: ProductAttribute[] | null
  vendorName?: string | null
  vendor_name?: string | null
  vendorAddress?: string | null
  vendor_address?: string | null
  vendorFssai?: string | null
  vendor_fssai?: string | null
  returnPolicy?: ProductReturnPolicy | null
  return_policy?: ProductReturnPolicy | null
  avgRating?: number | null
  avg_rating?: number | string | null
  ratingCount?: number | null
  rating_count?: number | null
  isAuthentic?: boolean | null
  is_authentic?: boolean | null
  tags?: string[]
  total_sold?: number
  created_at: string
  updated_at: string
}

/** Full product detail (same as Product for now; extendable) */
export interface ProductDetail extends Product {
  gallery_images?: { id: string; url: string; display_order: number }[]
  variants?: ProductVariant[]
  nutrition_info?: Record<string, string> | null
  ingredients?: string | null
  allergen_info?: string | null
  shelf_life?: string | null
  storage_instructions?: string | null
  certifications?: string[]
  meta_title?: string | null
  meta_description?: string | null
  total_sold?: number
  avg_rating?: number | string | null
  review_count?: number
}

/** Product variant */
export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price: number
  sale_price: number | null
  stock: number
  sku: string | null
  image_url: string | null
  is_active: boolean
}

/** Filters for product list */
export interface ProductFilters {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: "active" | "inactive" | "on_sale" | "low_stock" | "out_of_stock" | ""
  sort?: string
  order?: "asc" | "desc"
  minPrice?: number
  maxPrice?: number
}

/** Category */
export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  product_count?: number
  created_at: string
  updated_at: string
}

/** Category with children (tree structure) */
export interface CategoryTree extends Category {
  children: CategoryTree[]
}
