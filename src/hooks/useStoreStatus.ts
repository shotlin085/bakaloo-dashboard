"use client"

/**
 * Store Status hooks — the storefront is a single global concern (not
 * per-shop, unlike most other admin data), so unlike `useBanners`/`useOrders`
 * this does not key off `useShopContext()`. One cache entry for the whole app.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { storeStatusService } from "@/services/store-status.service"
import type { SetOverridePayload, WeeklyHours } from "@/types/store-status.types"

const STORE_STATUS_QUERY_KEY = ["admin", "store-status"] as const

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const resp = (error as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export function useStoreStatus() {
  return useQuery({
    queryKey: STORE_STATUS_QUERY_KEY,
    queryFn: storeStatusService.get,
    staleTime: 30_000,
  })
}

export function useSetStoreOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SetOverridePayload) => storeStatusService.setOverride(payload),
    onSuccess: () => {
      toast.success("Store status updated")
      queryClient.invalidateQueries({ queryKey: STORE_STATUS_QUERY_KEY })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useUpdateWeeklyHours() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (weeklyHours: WeeklyHours) => storeStatusService.updateWeeklyHours(weeklyHours),
    onSuccess: () => {
      toast.success("Weekly hours saved")
      queryClient.invalidateQueries({ queryKey: STORE_STATUS_QUERY_KEY })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
