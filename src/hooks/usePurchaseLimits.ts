"use client"

/**
 * Purchase Limit Rules hooks — platform-wide (not shop-scoped), so the list
 * query uses the plain `qk.purchaseLimitRules()` key with no shop-context
 * gating, mirroring `useFirstTimeOffers.ts` / `useCustomerSegments.ts` rather
 * than the shop-scoped `useCoupons.ts` pattern.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getPurchaseLimitRules,
  createPurchaseLimitRule,
  updatePurchaseLimitRule,
  togglePurchaseLimitRule,
  deletePurchaseLimitRule,
} from "@/services/purchase-limits.service"
import { qk } from "@/lib/query-keys"
import type {
  CreatePurchaseLimitRulePayload,
  UpdatePurchaseLimitRulePayload,
} from "@/types/purchase-limit.types"

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

export function usePurchaseLimitRules() {
  return useQuery({
    queryKey: qk.purchaseLimitRules(),
    queryFn: getPurchaseLimitRules,
    staleTime: 30_000,
  })
}

export function useCreatePurchaseLimitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePurchaseLimitRulePayload) => createPurchaseLimitRule(payload),
    onSuccess: () => {
      toast.success("Purchase limit rule created")
      qc.invalidateQueries({ queryKey: qk.purchaseLimitRules() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdatePurchaseLimitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePurchaseLimitRulePayload }) =>
      updatePurchaseLimitRule(id, payload),
    onSuccess: () => {
      toast.success("Purchase limit rule updated")
      qc.invalidateQueries({ queryKey: qk.purchaseLimitRules() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

/** Dedicated toggle mutation for the list page's inline Active switch — no dialog involved. */
export function useTogglePurchaseLimitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePurchaseLimitRule(id, isActive),
    onSuccess: (rule) => {
      toast.success(rule.isActive ? "Rule activated" : "Rule deactivated")
      qc.invalidateQueries({ queryKey: qk.purchaseLimitRules() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeletePurchaseLimitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePurchaseLimitRule(id),
    onSuccess: () => {
      toast.success("Purchase limit rule deleted")
      qc.invalidateQueries({ queryKey: qk.purchaseLimitRules() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
