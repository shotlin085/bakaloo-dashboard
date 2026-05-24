"use client"

/**
 * Reviews hooks — shop-scoped product-review list + per-review mutations.
 *
 * Wave 12 of the multi-vendor dashboard. The list query reads
 * `Active_Shop_Id` via `useShopContext()` and keys its cache entry through
 * the central `qk.reviews(shopKey, filters)` builder so the Shop_Switcher's
 * predicate-based invalidation drops every reviews cache entry on each shop
 * change (Req 3.4, 10.3).
 *
 * Filtering rules (Req 10.9):
 *   - `mode === "SINGLE_SHOP"` → forward `shop_id = activeShopId` so the
 *     backend returns only reviews on products belonging to that shop. The
 *     query is gated on `enabled: shopKey !== "NONE" && !!productId` so it
 *     never fires while the Shop_Context_Store is still hydrating or before
 *     the page has selected a product.
 *   - `mode === "ALL_SHOPS"` → omit the `shop_id` filter; super-admins
 *     see the unscoped cross-shop list (Req 10.4).
 *   - `mode === "UNSELECTED"` → `shopKey === "NONE"` and the query is
 *     disabled outright. Mirrors the convention used by `useOrders`,
 *     `useCustomers`, and `useShopProductsList`.
 *
 * The vendor-overlap 404 enforcement (Req 10.10) lives at the consumer (the
 * `/reviews` page), which compares each review's `shop_id` to the user's
 * `assignedShopIds`. Reviews lacking `shop_id` (legacy responses) are
 * treated as "not enforced" so super-admin views and pre-migration backend
 * data don't regress.
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §11 "Existing-Page Shop Scoping"
 *   - requirements.md 10.1, 10.3, 10.9, 10.10
 */

import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getProductReviews,
  replyToReview,
  moderateReview,
  deleteReview,
} from "@/services/reviews.service"
import type { ReviewFilters } from "@/types/review.types"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"

/**
 * Sentinel `shopId` slot used in the list query key when the
 * Shop_Context_Store has not yet been hydrated. The query is gated by
 * `enabled` (see below) so it never fires in this state, but TanStack Query
 * still requires a stable key. Mirrors the convention from
 * `useShopProductsList`, `useOrders`, and `useCustomers` so cache snapshots
 * line up across surfaces.
 */
const NONE_SHOP_KEY = "NONE"

export function useProductReviews(
  productId: string | null,
  filters: ReviewFilters = {}
) {
  const { activeShopId, mode } = useShopContext()

  // shopKey decides both the cache identity and the `shop_id` query param:
  //   - ALL_SHOPS  → "ALL"; cache by ALL, no shop_id filter on the request.
  //   - SINGLE_SHOP→ activeShopId; cache by id, forward shop_id=<id>.
  //   - UNSELECTED → "NONE"; query disabled, key still stable.
  const shopKey: string =
    mode === "ALL_SHOPS"
      ? "ALL"
      : activeShopId ?? NONE_SHOP_KEY

  // Build the merged filter set so the query key stays a structural function
  // of all inputs. Including `productId` in the params slot keeps each
  // product's review page on its own cache line — the central
  // `qk.reviews(shopKey, params)` builder accepts an arbitrary `ListParams`
  // shape, and review filters (`page`, `limit`, `rating`, `status`,
  // `shop_id`) are structurally compatible.
  const mergedFilters: ReviewFilters & { productId: string | null } = useMemo(() => {
    const base: ReviewFilters & { productId: string | null } = {
      ...filters,
      productId,
    }
    if (mode === "SINGLE_SHOP" && activeShopId) {
      return { ...base, shop_id: activeShopId }
    }
    // ALL_SHOPS or UNSELECTED: drop any caller-supplied shop_id so the
    // cache identity matches the super-admin "all reviews" view.
    if (base.shop_id !== undefined) {
      const next: ReviewFilters & { productId: string | null } = { ...base }
      delete next.shop_id
      return next
    }
    return base
  }, [filters, productId, mode, activeShopId])

  return useQuery({
    queryKey: qk.reviews(shopKey, mergedFilters),
    queryFn: () => getProductReviews(productId!, mergedFilters),
    enabled: shopKey !== NONE_SHOP_KEY && !!productId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useReplyReview(_productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      replyToReview(reviewId, reply),
    onSuccess: () => {
      // Prefix-based invalidate so every shop-scoped reviews cache entry
      // (ALL, single-shop ids, "NONE") is dropped without us having to
      // enumerate scopes. Matches the convention from `useCustomers`.
      qc.invalidateQueries({ queryKey: ["reviews"] })
      toast.success("Reply posted")
    },
    onError: () => toast.error("Failed to post reply"),
  })
}

export function useModerateReview(_productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      reviewId,
      status,
    }: {
      reviewId: string
      status: "approved" | "hidden" | "spam"
    }) => moderateReview(reviewId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] })
      toast.success("Review status updated")
    },
    onError: () => toast.error("Failed to moderate review"),
  })
}

export function useDeleteReview(_productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] })
      toast.success("Review deleted")
    },
    onError: () => toast.error("Failed to delete review"),
  })
}
