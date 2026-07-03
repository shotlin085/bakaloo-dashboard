"use client"

/**
 * Categories hooks — wraps the existing master-catalog endpoints so each
 * cache entry is keyed by `qk.categories(shopKey, params)` and therefore
 * participates in the Shop_Switcher's predicate-based invalidation
 * (Req 3.4, 10.3).
 *
 * Note on scoping:
 *   The categories endpoint itself is a shared master catalog rather than
 *   a per-shop dataset, but the design's central tag list still includes
 *   `categories` so the Shop_Switcher invalidates it on every pivot. In
 *   practice this keeps the cache aligned with whatever scoped views the
 *   backend may add (e.g. category visibility per shop) without forcing a
 *   second refactor. The list query is gated by `enabled: shopKey !== "NONE"`
 *   to mirror the pattern established by `useOrders` / `useShopProductsList`.
 *
 * The flat and tree variants share a single cache entry — `useCategoryTree`
 * applies a structural `select` transform on top of the flat list, avoiding
 * a second network round-trip and keeping invalidation behavior simple.
 *
 * Requirements: 10.1, 10.3
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getCategories,
  getBundles,
  getCategoriesForProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProductRanks,
  setCategoryProducts,
  toggleCategoryMembership,
} from "@/services/categories.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { Category, CategoryTree } from "@/types"

/**
 * Sentinel `shopId` slot used while the Shop_Context_Store is hydrating.
 * Mirrors the convention from `useOrders`, `useCustomers`, `useReviews`.
 */
const NONE_SHOP_KEY = "NONE"

/** Build tree from flat list using parent_id. */
function buildTree(categories: Category[]): CategoryTree[] {
  const map = new Map<string | null, CategoryTree[]>()

  // Initialize
  categories.forEach((c) => {
    if (!map.has(c.parent_id)) map.set(c.parent_id, [])
  })

  categories.forEach((c) => {
    const parent = c.parent_id
    const list = map.get(parent) ?? []
    list.push({ ...c, children: [] })
    map.set(parent, list)
  })

  function attach(nodes: CategoryTree[]): CategoryTree[] {
    return nodes
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((node) => ({
        ...node,
        children: attach(map.get(node.id) ?? []),
      }))
  }

  return attach(map.get(null) ?? [])
}

/**
 * Resolve the `shopKey` slot used by every list query in this module.
 *
 * `ALL_SHOPS` → `"ALL"`; `SINGLE_SHOP` → `activeShopId`; otherwise the
 * sentinel `"NONE"` (which gates the query off via `enabled`).
 */
function useShopKey(): string {
  const { mode, activeShopId } = useShopContext()
  return mode === "HQ_MODE" ? "ALL" : activeShopId ?? NONE_SHOP_KEY
}

export function useCategories() {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: qk.categories(shopKey, {}),
    queryFn: getCategories,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

export function useCategoryTree() {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: qk.categories(shopKey, {}),
    queryFn: getCategories,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 60 * 1000,
    // Reuses the same cache entry as `useCategories` and projects it into
    // the parent/child tree shape on demand. No additional fetch is fired
    // when both hooks are mounted on the same screen.
    select: buildTree,
    placeholderData: (prev) => prev,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof createCategory>[0]) =>
      createCategory(payload),
    onSuccess: () => {
      toast.success("Category created")
      // Prefix-based invalidate drops every shop-keyed `categories` entry
      // (ALL, single-shop ids, "NONE") in one pass — TanStack Query matches
      // the first key segment so the new `qk.categories(shopKey, …)` shape
      // is covered without enumerating scopes.
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create category"),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      toast.success("Category updated")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update category"),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete category"),
  })
}

/**
 * List bundle (promo-only) categories — the dashboard's "Bundles" tab.
 */
export function useBundles(productId?: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: [...qk.categories(shopKey, {}), "bundles", productId ?? null] as const,
    queryFn: () => getBundles(productId),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 60 * 1000,
  })
}

/**
 * Every category a product can be cross-listed into (its own primary
 * category excluded), each flagged `is_member` — the product edit form's
 * "also show in other categories" multi-select. This is the multi-category
 * feature: a product keeps its one real category (set on the product
 * itself) and can additionally appear under any number of other categories
 * or bundles.
 */
export function useCategoriesForProduct(productId?: string) {
  return useQuery({
    queryKey: ["categories", "for-product", productId ?? null] as const,
    queryFn: () => getCategoriesForProduct(productId as string),
    enabled: !!productId,
  })
}

/** Add/remove a single product from a category or bundle (product edit form toggle). */
export function useToggleCategoryMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      productId,
      isMember,
    }: {
      categoryId: string
      productId: string
      isMember: boolean
    }) => toggleCategoryMembership(categoryId, productId, isMember),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update category"),
  })
}

export function useCreateBundle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Parameters<typeof createCategory>[0], "category_type">) =>
      createCategory({ ...payload, category_type: "BUNDLE" }),
    onSuccess: () => {
      toast.success("Bundle created")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create bundle"),
  })
}

/**
 * Current product ranking/membership for a category or bundle. Not
 * shop-scoped (this is admin ranking data, not a per-shop dataset), so it
 * uses a plain key rather than `qk.categories` — still invalidated by the
 * broad `["categories"]` prefix used everywhere else in this file.
 */
export function useCategoryProductRanks(categoryId: string | null) {
  return useQuery({
    queryKey: ["categories", "products", categoryId] as const,
    queryFn: () => getCategoryProductRanks(categoryId as string),
    enabled: !!categoryId,
  })
}

/**
 * Replace a category's product membership/order — sets bundle members, or
 * pins/reorders a standard category's ranking. Used by the drag-and-drop
 * product-ranking panel.
 */
export function useSetCategoryProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, productIds }: { categoryId: string; productIds: string[] }) =>
      setCategoryProducts(categoryId, productIds),
    onSuccess: () => {
      toast.success("Product order saved")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save product order"),
  })
}
