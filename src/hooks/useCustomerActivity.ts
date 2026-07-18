"use client"

/**
 * Customer Activity hooks — resolve a User ID/phone to a real customer,
 * then fetch their paginated, filterable activity timeline. Not shop-
 * scoped: a customer's activity spans the whole system regardless of
 * which shop an admin currently has selected, so this deliberately does
 * NOT participate in the Shop_Switcher's shopKey/predicate-invalidation
 * pattern used by shop-scoped lists elsewhere in this app (mirrors
 * useResolveWalletUser's simpler, non-shop-scoped shape).
 */

import { useQuery } from "@tanstack/react-query"

import {
  resolveCustomerActivityUser,
  getCustomerActivityTimeline,
} from "@/services/customer-activity.service"
import type { CustomerActivityFilters } from "@/types/customer-activity.types"

/**
 * Resolves a (debounced, caller-supplied) User ID or phone number to the
 * matching customer, so the page can show who's being investigated and
 * fetch their timeline. `query` should already be debounced by the caller.
 */
export function useResolveCustomerActivityUser(query: string) {
  return useQuery({
    queryKey: ["customer-activity", "resolve-user", query] as const,
    queryFn: () => resolveCustomerActivityUser(query),
    enabled: query.trim().length >= 3,
    staleTime: 30_000,
    retry: false,
  })
}

export function useCustomerActivityTimeline(
  userId: string | null,
  filters: CustomerActivityFilters
) {
  return useQuery({
    queryKey: ["customer-activity", "timeline", userId, filters] as const,
    queryFn: () => getCustomerActivityTimeline(userId as string, filters),
    enabled: !!userId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
