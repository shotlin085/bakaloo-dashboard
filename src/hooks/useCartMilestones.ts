"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getCartMilestones,
  createCartMilestone,
  updateCartMilestone,
  deleteCartMilestone,
} from "@/services/cart-milestones.service"
import { qk } from "@/lib/query-keys"
import type { CreateCartMilestonePayload, UpdateCartMilestonePayload } from "@/types/cart-milestone.types"

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

export function useCartMilestones() {
  return useQuery({
    queryKey: qk.cartMilestones(),
    queryFn: getCartMilestones,
    staleTime: 30_000,
  })
}

export function useCreateCartMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCartMilestonePayload) => createCartMilestone(payload),
    onSuccess: () => {
      toast.success("Cart milestone created")
      qc.invalidateQueries({ queryKey: qk.cartMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateCartMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCartMilestonePayload }) =>
      updateCartMilestone(id, payload),
    onSuccess: () => {
      toast.success("Cart milestone updated")
      qc.invalidateQueries({ queryKey: qk.cartMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteCartMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCartMilestone(id),
    onSuccess: () => {
      toast.success("Cart milestone deleted")
      qc.invalidateQueries({ queryKey: qk.cartMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
