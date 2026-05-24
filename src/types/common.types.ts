/**
 * Cross-entity shared primitives used by both the central query-key factory
 * (`src/lib/query-keys.ts`) and the multi-vendor entity type modules
 * (`shop.types`, `shop-staff.types`, `shop-product.types`, etc.).
 *
 * Keeping these here lets the rest of the codebase depend on a single
 * neutral location instead of cross-importing between sibling type modules.
 */

/**
 * Shared list/pagination params used by every list-style query and service
 * call. Concrete entity filters (e.g. `OrderFilters`) extend this implicitly
 * via structural typing — they typically include `page`, `limit`, and
 * `search` alongside their entity-specific fields.
 */
export interface ListParams {
  page?: number
  limit?: number
  search?: string
}

/**
 * Generic paginated response wrapper. Mirrors the backend's pagination
 * shape (see `src/types/api.types.ts` → `PaginatedResponse<T>`); kept as a
 * lightweight alias so newer multi-vendor hooks can refer to a single type.
 */
export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Day-of-week enum used by `Shop.operating_hours`. Values match the keys the
 * backend emits in the `operating_hours` JSON column.
 */
export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
