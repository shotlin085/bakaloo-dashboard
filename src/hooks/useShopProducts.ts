"use client"

/**
 * Shop_Products_UI hooks — list, master-catalog search, add / update / remove.
 *
 * Wave 8 of the multi-vendor dashboard. The `Active_Shop_Id` is read from
 * `useShopContext()` for the list query key only — every outbound HTTP
 * request derives shop scope from the `X-Shop-Id` header injected by the
 * axios interceptor (see `lib/api.ts`). The hook therefore never threads
 * `shopId` into service calls.
 *
 * Mutation hooks accept `shopId` explicitly so the page that owns the
 * Add/Edit/Remove dialogs can pin invalidation to the shop the dialog was
 * opened against, even if a Super_Admin Shop_Switcher pivot lands while the
 * dialog is in flight (the `X-Shop-Id` header would still match because the
 * dialog forwards the shop the user picked into the mutation invocation).
 *
 * Optimistic update for `useUpdateShopProduct` follows the canonical
 * TanStack Query pattern from design.md §8:
 *
 *   onMutate  → cancel in-flight queries matching `["shop-products", shopId]`,
 *               snapshot every matching cache entry, apply the patch in place
 *               via `setQueriesData` so the row updates without a refetch.
 *   onError   → restore each snapshotted entry verbatim and surface a
 *               localized failure toast.
 *   onSettled → invalidate the page query so the next render reconciles
 *               with server truth (Property 8 — round-trip rollback).
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §8  "Shop_Products_UI — Live Updates & Optimistic Mutations"
 *   - design.md §15 "Performance Budget"
 *
 * Requirements: 7.1, 7.9, 7.11
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { useShopContext } from "@/hooks/useShopContext"
import { t } from "@/lib/i18n"
import { qk } from "@/lib/query-keys"
import {
  shopProductsService,
  type ShopProductCreateBody,
  type ShopProductUpdateBody,
  type ShopProductsListParams,
} from "@/services/shop-products.service"
import type { Paginated, Product, ShopProduct } from "@/types"

/**
 * `staleTime` for the master-catalog typeahead query.
 *
 * The catalog rarely changes during a single Add_Product_Dialog session so
 * we let identical query strings stay fresh for 60 s — re-opening the
 * dialog or backspacing to a previous query then retyping it does not
 * refire the request.
 */
const CATALOG_SEARCH_STALE_TIME_MS = 60_000

/**
 * `staleTime` for the inventory list query.
 *
 * Inventory mutates frequently (price edits, stock decrements from new
 * orders, sold-out flips emitted via Socket.IO), so the budget is short:
 * 30 s — long enough to avoid refetch storms when the operator pages
 * through filters, short enough that a stale row is replaced quickly even
 * without a live update event landing (design.md §15 — Performance Budget).
 */
const SHOP_PRODUCTS_STALE_TIME_MS = 30_000

/**
 * Sentinel `shopId` slot used in the list query key when no shop is active.
 *
 * The query is gated by `enabled` (see below) so it never runs in this
 * state, but TanStack Query still requires a stable key. Using a literal
 * keeps the key shape consistent with `qk.shopProducts` and prevents
 * accidental cache hits across shops if a future caller forgets to gate.
 */
const NONE_SHOP_KEY = "NONE"

// ─────────────────────────────────────────────────────────────────────────────
// useShopProductsList — paginated inventory list for the active shop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated shop-products list for `Active_Shop_Id` (Req 7.1).
 *
 * The query is disabled outside `SINGLE_SHOP` mode so no list request fires
 * when the Super_Admin is in `ALL_SHOPS` mode or when the Shop_Context_Store
 * has not yet been populated. The page itself short-circuits to
 * `<EmptyShopState />` in that branch (design §11), so users never see a
 * spinner for a request that would 400 on the backend (the `/shop-products`
 * route requires the `X-Shop-Id` header).
 *
 * `placeholderData: (prev) => prev` keeps the previous page's rows visible
 * while the next page loads, matching the dashboard's list-hook convention
 * (Req 14.2 / design §15).
 */
