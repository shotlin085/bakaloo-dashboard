/** Generic API response wrapper (matches backend's success/error helpers) */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** API error shape */
export interface ApiError {
  success: false
  message: string
  statusCode: number
}
