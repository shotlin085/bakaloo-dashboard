import api from "@/lib/api"
import type {
  ApiResponse,
  Product,
  ProductPayload,
  ProductDetail,
  ProductFilters,
} from "@/types"

function serializeProductPayload(payload: ProductPayload): ProductPayload {
  return {
    ...payload,
    highlights: payload.highlights ? { ...payload.highlights } : undefined,
    attributes: payload.attributes?.map((attribute) => ({
      label: attribute.label,
      value: attribute.value,
    })),
  }
}

/** List products with filters + pagination */
export async function getProducts(filters: ProductFilters = {}) {
  const params: Record<string, string | number | boolean> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search) params.search = filters.search
  if (filters.category) params.category = filters.category
  if (filters.sort) params.sort = filters.sort
  if (filters.minPrice) params.minPrice = filters.minPrice
  if (filters.maxPrice) params.maxPrice = filters.maxPrice
  if (filters.status) params.status = filters.status

  // The backend returns: { success, message, data: Product[], pagination: {...} }
  // axios wraps this in response.data, so `data` here = { success, message, data: [...], pagination }
  const { data } = await api.get<{
    success: boolean
    message: string
    data: Product[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>("/products", { params })

  return {
    products: Array.isArray(data.data) ? data.data : [],
    pagination: data.pagination,
  }
}

/** Get single product detail */
export async function getProductDetail(id: string) {
  const { data } = await api.get<ApiResponse<ProductDetail>>(`/products/${id}`)
  return data.data
}

/** Create a new product */
export async function createProduct(payload: ProductPayload) {
  const { data } = await api.post<ApiResponse<Product>>(
    "/products",
    serializeProductPayload(payload)
  )
  return data.data
}

/** Update a product */
export async function updateProduct(id: string, payload: ProductPayload) {
  const { data } = await api.put<ApiResponse<Product>>(
    `/products/${id}`,
    serializeProductPayload(payload)
  )
  return data.data
}

/** Update stock only */
export async function updateProductStock(id: string, stock: number) {
  const { data } = await api.put<ApiResponse<Product>>(`/products/${id}/stock`, { stock })
  return data.data
}

/** Delete (soft-delete) a product */
export async function deleteProduct(id: string) {
  const { data } = await api.delete<ApiResponse<null>>(`/products/${id}`)
  return data.data
}

/** Duplicate a product */
export async function duplicateProduct(id: string) {
  const { data } = await api.post<ApiResponse<Product>>(`/admin/products/${id}/duplicate`)
  return data.data
}

/** Bulk update products */
export async function bulkUpdateProducts(
  products: { id: string; price?: number; sale_price?: number; category_id?: string; is_active?: boolean }[]
) {
  const { data } = await api.put<ApiResponse<{ updated: Product[] }>>("/admin/products/bulk-update", {
    products,
  })
  return data.data
}

/** Export products as CSV */
export async function exportProductsCsv(format: "csv" | "xlsx" = "csv") {
  const { data } = await api.get("/admin/products/export", {
    params: { format },
    responseType: "blob",
  })
  return data as Blob
}

/** Get product analytics */
export async function getProductAnalytics(params?: { page?: number; limit?: number; sortBy?: string }) {
  const { data } = await api.get<
    ApiResponse<
      {
        id: string
        name: string
        units_sold: number
        revenue: number
        views: number
        conversion_rate: number
        stock_quantity: number
        category: string
      }[]
    >
  >("/admin/products/analytics", { params })
  return data.data
}
