"use client"

/**
 * Auth-flow hooks: `useMyShops` and `useSelectShop`.
 *
 * These power the Shop_Selector page (task 2.4) and the single-shop branch of
 * the post-login dispatcher (task 2.3).
 *
 * Design references:
 *   - design.md "Auth Flow Sequence Diagram"
 *   - design.md §1 "Shop_Context_Store (Zustand)"
 *   - design.md §5 "Central Query-Key Factory"
 *   - requirements.md 1.3, 2.1, 2.4
 *
 * Layering note: this hook owns query keys + post-mutation orchestration.
 * The actual axios calls live in `services/auth.service.ts` (page → hook →
 * service, mirroring the dashboard's strict layering).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMyShops, selectShop } from "@/services/auth.service"
import { qk, isShopScopedKey } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import type { ShopAssignment, SelectShopResult } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// useMyShops — list the authenticated user's shop assignments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read query for `GET /api/v1/auth/my-shops`.
 *
 * Cached for 5 minutes (`staleTime: 5 * 60_000`) because the assignment list
 * changes only when an admin invites or removes the user — far rarer than
 * the dashboard's other read queries. Survives shop-context invalidation
 * because the key is `["my-shops"]`, intentionally outside the shop-scoped
 * tag set recognised by `isShopScopedKey`.
 *
 * Errors propagate as-is so the Shop_Selector page can render its
 * `<ErrorBlock />` with the server message and a Retry affordance (Req 2.3).
 */
export function useMyShops() {
  return useQuery({
    queryKey: qk.myShops(),
    queryFn: getMyShops,
    staleTime: 5 * 60 * 1000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useSelectShop — POST /auth/select-shop and pivot the dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Variables accepted by the `useSelectShop` mutation.
 *
 * `shopAssignment` is the caller-held card from the Shop_Selector (or the
 * single embedded assignment from `loginAdmin` for the n=1 branch). Passing
 * it forward lets the service layer fold it into `SelectShopResult.shop`
 * without a second round-trip — see `services/auth.service.ts`.
 */
export interface SelectShopVariables {
  shopId: string
  shopAssignment?: ShopAssignment
}

/**
 * Mutation for `POST /api/v1/auth/select-shop`.
 *
 * On success this hook performs the canonical three-step pivot described in
 * the Auth Flow Sequence Diagram:
 *
 *   1. Replace the access token with the shop-scoped JWT in the auth store
 *      (Req 1.3, 2.4). The auth store's only token-write path is
 *      `login(user, token)`; calling it with the current user preserves
 *      every other auth field while refreshing the token + session cookie.
 *      This is a deliberate reuse of the existing API to avoid widening the
 *      auth store surface in this task.
 *   2. Set the Shop_Context_Store active shop, role, and permissions
 *      (Req 2.4). Skipped only when the service did not embed a shop
 *      summary in the response — in that case the calling page is expected
 *      to resolve the summary separately and call `setActiveShop` itself.
 *   3. Invalidate every shop-scoped TanStack Query cache entry via the
 *      central `isShopScopedKey` predicate (Req 3.4, 10.3) so any data
 *      already mounted under the previous scope is refetched against the
 *      new shop. `["my-shops"]` is intentionally NOT shop-scoped, so the
 *      assignments list survives the pivot.
 *
 * Errors are not toasted here; the calling page (Shop_Selector / login
 * dispatcher) renders the server message inline so the user can decide
 * whether to retry or pick a different shop (Req 2.5).
 */
export function useSelectShop() {
  const queryClient = useQueryClient()

  return useMutation<SelectShopResult, Error, SelectShopVariables>({
    mutationFn: ({ shopId, shopAssignment }) =>
      selectShop(shopId, shopAssignment),

    onSuccess: (result) => {
      // 1. Replace the access token. The auth store's `login(user, token)`
      //    is the canonical write path; the user does not change so we
      //    re-pass the current value and only the token is updated.
      const { user, login } = useAuthStore.getState()
      if (user) {
        login(user, result.token)
      }

      // 2. Pivot the Shop_Context_Store. The service folds the caller-held
      //    `ShopAssignment` into `result.shop`; when null (deep-link flow),
      //    the calling page is responsible for resolving the summary and
      //    calling `setActiveShop` itself.
      if (result.shop) {
        useShopContextStore
          .getState()
          .setActiveShop(result.shop, result.shopRole, result.permissions)
      }

      // 3. Drop every cache entry tied to the previous shop scope.
      //    `["my-shops"]` is excluded by `isShopScopedKey`, so the
      //    assignments list survives the pivot.
      queryClient.invalidateQueries({
        predicate: (query) => isShopScopedKey(query.queryKey),
      })
    },
  })
}
