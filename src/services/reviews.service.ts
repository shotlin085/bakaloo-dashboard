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
