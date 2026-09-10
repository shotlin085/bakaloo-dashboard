"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getBusinessAccounts,
  getBusinessAccountDetail,
  approveBusinessAccount,
  rejectBusinessAccount,
  getLedgerAccounts,
  getLedgerAccountDetail,
  setupLedgerAccount,
  updateLedgerLimits,
  setLedgerStatus,
  repayLedgerAccount,
  getLedgerCycles,
  markLedgerCyclePaid,
} from "@/services/b2b.service"
import { qk } from "@/lib/query-keys"
import type {
  BusinessAccountFilters,
  ApproveBusinessAccountPayload,
  RejectBusinessAccountPayload,
  LedgerAccountFilters,
  LedgerAccountStatus,
  SetupLedgerAccountPayload,
  UpdateLedgerLimitsPayload,
  RepayLedgerAccountPayload,
  MarkLedgerCyclePaidPayload,
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

/* ── B2B Ledger (credit line) ────────────────────────────────────── */

export function useLedgerAccounts(filters: LedgerAccountFilters = {}) {
  return useQuery({
    queryKey: qk.ledgerAccounts(filters),
    queryFn: () => getLedgerAccounts(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useLedgerAccountDetail(id: string | null) {
  return useQuery({
    queryKey: qk.ledgerAccount(id ?? ""),
    queryFn: () => getLedgerAccountDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useLedgerCycles(id: string | null, filters: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.ledgerCycles(id ?? "", filters),
    queryFn: () => getLedgerCycles(id!, filters),
    enabled: !!id,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useSetupLedgerAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ businessAccountId, payload }: { businessAccountId: string; payload: SetupLedgerAccountPayload }) =>
      setupLedgerAccount(businessAccountId, payload),
    onSuccess: () => {
      toast.success("Ledger account set up")
      qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to set up ledger account"),
  })
}

export function useUpdateLedgerLimits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLedgerLimitsPayload }) =>
      updateLedgerLimits(id, payload),
    onSuccess: () => {
      toast.success("Ledger limits updated")
      qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to update limits"),
  })
}

export function useSetLedgerStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LedgerAccountStatus }) => setLedgerStatus(id, status),
    onSuccess: () => {
      toast.success("Ledger status updated")
      qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to update status"),
  })
}

export function useRepayLedgerAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RepayLedgerAccountPayload }) =>
      repayLedgerAccount(id, payload),
    onSuccess: () => {
      toast.success("Repayment recorded")
      qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to record repayment"),
  })
}

export function useMarkLedgerCyclePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, payload }: { cycleId: string; payload?: MarkLedgerCyclePaidPayload }) =>
      markLedgerCyclePaid(cycleId, payload),
    onSuccess: () => {
      toast.success("Billing cycle marked as paid")
      qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e) || "Failed to mark cycle as paid"),
  })
}
