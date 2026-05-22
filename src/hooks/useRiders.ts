import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getRiders,
  getRiderDetail,
  getRiderEarnings,
  getRiderPayouts,
  getRiderDocuments,
  createRiderPayout,
  toggleRiderSuspend,
  approveRider,
  updateRiderCommission,
  verifyRiderDocument,
} from "@/services/riders.service"
import type { RiderFilters, CreatePayoutPayload } from "@/types/rider.types"

export function useRiders(filters: RiderFilters = {}) {
  return useQuery({
    queryKey: ["riders", filters],
    queryFn: () => getRiders(filters),
    staleTime: 30_000,
  })
}

export function useRiderDetail(id: string | null) {
  return useQuery({
    queryKey: ["riders", "detail", id],
    queryFn: () => getRiderDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useRiderEarnings(
  id: string | null,
  params?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: ["riders", "earnings", id, params],
    queryFn: () => getRiderEarnings(id!, params),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useRiderPayouts(id: string | null) {
  return useQuery({
    queryKey: ["riders", "payouts", id],
    queryFn: () => getRiderPayouts(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useRiderDocuments(id: string | null) {
  return useQuery({
    queryKey: ["riders", "documents", id],
    queryFn: () => getRiderDocuments(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ riderId, payload }: { riderId: string; payload: CreatePayoutPayload }) =>
      createRiderPayout(riderId, payload),
    onSuccess: () => {
      toast.success("Payout created")
      qc.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create payout")
    },
  })
}

export function useToggleSuspend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      toggleRiderSuspend(id, suspended),
    onSuccess: (data) => {
      toast.success(data.is_active ? "Rider unsuspended" : "Rider suspended")
      qc.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update rider status")
    },
  })
}

export function useApproveRider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_approved }: { id: string; is_approved: boolean }) =>
      approveRider(id, is_approved),
    onSuccess: (data) => {
      toast.success(
        data.is_approved ? "Rider approved successfully" : "Rider unapproved"
      )
      qc.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update approval status")
    },
  })
}

export function useUpdateCommission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) =>
      updateRiderCommission(id, rate),
    onSuccess: () => {
      toast.success("Commission rate updated")
      qc.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update commission")
    },
  })
}

export function useVerifyDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      riderId,
      documentId,
      payload,
    }: {
      riderId: string
      documentId: string
      payload: { status: "APPROVED" | "REJECTED"; note?: string }
    }) => verifyRiderDocument(riderId, documentId, payload),
    onSuccess: () => {
      toast.success("Document verification updated")
      qc.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to verify document")
    },
  })
}
