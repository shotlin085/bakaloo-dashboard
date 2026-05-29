/**
 * Product Families service — wraps `/api/v1/admin/product-families`
 * (Phase 1 backend contract). All endpoints are admin-scoped; the
 * dashboard's axios client forwards the JWT bearer token automatically.
 *
 * The product family is the grouping object that links sibling product
 * options (e.g. Tomato 500g, Tomato 1kg). Each option is still a regular
 * `products` row carrying `product_family_id`.
 */

import api from "@/lib/api"
import type {
  ApiResponse,
  Paginated,
  ProductFamily,
  ProductFamilyCreatePayload,
  ProductFamilyListParams,
  ProductFamilyUpdatePayload,
  ProductOptionsResponse,
} from "@/types"

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

/** List product families (paginated, admin-only). */
export async function listProductFamilies(
  params: ProductFamilyListParams = {}
): Promise<Paginated<ProductFamily>> {
  const cappedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const queryParams: Record<string, string | number> = { limit: cappedLimit }
  if (params.page !== undefined) queryParams.page = params.page
  if (params.search) queryParams.search = params.search
  if (params.category_id) queryParams.category_id = params.category_id
  if (params.is_active) queryParams.is_active = params.is_active

  const { data } = await api.get<
    ApiResponse<ProductFamily[]> & {
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  >("/admin/product-families", { params: queryParams })

  const items = Array.isArray(data.data) ? data.data : []
  const pagination = data.pagination ?? {
    page: params.page ?? 1,
    limit: cappedLimit,
    total: items.length,
    totalPages: 1,
  }

  return { items, pagination }
}

/** Get a single product family by id (includes product_count). */
export async function getProductFamily(id: string): Promise<ProductFamily> {
  const { data } = await api.get<ApiResponse<ProductFamily>>(
    `/admin/product-families/${id}`
  )
  return data.data
}

/** Create a new product family. */
export async function createProductFamily(
  payload: ProductFamilyCreatePayload
): Promise<ProductFamily> {
  const { data } = await api.post<ApiResponse<ProductFamily>>(
    "/admin/product-families",
    payload
  )
  return data.data
}

/** Update a product family (partial). */
export async function updateProductFamily(
  id: string,
  payload: ProductFamilyUpdatePayload
): Promise<ProductFamily> {
  const { data } = await api.patch<ApiResponse<ProductFamily>>(
    `/admin/product-families/${id}`,
    payload
  )
  return data.data
}

/** Soft-deactivate a product family. */
export async function deactivateProductFamily(
  id: string
): Promise<ProductFamily> {
  const { data } = await api.delete<ApiResponse<ProductFamily>>(
    `/admin/product-families/${id}`
  )
  return data.data
}

/**
 * Get all purchasable options for a product family (public/customer
 * endpoint). Useful on the product edit page to show sibling options.
 */
export async function getProductOptions(
  productId: string
): Promise<ProductOptionsResponse | null> {
  try {
    const { data } = await api.get<ApiResponse<ProductOptionsResponse>>(
      `/products/${productId}/options`
    )
    return data.data
  } catch {
    return null
  }
}

/**
 * Admin-only: list every product belonging to a family. Returns the
 * raw rows (NOT the customer-facing shape — no shop scoping).
 *
 * Wraps GET /api/v1/admin/product-families/:id/options.
 */
export async function listFamilyOptions(familyId: string) {
  const { data } = await api.get<
    ApiResponse<{
      family: ProductFamily
      options: Array<Record<string, unknown>>
    }>
  >(`/admin/product-families/${familyId}/options`)
  return data.data
}
