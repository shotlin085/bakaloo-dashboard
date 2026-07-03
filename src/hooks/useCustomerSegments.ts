"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  getSegmentMembers,
  addSegmentMembers,
  removeSegmentMember,
} from "@/services/customer-segments.service"
import { qk } from "@/lib/query-keys"
import type { CreateSegmentPayload, UpdateSegmentPayload } from "@/types/customer-segment.types"

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

export function useCustomerSegments() {
  return useQuery({
    queryKey: qk.customerSegments(),
    queryFn: getSegments,
    staleTime: 30_000,
  })
}

export function useCreateSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSegmentPayload) => createSegment(payload),
    onSuccess: () => {
      toast.success("Segment created")
      qc.invalidateQueries({ queryKey: qk.customerSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSegmentPayload }) =>
      updateSegment(id, payload),
    onSuccess: () => {
      toast.success("Segment updated")
      qc.invalidateQueries({ queryKey: qk.customerSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSegment(id),
    onSuccess: () => {
      toast.success("Segment deleted")
      qc.invalidateQueries({ queryKey: qk.customerSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSegmentMembers(segmentId: string | null, page = 1, limit = 20) {
  return useQuery({
    queryKey: qk.customerSegmentMembers(segmentId ?? "none", { page, limit }),
    queryFn: () => getSegmentMembers(segmentId as string, { page, limit }),
    enabled: !!segmentId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useAddSegmentMembers(segmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string[]) => addSegmentMembers(segmentId, userIds),
    onSuccess: (result) => {
      toast.success(`${result.addedCount} customer${result.addedCount === 1 ? "" : "s"} added`)
      qc.invalidateQueries({ queryKey: ["customer-segments"] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useRemoveSegmentMember(segmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeSegmentMember(segmentId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-segments"] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
