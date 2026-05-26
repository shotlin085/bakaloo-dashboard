"use client"

/**
 * Banners hooks — wraps the existing banner endpoints so each cache entry
 * is keyed by `qk.banners(shopKey, params)` and therefore participates in
 * the Shop_Switcher's predicate-based invalidation (Req 3.4, 10.3).
 *
 * Banners are designed as a per-shop surface (Req 10.5 lists "shop-scoped
 * banners" among the SINGLE_SHOP-only sections); the page itself renders
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

import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "@/services/banners.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { CreateBannerPayload, UpdateBannerPayload } from "@/types/banner.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

export function useBanners() {
  const { mode, activeShopId } = useShopContext()
  const shopKey =
    mode === "HQ_MODE" ? "ALL" : activeShopId ?? NONE_SHOP_KEY

  return useQuery({
    queryKey: qk.banners(shopKey, {}),
    queryFn: getBanners,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBannerPayload) => createBanner(payload),
    onSuccess: () => {
      toast.success("Banner created successfully")
      // Prefix-based invalidate drops every shop-keyed `banners` entry in
      // one pass — TanStack Query matches the first key segment so the new
      // `qk.banners(shopKey, …)` shape is covered without enumerating
      // scopes.
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create banner")
    },
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBannerPayload }) =>
      updateBanner(id, payload),
    onSuccess: () => {
      toast.success("Banner updated successfully")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update banner")
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner deleted")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete banner")
    },
  })
}

export function useReorderBanners() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderBanners(orderedIds),
    onSuccess: () => {
      toast.success("Banners reordered")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reorder banners")
    },
  })
}
