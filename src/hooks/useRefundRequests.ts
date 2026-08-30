"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getRefundRequests,
  getRefundRequestDetail,
  approveRefundRequest,
  rejectRefundRequest,
} from "@/services/refund-requests.service"
import { qk } from "@/lib/query-keys"
import type {
  RefundRequestFilters,
  ApproveRefundRequestPayload,
  RejectRefundRequestPayload,
} from "@/types/refund-request.types"

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

export function useRefundRequests(filters: RefundRequestFilters = {}) {
  return useQuery({
    queryKey: qk.refundRequests(filters),
    queryFn: () => getRefundRequests(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useRefundRequestDetail(id: string | null) {
  return useQuery({
    queryKey: qk.refundRequest(id ?? ""),
    queryFn: () => getRefundRequestDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useApproveRefundRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveRefundRequestPayload }) =>
      approveRefundRequest(id, payload),
    onSuccess: (data) => {
      toast.success(`Refund approved — ₹${data.refund_amount ?? 0} sent to the customer`)
      qc.invalidateQueries({ queryKey: ["refund-requests"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Refund approval failed"),
  })
}

export function useRejectRefundRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectRefundRequestPayload }) =>
      rejectRefundRequest(id, payload),
    onSuccess: () => {
      toast.success("Refund request rejected")
      qc.invalidateQueries({ queryKey: ["refund-requests"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to reject request"),
  })
}