export function useShopProductsList(filters: ShopProductsListParams) {
  const { activeShopId, mode } = useShopContext()
  const shopKey = activeShopId ?? NONE_SHOP_KEY

  return useQuery({
    queryKey: qk.shopProducts(shopKey, filters),
    queryFn: () => shopProductsService.list(filters),
    enabled: mode === "SINGLE_SHOP" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: SHOP_PRODUCTS_STALE_TIME_MS,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useSearchProductCatalog — typeahead over the master catalog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master-catalog typeahead used by the Add_Product_Dialog (Req 7.4).
 *
 * Disabled for empty / whitespace-only queries so the dropdown stays empty
 * until the operator types something meaningful. The 60 s `staleTime`
 * (`CATALOG_SEARCH_STALE_TIME_MS`) avoids re-firing an identical request
 * when the user pages through results then narrows the query again.
 *
 * The query key is intentionally outside `qk.products(shopId, params)` (the
 * shop-scoped wrapper recognised by `isShopScopedKey`) because the catalog
 * is global — switching shops must not blow this cache away.
 */
export function useSearchProductCatalog(query: string) {
  const trimmed = query.trim()
  return useQuery<Product[]>({
    queryKey: ["product-catalog-search", trimmed],
    queryFn: () => shopProductsService.searchCatalog(trimmed),
    enabled: trimmed.length > 0,
    staleTime: CATALOG_SEARCH_STALE_TIME_MS,
    placeholderData: (prev) => prev,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useAddShopProduct — POST /shop-products
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a master-catalog product to the active shop's inventory (Req 7.4).
 *
 * On success: invalidate every cache entry rooted at
 * `["shop-products", shopId, …]` so the list refetches and the new row
 * appears, then surface a localized success toast.
 */
export function useAddShopProduct(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation<ShopProduct, Error, ShopProductCreateBody>({
    mutationFn: (body) => shopProductsService.add(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products", shopId] })
      toast.success(t("shopProducts.toast.added"))
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useUpdateShopProduct — PATCH /shop-products/:id with optimistic update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Variables accepted by the update mutation.
 *
 * The mutationFn takes `{ id, body }` per the task brief so the row id is
 * available to the optimistic-update path inside `onMutate` without
 * threading it through a closure on the call site.
 */
export interface UpdateShopProductVariables {
  id: string
  body: ShopProductUpdateBody
}

/**
 * Snapshot of every shop-products cache entry at the moment a mutation
 * starts. Captured by `onMutate` and consumed by `onError` to roll the
 * cache back verbatim if the request fails.
 *
 * `data` is `unknown` so the same shape can carry both the canonical
 * `Paginated<ShopProduct>` page entries and any future entry shapes (e.g.
 * a single-product detail entry under
 * `qk.shopProduct(shopId, id) = ["shop-products", shopId, "detail", id]`).
 */
interface UpdateShopProductContext {
  previous: Array<[QueryKey, unknown]>
}

/**
 * Update non-stock fields on a shop product with optimistic UI (Req 7.9).
 *
 * Applies the patch in place across every paginated cache entry rooted at
 * `["shop-products", shopId, …]` so the row reflects the new values
 * immediately. On error, restores the snapshot verbatim. On settle (success
 * or failure), invalidates the same prefix so the next render reconciles
 * with server truth — including any server-side fields the patch might
 * have indirectly affected (`is_available` flips when stock crosses zero).
 *
 * Stock changes do NOT flow through this mutation; they go through the
 * dedicated `PATCH /:id/stock` endpoint owned by a future task (see
 * `shop-products.service.ts` notes on `updateStock`).
 */
export function useUpdateShopProduct(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ShopProduct,
    Error,
    UpdateShopProductVariables,
    UpdateShopProductContext
  >({
    mutationFn: ({ id, body }) => shopProductsService.update(id, body),

    onMutate: async ({ id, body }) => {
      // Cancel in-flight refetches so the optimistic patch is not
      // overwritten by a stale response landing after onMutate runs.
      await queryClient.cancelQueries({ queryKey: ["shop-products", shopId] })

      // Snapshot every matching entry. `getQueriesData` returns
      // `[QueryKey, T | undefined][]`; we keep the full tuple so the
      // rollback path can `setQueryData` the same key back.
      const previous = queryClient.getQueriesData({
        queryKey: ["shop-products", shopId],
      })

      // Apply the patch in place to every paginated list entry under the
      // `["shop-products", shopId, …]` prefix. Detail entries (if any
      // future caller seeds `qk.shopProduct`) are skipped by the
      // `Paginated`-shape guard so this stays safe across key variants.
      //
      // The cast on the merged row reconciles `ShopProductUpdateBody`'s
      // `number | null` slots (e.g. `price?: number | null` so callers can
      // clear an optional sale_price) with `ShopProduct`'s strict shape;
      // `price` is required on the row but optional+nullable on the patch
      // body, so the structural merge type widens beyond `ShopProduct`.
      // Runtime is always assignable: the backend rejects `null` for
      // required columns and the dialog only sends `null` for nullable
      // optionals (`sale_price`, `cost_price`).
      queryClient.setQueriesData<Paginated<ShopProduct>>(
        { queryKey: ["shop-products", shopId] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old
          return {
            ...old,
            items: old.items.map((p) =>
              p.id === id ? ({ ...p, ...body } as ShopProduct) : p,
            ),
          }
        },
      )

      return { previous }
    },

    onError: (_err, _vars, context) => {
      // Restore the snapshot verbatim — every entry we touched is rolled
      // back to its pre-mutation value (Property 8: round-trip rollback).
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      toast.error(t("shopProducts.toast.updateFailed"))
    },

    onSettled: () => {
      // Reconcile with server truth regardless of success/failure so
      // server-side derived fields (e.g. `is_available` flipping when
      // stock crosses zero) flow back into the cache.
      queryClient.invalidateQueries({ queryKey: ["shop-products", shopId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useRemoveShopProduct — DELETE /shop-products/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete a shop product (Req 7.10).
 *
 * No optimistic update — removals are infrequent and the user has already
 * confirmed via a dialog, so a brief network round-trip before the row
 * disappears is acceptable and avoids the rollback complexity of a
 * mid-list splice. On success: invalidate the list and surface a localized
 * success toast.
 */
export function useRemoveShopProduct(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => shopProductsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products", shopId] })
      toast.success(t("shopProducts.toast.removed"))
    },
  })
}
