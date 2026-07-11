"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getAbandonedCarts,
  getAbandonedCartsSummary,
  getAbandonedCartDetail,
  sendAbandonedCartReminder,
  issueAbandonedCartCoupon,
} from "@/services/abandoned-carts.service"
import { qk } from "@/lib/query-keys"
import type {
  AbandonedCartFilters,
  SendReminderPayload,
  IssueCouponPayload,
} from "@/types/abandoned-cart.types"

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

export function useAbandonedCarts(filters: AbandonedCartFilters = {}) {
  return useQuery({
    queryKey: qk.abandonedCarts(filters),
    queryFn: () => getAbandonedCarts(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAbandonedCartsSummary() {
  return useQuery({
    queryKey: qk.abandonedCartsSummary(),
    queryFn: getAbandonedCartsSummary,
    staleTime: 30_000,
  })
}

export function useAbandonedCartDetail(id: string | null) {
  return useQuery({
    queryKey: qk.abandonedCart(id ?? ""),
    queryFn: () => getAbandonedCartDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useSendAbandonedCartReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SendReminderPayload }) =>
      sendAbandonedCartReminder(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Reminder sent")
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] })
      qc.invalidateQueries({ queryKey: qk.abandonedCart(variables.id) })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useIssueAbandonedCartCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IssueCouponPayload }) =>
      issueAbandonedCartCoupon(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Coupon issued")
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] })
      qc.invalidateQueries({ queryKey: qk.abandonedCart(variables.id) })
      qc.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
