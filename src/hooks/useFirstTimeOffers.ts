"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getFirstTimeOffers,
  createFirstTimeOffer,
  updateFirstTimeOffer,
  deleteFirstTimeOffer,
} from "@/services/first-time-offers.service"
import { qk } from "@/lib/query-keys"
import type { CreateFirstTimeOfferPayload, UpdateFirstTimeOfferPayload } from "@/types/first-time-offer.types"

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

export function useFirstTimeOffers() {
  return useQuery({
    queryKey: qk.firstTimeOffers(),
    queryFn: getFirstTimeOffers,
    staleTime: 30_000,
  })
}

export function useCreateFirstTimeOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFirstTimeOfferPayload) => createFirstTimeOffer(payload),
    onSuccess: () => {
      toast.success("First-time offer created")
      qc.invalidateQueries({ queryKey: qk.firstTimeOffers() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateFirstTimeOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFirstTimeOfferPayload }) =>
      updateFirstTimeOffer(id, payload),
    onSuccess: () => {
      toast.success("First-time offer updated")
      qc.invalidateQueries({ queryKey: qk.firstTimeOffers() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteFirstTimeOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFirstTimeOffer(id),
    onSuccess: () => {
      toast.success("First-time offer deleted")
      qc.invalidateQueries({ queryKey: qk.firstTimeOffers() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
