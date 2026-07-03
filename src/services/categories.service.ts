import api from "@/lib/api"
import type { ApiResponse, Category, CategoryProductRank, CategoryType, Product } from "@/types"

/** List all categories (flat) — STANDARD only; bundles are fetched separately via getBundles() */
export async function getCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories")
  return data.data
}

/**
 * List all bundle (promo-only) categories [ADMIN]. Pass a productId to also
 * get `is_member` on each bundle — powers the product edit form's "also
 * show in bundles" multi-select.
 */
export async function getBundles(productId?: string) {
  const { data } = await api.get<ApiResponse<Array<Category & { is_member?: boolean }>>>(
    "/categories/bundles",
    { params: productId ? { productId } : undefined }
  )
  return data.data
}

/** Add/remove a single product from a bundle [ADMIN] */
export async function toggleBundleMembership(bundleId: string, productId: string, isMember: boolean) {
  await api.put<ApiResponse<null>>(`/categories/${bundleId}/membership`, { productId, isMember })
}

/** Get category by ID */
export async function getCategoryDetail(id: string) {
  const { data } = await api.get<ApiResponse<Category>>(`/categories/${id}`)
  return data.data
}

/** Create a category (or a bundle, when category_type: "BUNDLE") */
export async function createCategory(payload: {
  name: string
  description?: string
  image_url?: string
  parent_id?: string | null
  sort_order?: number
  category_type?: CategoryType
}) {
  const { data } = await api.post<ApiResponse<Category>>("/categories", payload)
  return data.data
}

/** Update a category */
export async function updateCategory(
  id: string,
  payload: {
    name?: string
    description?: string
    image_url?: string
    parent_id?: string | null
    sort_order?: number
    is_active?: boolean
    category_type?: CategoryType
  }
) {
  const { data } = await api.put<ApiResponse<Category>>(`/categories/${id}`, payload)
  return data.data
}

/** Delete a category */
export async function deleteCategory(id: string) {
  const { data } = await api.delete<ApiResponse<null>>(`/categories/${id}`)
  return data.data
}

/**
 * Products currently in a category (or a bundle's current members), already
 * in the effective display order — rank-aware default when unsorted,
 * membership-and-rank for bundles. Seeds the product-ranking panel: since
 * this reflects exactly what the customer app would show, dragging this
 * list IS setting the new order.
 */
export async function getCategoryProducts(categoryId: string, limit = 100) {
  const { data } = await api.get<{ success: boolean; message: string; data: Product[] }>(
    `/categories/${categoryId}/products`,
    { params: { limit, page: 1 } }
  )
  return Array.isArray(data.data) ? data.data : []
}

/** Get a category's current product ranking/membership [ADMIN] */
export async function getCategoryProductRanks(categoryId: string) {
  const { data } = await api.get<ApiResponse<CategoryProductRank[]>>(
    `/categories/${categoryId}/products/ranks`
  )
  return data.data
}

/**
 * Replace a category's product membership/order in one call — sets a
 * bundle's member products, or "shuffles"/replaces a standard category's
 * ranking. `productIds` order defines the new rank (array index = rank).
 */
export async function setCategoryProducts(categoryId: string, productIds: string[]) {
  const { data } = await api.put<ApiResponse<CategoryProductRank[]>>(
    `/categories/${categoryId}/products`,
    { productIds }
  )
  return data.data
}
