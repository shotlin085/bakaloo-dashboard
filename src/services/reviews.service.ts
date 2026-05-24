import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  ProductReviewsResponse,
  ReviewFilters,
} from "@/types/review.types"

export async function getProductReviews(
  productId: string,
  filters: ReviewFilters = {}
): Promise<ProductReviewsResponse> {
  const params: Record<string, unknown> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.rating != null) params.rating = filters.rating
  if (filters.status) params.status = filters.status
  // When the dashboard is in SINGLE_SHOP mode the hook forwards the active
  // shop id here so the backend can restrict the result set to reviews on
  // products belonging to that shop (Req 10.9). In ALL_SHOPS mode the hook
  // omits the field so the unscoped super-admin list is returned. The
  // backend may currently ignore this param — it is forward-compatible
  // with the planned multi-vendor backend.
  if (filters.shop_id) params.shop_id = filters.shop_id

  const { data } = await api.get<ApiResponse<ProductReviewsResponse>>(
    `/reviews/products/${productId}`,
    { params }
  )

  return data.data ?? { reviews: [], averageRating: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  await api.put(`/admin/reviews/${reviewId}/reply`, { reply })
}

export async function moderateReview(
  reviewId: string,
  status: "approved" | "hidden" | "spam"
): Promise<void> {
  await api.put(`/admin/reviews/${reviewId}/moderate`, { status })
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api.delete(`/admin/reviews/${reviewId}`)
}
