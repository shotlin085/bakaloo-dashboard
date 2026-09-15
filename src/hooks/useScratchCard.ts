"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getScratchPrizes,
  createScratchPrize,
  updateScratchPrize,
  deleteScratchPrize,
  reorderScratchPrizes,
  getScratchCardSettings,
  updateScratchCardSettings,
  getScratchMilestoneRules,
  createScratchMilestoneRule,
  updateScratchMilestoneRule,
  deleteScratchMilestoneRule,
  grantScratches,
  getScratchHistory,
} from "@/services/scratch-card.service"
import { qk } from "@/lib/query-keys"
import type {
  CreateScratchPrizePayload,
  UpdateScratchPrizePayload,
  UpdateScratchCardSettingsPayload,
  CreateScratchMilestoneRulePayload,
  UpdateScratchMilestoneRulePayload,
  GrantScratchesPayload,
  ScratchHistoryFilters,
} from "@/types/scratch-card.types"

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

// ─── Prizes ──────────────────────────────────────────────────────────────

export function useScratchPrizes() {
  return useQuery({
    queryKey: qk.scratchCardPrizes(),
    queryFn: getScratchPrizes,
    staleTime: 30_000,
  })
}

export function useCreateScratchPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateScratchPrizePayload) => createScratchPrize(payload),
    onSuccess: () => {
      toast.success("Prize created")
      qc.invalidateQueries({ queryKey: qk.scratchCardPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateScratchPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScratchPrizePayload }) =>
      updateScratchPrize(id, payload),
    onSuccess: () => {
      toast.success("Prize updated")
      qc.invalidateQueries({ queryKey: qk.scratchCardPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteScratchPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteScratchPrize(id),
    onSuccess: () => {
      toast.success("Prize deleted")
      qc.invalidateQueries({ queryKey: qk.scratchCardPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useReorderScratchPrizes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderScratchPrizes(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scratchCardPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Settings ────────────────────────────────────────────────────────────

export function useScratchCardSettings() {
  return useQuery({
    queryKey: qk.scratchCardSettings(),
    queryFn: getScratchCardSettings,
    staleTime: 30_000,
  })
}

export function useUpdateScratchCardSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateScratchCardSettingsPayload) => updateScratchCardSettings(payload),
    onSuccess: () => {
      toast.success("Settings updated")
      qc.invalidateQueries({ queryKey: qk.scratchCardSettings() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Milestone rules ─────────────────────────────────────────────────────

export function useScratchMilestoneRules() {
  return useQuery({
    queryKey: qk.scratchCardMilestones(),
    queryFn: getScratchMilestoneRules,
    staleTime: 30_000,
  })
}

export function useCreateScratchMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateScratchMilestoneRulePayload) => createScratchMilestoneRule(payload),
    onSuccess: () => {
      toast.success("Milestone rule created")
      qc.invalidateQueries({ queryKey: qk.scratchCardMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateScratchMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScratchMilestoneRulePayload }) =>
      updateScratchMilestoneRule(id, payload),
    onSuccess: () => {
      toast.success("Milestone rule updated")
      qc.invalidateQueries({ queryKey: qk.scratchCardMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteScratchMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteScratchMilestoneRule(id),
    onSuccess: () => {
      toast.success("Milestone rule deleted")
      qc.invalidateQueries({ queryKey: qk.scratchCardMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Manual grant + history ──────────────────────────────────────────────

export function useGrantScratches() {
  return useMutation({
    mutationFn: (payload: GrantScratchesPayload) => grantScratches(payload),
    onSuccess: (result) => {
      toast.success(`Granted — this user now has ${result.scratchesAvailable} scratch card(s) available`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useScratchHistory(filters: ScratchHistoryFilters = {}) {
  return useQuery({
    queryKey: qk.scratchCardHistory(filters),
    queryFn: () => getScratchHistory(filters),
    staleTime: 10_000,
  })
}
