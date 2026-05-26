"use client"

/**
 * Settings hooks — wraps the existing settings endpoints so each cache
 * entry is keyed by `qk.settings(shopKey, params)` and therefore
 * participates in the Shop_Switcher's predicate-based invalidation
 * (Req 3.4, 10.3).
 *
 * Settings are designed as a per-shop surface (Req 10.5 lists "shop-scoped
 * settings" among the SINGLE_SHOP-only sections); the page itself renders
 * `<EmptyShopState />` outside `SINGLE_SHOP` mode, but the hook still
 * keys its query by `shopKey` so the cache lines never bleed across shops.
 *
 * The list query is gated by `enabled: shopKey !== "NONE"` to mirror the
 * convention from `useOrders` / `useShopProductsList`.
 *
 * Requirements: 10.1, 10.3, 10.5
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { getSettings, updateSettings } from "@/services/settings.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { UpdateSettingsPayload } from "@/types/settings.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

export function useSettings() {
  const { mode, activeShopId } = useShopContext()
  const shopKey =
    mode === "HQ_MODE" ? "ALL" : activeShopId ?? NONE_SHOP_KEY

  return useQuery({
    queryKey: qk.settings(shopKey, {}),
    queryFn: getSettings,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onSuccess: () => {
      toast.success("Settings saved")
      // Prefix-based invalidate drops every shop-keyed `settings` entry in
      // one pass — TanStack Query matches the first key segment so the new
      // `qk.settings(shopKey, …)` shape is covered without enumerating
      // scopes.
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
    onError: () => toast.error("Failed to save settings"),
  })
}
