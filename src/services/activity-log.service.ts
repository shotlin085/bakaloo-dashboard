import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type { ActivityLog, ActivityLogFilters } from "@/types/activity-log.types"

/** Get activity logs with filters + pagination */
export async function getActivityLogs(filters: ActivityLogFilters = {}) {
  const params: Record<string, string | number> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.adminId) params.adminId = filters.adminId
  if (filters.action) params.action = filters.action
  if (filters.entityType) params.entityType = filters.entityType

  const { data } = await api.get<
    ApiResponse<{
      logs: ActivityLog[]
      total: number
      page: number
      limit: number
    }>
  >("/admin/activity-log", { params })

  return data.data
}
