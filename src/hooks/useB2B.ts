"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getBusinessAccounts,
  getBusinessAccountDetail,
  approveBusinessAccount,
  rejectBusinessAccount,
} from "@/services/b2b.service"
import { qk } from "@/lib/query-keys"
import type {
  BusinessAccountFilters,
  ApproveBusinessAccountPayload,
  RejectBusinessAccountPayload,
} from "@/types/b2b.types"

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

/* ── Business Accounts (B2B applications) ────────────────────────── */

export function useBusinessAccounts(filters: BusinessAccountFilters = {}) {
  return useQuery({
    queryKey: qk.businessAccounts(filters),
    queryFn: () => getBusinessAccounts(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useBusinessAccountDetail(id: string | null) {
  return useQuery({
    queryKey: qk.businessAccount(id ?? ""),
    queryFn: () => getBusinessAccountDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useApproveBusinessAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveBusinessAccountPayload }) =>
      approveBusinessAccount(id, payload),
    onSuccess: () => {
      toast.success("Business account approved")
      qc.invalidateQueries({ queryKey: ["business-accounts"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Approval failed"),
  })
}

export function useRejectBusinessAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectBusinessAccountPayload }) =>
      rejectBusinessAccount(id, payload),
    onSuccess: () => {
      toast.success("Business account application rejected")
      qc.invalidateQueries({ queryKey: ["business-accounts"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to reject application"),
  })
}
