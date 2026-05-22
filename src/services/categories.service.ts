import api from "@/lib/api"
import type { ApiResponse, Category } from "@/types"

/** List all categories (flat) */
export async function getCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories")
  return data.data
}

/** Get category by ID */
export async function getCategoryDetail(id: string) {
  const { data } = await api.get<ApiResponse<Category>>(`/categories/${id}`)
  return data.data
}

/** Create a category */
export async function createCategory(payload: {
  name: string
  description?: string
  image_url?: string
  parent_id?: string | null
  sort_order?: number
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
