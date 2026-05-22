import { useQuery } from "@tanstack/react-query"
import { getActivityLogs } from "@/services/activity-log.service"
import type { ActivityLogFilters } from "@/types/activity-log.types"

export function useActivityLogs(filters: ActivityLogFilters) {
  return useQuery({
    queryKey: ["activity-logs", filters],
    queryFn: () => getActivityLogs(filters),
    staleTime: 30 * 1000,
  })
}
