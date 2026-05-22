/** Review entity — snake_case (backend returns raw DB rows) */
export interface Review {
  id: string
  rating: number
  comment: string | null
  images?: string[]
  created_at: string
  user_name: string
  status?: "pending" | "approved" | "hidden" | "spam"
  admin_reply?: string | null
  replied_at?: string | null
}

/** Product reviews response shape from backend */
export interface ProductReviewsResponse {
  reviews: Review[]
  averageRating: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Review list filters */
export interface ReviewFilters {
  page?: number
  limit?: number
  rating?: number | null
  status?: string
}
