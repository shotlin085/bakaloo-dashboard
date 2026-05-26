"use client"

/**
 * `useShopProductLiveUpdates` — page-level effect that wires Socket.IO
 * `stock-out` and `low-stock` events into the Shop_Products list cache.
 *
 * Wave 8.8 of the multi-vendor dashboard. Mounts inside the page so that
 * (a) the listeners only run while the inventory surface is visible, and
 * (b) they automatically tear down on navigation.
 *
 * ── Contract ────────────────────────────────────────────────────────────────
 *
 * Preconditions
 *   - The dashboard layout already mounted `useShopRoom()` via the
 *     `<ShopContextHydrator />` (task 13.1), so `shopRoomManager` joined
 *     `shop:{Active_Shop_Id}:stock` (and `:orders`) the moment the active
 *     shop was set. This hook does not pivot rooms — that responsibility
 *     stays with the hydrator and the Shop_Switcher (Req 11.2, 11.7).
 *   - When `mode !== "STORE_MODE"` the page short-circuits to the empty
 *     state above this hook's call site, so this hook is only mounted when
 *     `activeShopId` is non-null.
 *
 * Behavior
 *   - Subscribes to two server-emitted events on the live-updates channel:
 *     `stock-out` and `low-stock` (Req 7.8, 11.3, 11.4).
 *   - Each event payload carries `{ shop_product_id, name, stock_quantity,
 *     shop_id }`. Events whose `shop_id !== activeShopId` are ignored —
 *     defense-in-depth in case a leaked room rotation lets a cross-shop
 *     event slip through after a Super_Admin pivot.
 *   - On a matching event, mutates every TanStack Query cache entry under
 *     the `["shop-products", activeShopId, …]` key prefix in place via
 *     `queryClient.setQueriesData`. The patch only touches the row whose
 *     `id === event.shop_product_id`; page length and ordering are
 *     preserved (Req 14.5, Property 9).
 *     - `low-stock`  → `{ stock_quantity: event.stock_quantity }`
 *     - `stock-out`  → `{ stock_quantity: 0, is_available: false,
 *                         sold_out_at: <now> }`
 *       The event payload does not carry `sold_out_at`; we stamp it
 *       client-side so the row tooltip has a value until the next
 *       background refetch reconciles with server truth.
 *   - Surfaces a Sonner toast for each event:
 *     - `stock-out` → `Out of stock: <name>`         via `toast.error`
 *     - `low-stock` → `Low stock: <name> (<qty> left)` via `toast.warning`
 *     The literal copy lives in `lib/i18n.ts` under the
 *     `shopProducts.toast.{soldOut,lowStock}` keys (task 1.7).
 *   - Cleanup: on unmount or `activeShopId` change, both `socket.off`
 *     handles are released so a stale cache pointer cannot fire after the
 *     user navigates away. The socket itself stays connected (owned by
 *     `<SocketProvider>`).
 *
 * Non-goals
 *   - Joining or leaving rooms — handled by `shopRoomManager` via the
 *     Shop_Context_Store subscription (`useShopRoom`, task 13.1).
 *   - Refetching the list query after an event. The brief explicitly asks
 *     for in-place cache updates so paginated views don't shuffle while
 *     the user is mid-edit (Property 9 + design §15 "in-place cache
 *     update for socket events"). The next page navigation or filter
 *     change refetches normally.
 *
 * Requirements: 7.8, 11.3, 11.4, 14.5
 */

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useSocket } from "@/components/providers/SocketProvider"
import { useShopContext } from "@/hooks/useShopContext"
import { t } from "@/lib/i18n"
import type { Paginated, ShopProduct } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Event shapes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload shared by `stock-out` and `low-stock` events on the
 * `shop:{id}:stock` room. Must match the backend emit shape; only the
 * fields this hook reads are typed here.
 *
 * The `shop_id` slot is the defense-in-depth guard: if room rotation
 * leaks (e.g. a stale subscription on a Super_Admin pivot), filtering on
 * `shop_id !== activeShopId` keeps cross-shop events out of the cache.
 */
