"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getAreaSegments,
  createAreaSegment,
  updateAreaSegment,
  deleteAreaSegment,
  getAreaSegmentAddresses,
  addAreaSegmentAddress,
  removeAreaSegmentAddress,
  getAreaSegmentActiveOrders,
} from "@/services/area-segments.service"
import { qk } from "@/lib/query-keys"
import type { CreateAreaSegmentPayload, UpdateAreaSegmentPayload } from "@/types/area-segment.types"

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

export function useAreaSegments() {
  return useQuery({
    queryKey: qk.areaSegments(),
    queryFn: getAreaSegments,
    staleTime: 30_000,
  })
}

export function useCreateAreaSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAreaSegmentPayload) => createAreaSegment(payload),
    onSuccess: () => {
      toast.success("Area segment created")
      qc.invalidateQueries({ queryKey: qk.areaSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateAreaSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAreaSegmentPayload }) =>
      updateAreaSegment(id, payload),
    onSuccess: () => {
      toast.success("Area segment updated")
      qc.invalidateQueries({ queryKey: qk.areaSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteAreaSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAreaSegment(id),
    onSuccess: () => {
      toast.success("Area segment deleted")
      qc.invalidateQueries({ queryKey: qk.areaSegments() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useAreaSegmentAddresses(segmentId: string | null, page = 1, limit = 20) {
  return useQuery({
    queryKey: qk.areaSegmentAddresses(segmentId ?? "none", { page, limit }),
    queryFn: () => getAreaSegmentAddresses(segmentId as string, { page, limit }),
    enabled: !!segmentId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useAddAreaSegmentAddress(segmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: string; addressId: string }) => addAreaSegmentAddress(segmentId, payload),
    onSuccess: (result) => {
      if (result.added) {
        toast.success("Address added to segment")
      } else {
        toast.info("This address was already in the segment")
      }
      if (result.conflicts.length > 0) {
        toast.warning(
          `Also registered in ${result.conflicts.length} other active segment${result.conflicts.length === 1 ? "" : "s"} — the resolver picks by priority, then oldest segment first.`
        )
      }
      qc.invalidateQueries({ queryKey: ["area-segments"] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useRemoveAreaSegmentAddress(segmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) => removeAreaSegmentAddress(segmentId, addressId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["area-segments"] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useAreaSegmentActiveOrders(segmentId: string | null) {
  return useQuery({
    queryKey: qk.areaSegmentActiveOrders(segmentId ?? "none"),
    queryFn: () => getAreaSegmentActiveOrders(segmentId as string),
    enabled: !!segmentId,
    staleTime: 15_000,
  })
}
