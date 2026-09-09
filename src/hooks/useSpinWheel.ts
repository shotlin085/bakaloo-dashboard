"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getSpinPrizes,
  createSpinPrize,
  updateSpinPrize,
  deleteSpinPrize,
  reorderSpinPrizes,
  getSpinWheelSettings,
  updateSpinWheelSettings,
  getSpinMilestoneRules,
  createSpinMilestoneRule,
  updateSpinMilestoneRule,
  deleteSpinMilestoneRule,
  grantSpins,
  getSpinHistory,
} from "@/services/spin-wheel.service"
import { qk } from "@/lib/query-keys"
import type {
  CreateSpinPrizePayload,
  UpdateSpinPrizePayload,
  UpdateSpinWheelSettingsPayload,
  CreateSpinMilestoneRulePayload,
  UpdateSpinMilestoneRulePayload,
  GrantSpinsPayload,
  SpinHistoryFilters,
} from "@/types/spin-wheel.types"

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

export function useSpinPrizes() {
  return useQuery({
    queryKey: qk.spinWheelPrizes(),
    queryFn: getSpinPrizes,
    staleTime: 30_000,
  })
}

export function useCreateSpinPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSpinPrizePayload) => createSpinPrize(payload),
    onSuccess: () => {
      toast.success("Prize created")
      qc.invalidateQueries({ queryKey: qk.spinWheelPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateSpinPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSpinPrizePayload }) =>
      updateSpinPrize(id, payload),
    onSuccess: () => {
      toast.success("Prize updated")
      qc.invalidateQueries({ queryKey: qk.spinWheelPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteSpinPrize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSpinPrize(id),
    onSuccess: () => {
      toast.success("Prize deleted")
      qc.invalidateQueries({ queryKey: qk.spinWheelPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useReorderSpinPrizes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderSpinPrizes(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spinWheelPrizes() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Settings ────────────────────────────────────────────────────────────

export function useSpinWheelSettings() {
  return useQuery({
    queryKey: qk.spinWheelSettings(),
    queryFn: getSpinWheelSettings,
    staleTime: 30_000,
  })
}

export function useUpdateSpinWheelSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSpinWheelSettingsPayload) => updateSpinWheelSettings(payload),
    onSuccess: () => {
      toast.success("Settings updated")
      qc.invalidateQueries({ queryKey: qk.spinWheelSettings() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Milestone rules ─────────────────────────────────────────────────────

export function useSpinMilestoneRules() {
  return useQuery({
    queryKey: qk.spinWheelMilestones(),
    queryFn: getSpinMilestoneRules,
    staleTime: 30_000,
  })
}

export function useCreateSpinMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSpinMilestoneRulePayload) => createSpinMilestoneRule(payload),
    onSuccess: () => {
      toast.success("Milestone rule created")
      qc.invalidateQueries({ queryKey: qk.spinWheelMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateSpinMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSpinMilestoneRulePayload }) =>
      updateSpinMilestoneRule(id, payload),
    onSuccess: () => {
      toast.success("Milestone rule updated")
      qc.invalidateQueries({ queryKey: qk.spinWheelMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteSpinMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSpinMilestoneRule(id),
    onSuccess: () => {
      toast.success("Milestone rule deleted")
      qc.invalidateQueries({ queryKey: qk.spinWheelMilestones() })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ─── Manual grant + history ──────────────────────────────────────────────

export function useGrantSpins() {
  return useMutation({
    mutationFn: (payload: GrantSpinsPayload) => grantSpins(payload),
    onSuccess: (result) => {
      toast.success(`Granted — this user now has ${result.spinsAvailable} spin(s) available`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSpinHistory(filters: SpinHistoryFilters = {}) {
  return useQuery({
    queryKey: qk.spinWheelHistory(filters),
    queryFn: () => getSpinHistory(filters),
    staleTime: 10_000,
  })
}
