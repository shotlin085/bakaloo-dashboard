"use client"

/**
 * SocketEventBridge — invisible side-effect component that subscribes to
 * shop-scoped Socket.IO events at the dashboard layout level and translates
 * them into TanStack Query cache invalidations.
 *
 * Today this bridge owns a single event:
 *   - `new-order` (Req 11.5) → invalidate `["orders"]` and `["dashboard-home"]`
 *
 * Why a layout-level bridge?
 *   The new-order event must always trigger a refetch regardless of which
 *   page the operator is currently on (the dashboard home, an unrelated
 *   shop-staff page, etc.) because the resulting toast / counter update is
 *   global. Mounting the listener once next to `<ShopContextHydrator />` in
 *   `app/(dashboard)/layout.tsx` guarantees it runs for the entire authed
 *   session without each surface having to wire its own subscription.
 *
 * Shop filter (defense-in-depth)
 *   `shopRoomManager` (see `useShopRoom`) only joins `shop:{Active_Shop_Id}:orders`,
 *   so the server side already isolates `new-order` deliveries by shop. We
 *   still compare `event.shop_id` against `Active_Shop_Id` here so a buggy
 *   broadcast or stale room subscription cannot poison the cache for the
 *   wrong shop. Reading `useShopContextStore.getState().activeShopId`
 *   inside the handler keeps the listener stable (no re-subscription on
 *   every store change) while still seeing the latest shop value at the
 *   moment the event fires.
 *
 * Invalidation keys
 *   The task spec calls for `["orders"]` and `["dashboard-home"]` — plain
 *   prefix tuples that TanStack Query uses for prefix-match invalidation.
 *   Both keys are the first segments produced by `qk.orders(...)` and
 *   `qk.dashboardHome(...)`, so passing the bare prefix here covers every
 *   shop scope (`SINGLE_SHOP` and `ALL_SHOPS`) in one shot.
 *
 * Render output is `null`; the component exists purely to host effects.
 *
 * Requirements: 11.5
 *
 * Design references:
 *   - design.md §12 "Live_Updates_Channel Design"
 *   - requirements.md 11.5
 */

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useSocket } from "@/components/providers/SocketProvider"
import { useShopContextStore } from "@/store/shop-context.store"

/**
 * Minimum payload shape we depend on. The backend may carry additional
 * fields (order id, total, payment method, etc.); we only read `shop_id`
 * for the defense-in-depth filter, so a structural type avoids coupling
 * this component to the full order shape.
 */
interface NewOrderEvent {
  shop_id?: string | null
}

export function SocketEventBridge(): null {
  const socket = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const handleNewOrder = (event: NewOrderEvent | undefined): void => {
      // Defense-in-depth shop filter (see file header). When the payload
      // omits `shop_id` we fall back to "trust the room" — the server-side
      // room subscription already isolates by shop, so accepting the event
      // is safer than dropping a legitimate update.
      const eventShopId = event?.shop_id ?? null
      const activeShopId = useShopContextStore.getState().activeShopId
      if (
        eventShopId !== null &&
        activeShopId !== null &&
        eventShopId !== activeShopId
      ) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-home"] })
    }

    socket.on("new-order", handleNewOrder)
    return () => {
      socket.off("new-order", handleNewOrder)
    }
  }, [socket, queryClient])

  return null
}
