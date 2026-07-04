"use client"

/**
 * Delivery Calendar hooks — global (not per-shop) settings, same rationale
 * as useStoreStatus: one cache entry for the whole app.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deliveryCalendarService } from "@/services/delivery-calendar.service"
import type { SetDayOverridePayload, WeeklyTemplateRow } from "@/types/delivery-calendar.types"

const TEMPLATE_QUERY_KEY = ["admin", "delivery-calendar", "template"] as const
const DAYS_QUERY_KEY = (from: string, to: string) =>
  ["admin", "delivery-calendar", "days", from, to] as const

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

export function useDeliveryCalendarTemplate() {
  return useQuery({
    queryKey: TEMPLATE_QUERY_KEY,
    queryFn: deliveryCalendarService.getTemplate,
    staleTime: 30_000,
  })
}

export function useUpdateDeliveryCalendarTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: WeeklyTemplateRow[]) => deliveryCalendarService.updateTemplate(rows),
    onSuccess: () => {
      toast.success("Weekly template saved")
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEY })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useDeliveryCalendarDays(from: string, to: string) {
  return useQuery({
    queryKey: DAYS_QUERY_KEY(from, to),
    queryFn: () => deliveryCalendarService.getDays(from, to),
    staleTime: 15_000,
    enabled: Boolean(from && to),
  })
}

export function useSetDeliveryCalendarDayOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, payload }: { date: string; payload: SetDayOverridePayload }) =>
      deliveryCalendarService.setDayOverride(date, payload),
    onSuccess: () => {
      toast.success("Day updated")
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-calendar", "days"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useGenerateDeliveryCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (numDays?: number) => deliveryCalendarService.generate(numDays),
    onSuccess: (result) => {
      toast.success(`Calendar generated (${result.generated} new day${result.generated === 1 ? "" : "s"})`)
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-calendar", "days"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
