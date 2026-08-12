"use client"

/**
 * GSTR-1 hooks — deliberately NOT shop-scoped (unlike useAnalytics.ts's
 * shopKey pattern). This is a single business-wide report tied to one
 * filed GSTIN, so it always fires regardless of the shop switcher.
 */

import { useQuery } from "@tanstack/react-query"
import { getGstr1Period, getB2CS, getHsnSummary } from "@/services/gstr1.service"
import type { Gstr1PeriodParams } from "@/types/gstr1.types"

function isComplete(params: Gstr1PeriodParams): boolean {
  if (!params.year) return false
  if (params.periodType === "MONTH") return !!params.month
  if (params.periodType === "QUARTER") return !!params.quarter
  return false
}

function periodKey(params: Gstr1PeriodParams) {
  return [params.periodType, params.year, params.month ?? params.quarter] as const
}

export function useGstr1Period(params: Gstr1PeriodParams) {
  return useQuery({
    queryKey: ["gstr1", "period", ...periodKey(params)] as const,
    queryFn: () => getGstr1Period(params),
    enabled: isComplete(params),
    staleTime: 60_000,
  })
}

export function useGstr1B2CS(params: Gstr1PeriodParams) {
  return useQuery({
    queryKey: ["gstr1", "b2cs", ...periodKey(params)] as const,
    queryFn: () => getB2CS(params),
    enabled: isComplete(params),
    staleTime: 60_000,
  })
}

export function useGstr1HsnSummary(params: Gstr1PeriodParams) {
  return useQuery({
    queryKey: ["gstr1", "hsn-summary", ...periodKey(params)] as const,
    queryFn: () => getHsnSummary(params),
    enabled: isComplete(params),
    staleTime: 60_000,
  })
}
