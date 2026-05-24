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
  /**
   * Shop the underlying product is sold under in the multi-vendor backend.
   * Optional because the legacy `/reviews/products/:id` endpoint does not
   * yet emit it; consumers must treat `undefined` as "not enforced" and a
   * present value as authoritative for the vendor 404 enforcement
   * (Req 10.9, 10.10). Mirrors the convention used on `Customer`.
   */
  shop_id?: string | null
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
  /**
   * Restrict the reviews to those whose underlying product belongs to this
   * shop. Forwarded as the `shop_id` query param. Set by the
   * `useProductReviews` hook in `SINGLE_SHOP` mode; omitted in `ALL_SHOPS`
   * mode (Req 10.9). The backend may currently ignore this param — it is
   * forward-compatible with the planned multi-vendor backend.
   */
  shop_id?: string
}
