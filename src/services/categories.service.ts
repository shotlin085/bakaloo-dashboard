import api from "@/lib/api"
import type { ApiResponse, Category, CategoryProductRank, CategoryType, Product } from "@/types"

/**
 * List all categories (flat) — STANDARD only; bundles are fetched separately
 * via getBundles(). Uses the admin endpoint so deactivated-but-not-deleted
 * categories still show here (badged inactive), unlike the public
 * customer-facing /categories list which hides them.
 */
export async function getCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories/admin")
  return data.data
}

/** List all bundle (promo-only) categories [ADMIN] — powers the Bundles tab. */
export async function getBundles(productId?: string) {
  const { data } = await api.get<ApiResponse<Array<Category & { is_member?: boolean }>>>(
    "/categories/bundles",
    { params: productId ? { productId } : undefined }
  )
  return data.data
}

/**
 * Every category a product can be cross-listed into (its own primary
 * category excluded), each flagged `is_member` [ADMIN] — powers the
 * product edit form's "also show in other categories" multi-select. This
 * is the multi-category feature: a product keeps its one real category and
 * can additionally appear under any number of other categories/bundles.
 */
export async function getCategoriesForProduct(productId: string) {
  const { data } = await api.get<ApiResponse<Array<Category & { is_member?: boolean }>>>(
    `/categories/for-product/${productId}`
  )
  return data.data
}

/** Add/remove a single product from a category or bundle [ADMIN] */
export async function toggleCategoryMembership(categoryId: string, productId: string, isMember: boolean) {
  await api.put<ApiResponse<null>>(`/categories/${categoryId}/membership`, { productId, isMember })
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
 * Products currently in a category, already in the effective display order.
 * For a STANDARD category this is the union of products whose real
 * category is this one AND any cross-listed extras (multi-category); for a
 * BUNDLE it's exactly the bundle's members. Seeds the product-ranking
 * panel: since this reflects exactly what the customer app would show,
 * dragging this list IS setting the new order.
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
