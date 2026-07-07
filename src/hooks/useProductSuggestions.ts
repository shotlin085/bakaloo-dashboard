"use client"

/**
 * Product Suggestions hooks — global (not per-shop) settings, same
 * rationale as useWallet/useDeliveryCalendar: one cache entry for the
 * whole app.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { productSuggestionsService } from "@/services/product-suggestions.service"

const RULES_QUERY_KEY = ["admin", "product-suggestions", "rules"] as const

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

export function useProductSuggestionRules() {
  return useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: productSuggestionsService.getRules,
    staleTime: 30_000,
  })
}

export function useReplaceProductSuggestionRules() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sourceCategoryId,
      targetCategoryIds,
    }: {
      sourceCategoryId: string
      targetCategoryIds: string[]
    }) => productSuggestionsService.replaceRules(sourceCategoryId, targetCategoryIds),
    onSuccess: () => {
      toast.success("Suggestion rule saved")
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
