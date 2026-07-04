"use client"

/**
 * TanStack Query hooks for HQ (cross-shop admin) views.
 *
 * All queries use a 60s staleTime and `placeholderData: (prev) => prev`
 * to avoid layout shift on pagination changes.
 *
 * Tasks: 20.1–20.7
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  hqService,
  type HQOrderFilters,
  type HQFinanceFilters,
  type HQAuditLogFilters,
  type HQRiderFilters,
  type HQReportFilters,
  type RunSettlementPayload,
} from "@/services/hq.service"

const STALE_TIME = 60_000

// ── Query Keys ──────────────────────────────────────────────────────────────

export const hqKeys = {
  dashboard: () => ["hq", "dashboard"] as const,
  orders: (filters: HQOrderFilters) => ["hq", "orders", filters] as const,
  transactions: (filters: HQFinanceFilters) =>
    ["hq", "transactions", filters] as const,
  financials: (filters: HQFinanceFilters) =>
    ["hq", "financials", filters] as const,
  reportTypes: () => ["hq", "report-types"] as const,
  report: (filters: HQReportFilters) => ["hq", "report", filters] as const,
  auditLogs: (filters: HQAuditLogFilters) =>
    ["hq", "audit-logs", filters] as const,
  riders: (filters: HQRiderFilters) => ["hq", "riders", filters] as const,
}

// ── Dashboard (20.1) ────────────────────────────────────────────────────────

export function useHQDashboard() {
  return useQuery({
    queryKey: hqKeys.dashboard(),
    queryFn: hqService.getDashboardKPIs,
    staleTime: STALE_TIME,
  })
}

// ── Orders (20.3) ───────────────────────────────────────────────────────────

export function useHQOrders(filters: HQOrderFilters) {
  return useQuery({
    queryKey: hqKeys.orders(filters),
    queryFn: () => hqService.getOrders(filters),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  })
}

// ── Finance (20.4) ──────────────────────────────────────────────────────────

export function useHQTransactions(filters: HQFinanceFilters) {
  return useQuery({
    queryKey: hqKeys.transactions(filters),
    queryFn: () => hqService.getTransactions(filters),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  })
}

export function useHQFinancials(filters: HQFinanceFilters) {
  return useQuery({
    queryKey: hqKeys.financials(filters),
    queryFn: () => hqService.getFinancials(filters),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (financialId: string) => hqService.markPaid(financialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hq", "financials"] })
      toast.success("Marked as paid")
    },
    onError: () => {
      toast.error("Failed to mark as paid")
    },
  })
}

export function useRunSettlementNow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RunSettlementPayload = {}) =>
      hqService.runSettlementNow(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hq", "financials"] })
      queryClient.invalidateQueries({ queryKey: ["hq", "transactions"] })
      if (result.mode === "ALL_SHOPS" && result.summary) {
        const { settled, skipped, failed } = result.summary
        toast.success(
          `Settlement run complete — ${settled} settled${skipped ? `, ${skipped} skipped` : ""}${failed ? `, ${failed} failed` : ""}`,
        )
      } else {
        toast.success("Settlement run complete for the selected shop")
      }
    },
    onError: () => {
      toast.error("Failed to run settlement")
    },
  })
}

// ── Reports (20.5) ──────────────────────────────────────────────────────────

export function useHQReportTypes() {
  return useQuery({
    queryKey: hqKeys.reportTypes(),
    queryFn: hqService.getReportTypes,
    staleTime: 5 * 60_000,
  })
}

export function useHQReport(filters: HQReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: hqKeys.report(filters),
    queryFn: () => hqService.generateReport(filters),
    staleTime: STALE_TIME,
    enabled,
  })
}

// ── Audit Logs (20.6) ───────────────────────────────────────────────────────

export function useHQAuditLogs(filters: HQAuditLogFilters) {
  return useQuery({
    queryKey: hqKeys.auditLogs(filters),
    queryFn: () => hqService.getAuditLogs(filters),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  })
}

// ── Riders (20.7) ───────────────────────────────────────────────────────────

export function useHQRiders(filters: HQRiderFilters) {
  return useQuery({
    queryKey: hqKeys.riders(filters),
    queryFn: () => hqService.getRiders(filters),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  })
}

export function useApproveRider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (riderId: string) => hqService.approveRider(riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hq", "riders"] })
      toast.success("Rider approved")
    },
    onError: () => {
      toast.error("Failed to approve rider")
    },
  })
}

export function useRejectRider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ riderId, reason }: { riderId: string; reason: string }) =>
      hqService.rejectRider(riderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hq", "riders"] })
      toast.success("Rider rejected")
    },
    onError: () => {
      toast.error("Failed to reject rider")
    },
  })
}
