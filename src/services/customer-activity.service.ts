import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  ResolvedActivityUser,
  CustomerActivityEvent,
  CustomerActivityFilters,
} from "@/types/customer-activity.types"

/** Resolve a User ID or phone number to the matching user (+ last_active_at). */
export async function resolveCustomerActivityUser(
  query: string
): Promise<ResolvedActivityUser | null> {
  try {
    const { data } = await api.get<ApiResponse<ResolvedActivityUser>>(
      "/admin/customer-activity/resolve-user",
      { params: { query } }
    )
    return data.data
  } catch {
    return null
  }
}

/** Paginated, filterable activity timeline for one customer. */
export async function getCustomerActivityTimeline(
  userId: string,
  filters: CustomerActivityFilters = {}
): Promise<{
  events: CustomerActivityEvent[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params: Record<string, string | number> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.eventType) params.eventType = filters.eventType
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to

  const { data } = await api.get<
    ApiResponse<CustomerActivityEvent[]> & {
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }
  >(`/admin/customer-activity/${userId}/timeline`, { params })

  const events = Array.isArray(data.data) ? data.data : []
  return {
    events,
    pagination: (data as unknown as { pagination: { page: number; limit: number; total: number; totalPages: number } })
      .pagination ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: events.length,
      totalPages: 1,
    },
  }
}