interface StockEventPayload {
  shop_product_id: string
  name: string
  stock_quantity: number
  shop_id: string
}

/**
 * Tag used as the leading segment of the TanStack Query key for every
 * Shop_Products list cache entry (see `qk.shopProducts` in
 * `src/lib/query-keys.ts`). Centralized so the predicate-based
 * invalidation here matches the factory-built key shape exactly.
 */
const SHOP_PRODUCTS_QUERY_TAG = "shop-products"

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to stock-out / low-stock events for the active shop and apply
 * surgical in-place updates to every cached Shop_Products list page.
 *
 * Idempotent across remounts: each effect cycle re-binds its own pair of
 * listeners and removes them on cleanup, so React StrictMode double-mount
 * cycles in development do not duplicate handlers.
 */
export function useShopProductLiveUpdates(): void {
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { activeShopId, mode } = useShopContext()

  useEffect(() => {
    // Only run while a single shop is active. The page itself short-circuits
    // to `<EmptyShopState />` outside `SINGLE_SHOP` mode (Req 7.11), but the
    // hook is mounted unconditionally above the early-return so React's
    // hook ordering stays stable across renders.
    if (!socket || !activeShopId || mode !== "STORE_MODE") return

    /**
     * Apply a row-level patch to every cached Shop_Products page rooted at
     * `["shop-products", activeShopId, …]`.
     *
     * `setQueriesData` walks every matching cache entry; the updater
     * preserves `pagination`, the array length, and item ordering — only
     * the row whose `id === id` is structurally cloned with the patch
     * merged on top. Non-paginated entries (e.g. detail caches under
     * `qk.shopProduct`) are skipped via the `Paginated`-shape guard so
     * the same hook can coexist with future cache layouts.
     */
    const applyPatch = (id: string, patch: Partial<ShopProduct>): void => {
      queryClient.setQueriesData<Paginated<ShopProduct>>(
        { queryKey: [SHOP_PRODUCTS_QUERY_TAG, activeShopId] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old
          // Skip the structural clone if the row is not on this page —
          // important for paginated lists where the event might land on a
          // page the user is not currently viewing. Returning `old` as-is
          // keeps TanStack Query's referential equality intact and avoids
          // a wasted re-render.
          if (!old.items.some((p) => p.id === id)) return old
          return {
            ...old,
            items: old.items.map((p) =>
              p.id === id ? { ...p, ...patch } : p,
            ),
          }
        },
      )
    }

    /**
     * `stock-out` handler — clamp the row to zero stock, mark it
     * unavailable, and stamp `sold_out_at` so the row tooltip has a
     * value before the next refetch. The toast uses `toast.error` to
     * mirror design §8 ("toast.error(t('shopProducts.toast.soldOut'))").
     */
    const onStockOut = (evt: StockEventPayload): void => {
      // Defense-in-depth guard against cross-shop event leaks.
      if (!evt || evt.shop_id !== activeShopId) return

      applyPatch(evt.shop_product_id, {
        stock_quantity: 0,
        is_available: false,
        sold_out_at: new Date().toISOString(),
      })

      toast.error(t("shopProducts.toast.soldOut", { name: evt.name }))
    }

    /**
     * `low-stock` handler — propagate the new `stock_quantity` to the
     * cached row. We do NOT flip `is_available` here: low-stock means
     * "still buyable, but close to threshold", and the threshold is set
     * by the operator independently of the stock count.
     */
    const onLowStock = (evt: StockEventPayload): void => {
      if (!evt || evt.shop_id !== activeShopId) return

      applyPatch(evt.shop_product_id, {
        stock_quantity: evt.stock_quantity,
      })

      toast.warning(
        t("shopProducts.toast.lowStock", {
          name: evt.name,
          qty: evt.stock_quantity,
        }),
      )
    }

    socket.on("stock-out", onStockOut)
    socket.on("low-stock", onLowStock)

    return () => {
      socket.off("stock-out", onStockOut)
      socket.off("low-stock", onLowStock)
    }
  }, [socket, activeShopId, mode, queryClient])
}
