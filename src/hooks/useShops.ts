"use client"

/**
 * Shops query and mutation hooks.
 *
 * Read-side: list, detail, and the Super_Admin Shop_Switcher popover.
 * Write-side (task 5.2): create, update, deactivate, reactivate, and toggle
 * verification — every mutation invalidates the list + detail queries on
 * success, surfaces a localized success toast, and (for create / update)
 * exposes `serverFieldErrors` so pages can route 409 conflicts to RHF
 * `setError` without re-parsing the axios error themselves.
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §6  "Shops Management UI" (409 → setError mapping)
 *   - design.md §15 "Performance Budget" — every list hook uses
 *     `placeholderData: (prev) => prev` (TanStack Query v5 keepPreviousData
 *     equivalent) so paginated views don't flash empty between pages.
 *
 * Requirements:
 *   - 3.3  Super_Admin Shop_Switcher reads from `GET /shops?is_active=true`
 *   - 5.1  Shops list page server-side pagination (capped at 100 by service)
 *   - 5.6  Create on success → invalidate list + redirect (page concern)
 *   - 5.10 Edit on success → invalidate detail + refetch
 *   - 5.11 409 on duplicate branch_code / slug → field-level error
 *   - 14.2 List hooks use TanStack `keepPreviousData` to avoid layout shift
 *   - 15.2 Success toasts on every mutation
 *   - 15.3 Server error code → localized message via `translateServerError`
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"

import { qk } from "@/lib/query-keys"
import { t, translateServerError } from "@/lib/i18n"
import type { ShopInput } from "@/lib/shop-validations"
import { shopsService, type ShopsListParams } from "@/services/shops.service"
import type { Shop } from "@/types"

/**
 * `staleTime` shared by `useShopsList`, `useShop`, and the Shop_Switcher
 * popover (`useActiveShopsForSwitcher`). The 60 s budget matches design
 * §15 — "Performance Budget" (shops list → 60 s) and is long enough that
 * opening/closing the popover repeatedly doesn't refire the request,
 * short enough that newly activated shops show up without a full page
 * reload.
 */
const SHOPS_STALE_TIME_MS = 60_000

/**
 * Legacy alias retained for backwards compatibility — same value, used
 * by the Shop_Switcher popover hook below.
 */
const ACTIVE_SHOPS_STALE_TIME_MS = SHOPS_STALE_TIME_MS

/**
 * List shops with filters + pagination — feeds `/shops` (Req 5.1, 14.2).
 *
 * The service caps `limit` at 100 before issuing the request so any
 * user-supplied value is bounded (Req 14.4 / Property 12).
 */
export function useShopsList(params: ShopsListParams) {
  return useQuery({
    queryKey: qk.shops(params),
    queryFn: () => shopsService.list(params),
    placeholderData: (prev) => prev,
    staleTime: SHOPS_STALE_TIME_MS,
  })
}

/**
 * Single shop by id — feeds the `/shops/[shopId]` detail tabs (Req 5.7).
 *
 * `enabled: !!id` defends against the App Router's transient `undefined`
 * params during route transitions; without it TanStack Query would issue a
 * `GET /shops/undefined` and surface a 404 to the user.
 */
export function useShop(id: string) {
  return useQuery({
    queryKey: qk.shop(id),
    queryFn: () => shopsService.get(id),
    enabled: !!id,
    staleTime: SHOPS_STALE_TIME_MS,
  })
}

/**
 * Active shops for the Super_Admin Shop_Switcher popover (Req 3.3).
 *
 * Pinned to a fixed query key (`{ is_active: true, limit: 100 }`) so every
 * mount of the topbar component shares the same cache entry — the popover
 * is render-cheap and we don't want a fresh request per open. `staleTime`
 * keeps the entry fresh for 60 s; `placeholderData: (prev) => prev` keeps
 * the popover list visible while a background refetch is in flight.
 */
export function useActiveShopsForSwitcher() {
  const params: ShopsListParams = { is_active: true, limit: 100 }
  return useQuery({
    queryKey: qk.shops(params),
    queryFn: shopsService.listActive,
    staleTime: ACTIVE_SHOPS_STALE_TIME_MS,
    placeholderData: (prev) => prev,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation hooks — task 5.2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Field paths surfaced by `extractFieldErrors`. Mirrors the only two 409
 * conflict codes the backend currently emits for shops
 * (`DUPLICATE_BRANCH_CODE`, `DUPLICATE_SLUG`); see design.md §6 "Shops
 * Management UI" and `serverErrors.DUPLICATE_*` entries in `lib/i18n.ts`.
 *
 * The shape is intentionally narrow so RHF `setError` calls in the page
 * stay strongly typed (`setError("branch_code", { type: "server", … })`).
 */
export interface ShopServerFieldErrors {
  branch_code?: string
  slug?: string
}

/**
 * Map a 409 error response to the offending RHF field path so the create /
 * edit pages can call `setError` without re-parsing axios errors.
 *
 * Returns an empty object for any non-409 / non-conflict failure — the
 * caller then falls back to the generic destructive toast emitted by the
 * mutation's `onError` handler. The function is total (never throws) so it
 * is safe to invoke unconditionally on every mutation error.
 *
 * Recognised codes (Req 5.11):
 *   - `DUPLICATE_BRANCH_CODE` → `{ branch_code: <localized message> }`
 *   - `DUPLICATE_SLUG`        → `{ slug:        <localized message> }`
 */
export function extractFieldErrors(error: unknown): ShopServerFieldErrors {
  if (!axios.isAxiosError(error)) return {}
  if (error.response?.status !== 409) return {}

  const data = error.response?.data as
    | { code?: string; message?: string }
    | undefined
  const code = data?.code
  const fallback = data?.message ?? ""

  if (code === "DUPLICATE_BRANCH_CODE") {
    return { branch_code: translateServerError(code, fallback) }
  }
  if (code === "DUPLICATE_SLUG") {
    return { slug: translateServerError(code, fallback) }
  }
  return {}
}

/**
 * Pull the localized error message off an axios error, falling back to a
 * sensible default. Used by every mutation's `onError` handler so users see
 * a translated message even when the backend has not provided one.
 */
function readErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { code?: string; message?: string }
      | undefined
    return translateServerError(data?.code, data?.message ?? t("errors.genericError"))
  }
  return t("errors.genericError")
}

/**
 * Invalidate every cache entry under the `shops` tag (list + detail + per-
 * shop activity). Centralized so each mutation hook has a single
 * post-success side-effect to call. The `qk.shops(...)` builder pins the
 * first segment to `"shops"`, so a tag-level invalidation is sufficient
 * regardless of the specific filter or pagination params used in calls.
 */
function invalidateShopsCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  shopId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ["shops"] })
  if (shopId) {
    queryClient.invalidateQueries({ queryKey: qk.shop(shopId) })
  }
}

/** Result type for `useCreateShop` — the standard `UseMutationResult` plus
 *  the `serverFieldErrors` derived from the latest error. */
export type UseCreateShopResult = UseMutationResult<Shop, Error, ShopInput> & {
  serverFieldErrors: ShopServerFieldErrors
}

/**
 * Create a new shop (Req 5.6, 15.2, 15.3).
 *
 * On success: invalidates the shops list / detail tag and shows a localized
 * success toast. Page concern (not this hook): redirect to `/shops/[id]`.
 *
 * On error: the page can either consume `serverFieldErrors` to map a 409
 * conflict onto RHF (`setError("branch_code", …)`) or fall back to the
 * destructive toast emitted here for non-conflict failures.
 */
export function useCreateShop(): UseCreateShopResult {
  const queryClient = useQueryClient()

  const mutation = useMutation<Shop, Error, ShopInput>({
    mutationFn: (body) => shopsService.create(body),
    onSuccess: () => {
      invalidateShopsCaches(queryClient)
      toast.success(t("shops.create.toast.success"))
    },
    onError: (error) => {
      // Suppress the generic toast for 409s — the page handles those via
      // serverFieldErrors → setError so the user sees the conflict on the
      // offending field rather than a duplicated toast.
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) return
      toast.error(readErrorMessage(error))
    },
  })

  return {
    ...mutation,
    serverFieldErrors: extractFieldErrors(mutation.error),
  }
}

/** Variables accepted by `useUpdateShop` — id of the shop being patched
 *  plus the partial payload (matches `shopsService.update`). */
export interface UpdateShopVariables {
  id: string
  body: Partial<ShopInput> & { is_active?: boolean; is_verified?: boolean }
}

/** Result type for `useUpdateShop` — the standard `UseMutationResult` plus
 *  the `serverFieldErrors` derived from the latest error. */
export type UseUpdateShopResult = UseMutationResult<
  Shop,
  Error,
  UpdateShopVariables
> & {
  serverFieldErrors: ShopServerFieldErrors
}

/**
 * Update an existing shop (Req 5.10, 5.11, 15.2, 15.3).
 *
 * On success: invalidates the shops list tag and the specific detail entry
 * (`qk.shop(id)`) so the detail page refetches; shows a localized success
 * toast.
 *
 * On 409 conflict: surfaces `serverFieldErrors` (`branch_code` / `slug`)
 * for the page to route into RHF `setError`. Other failures fall back to a
 * destructive toast.
 */
export function useUpdateShop(): UseUpdateShopResult {
  const queryClient = useQueryClient()

  const mutation = useMutation<Shop, Error, UpdateShopVariables>({
    mutationFn: ({ id, body }) => shopsService.update(id, body),
    onSuccess: (_data, variables) => {
      invalidateShopsCaches(queryClient, variables.id)
      toast.success(t("shops.edit.toast.success"))
    },
    onError: (error) => {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) return
      toast.error(readErrorMessage(error))
    },
  })

  return {
    ...mutation,
    serverFieldErrors: extractFieldErrors(mutation.error),
  }
}

/**
 * Soft-delete a shop (Req 5.9, 15.2, 15.3).
 *
 * On success: invalidates the list and detail caches, shows the
 * "Shop deactivated" toast. Confirmation dialog and redirect are the
 * caller's responsibility.
 */
export function useDeactivateShop(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => shopsService.softDelete(id),
    onSuccess: (_data, id) => {
      invalidateShopsCaches(queryClient, id)
      toast.success(t("shops.edit.toast.deactivated"))
    },
    onError: (error) => toast.error(readErrorMessage(error)),
  })
}

/**
 * Reactivate a previously deactivated shop (Req 5.8, 15.2).
 *
 * Delegates to `shopsService.reactivate` (which PATCHes `is_active=true`)
 * and invalidates the list + detail caches on success.
 */
export function useReactivateShop(): UseMutationResult<Shop, Error, string> {
  const queryClient = useQueryClient()

  return useMutation<Shop, Error, string>({
    mutationFn: (id) => shopsService.reactivate(id),
    onSuccess: (_data, id) => {
      invalidateShopsCaches(queryClient, id)
      toast.success(t("shops.edit.toast.reactivated"))
    },
    onError: (error) => toast.error(readErrorMessage(error)),
  })
}

/** Variables accepted by `useToggleVerification` — id of the shop and the
 *  desired `is_verified` value. The boolean is forwarded verbatim, mirroring
 *  the service layer (the caller decides verify vs unverify). */
export interface ToggleVerificationVariables {
  id: string
  value: boolean
}

/**
 * Toggle the verified flag on a shop (Req 5.8, 15.2).
 *
 * Always shows the same success toast (`shops.edit.toast.verificationToggled`)
 * regardless of direction — the i18n bundle calls out "Verification updated"
 * which reads cleanly for both verify and unverify flows.
 */
export function useToggleVerification(): UseMutationResult<
  Shop,
  Error,
  ToggleVerificationVariables
> {
  const queryClient = useQueryClient()

  return useMutation<Shop, Error, ToggleVerificationVariables>({
    mutationFn: ({ id, value }) => shopsService.setVerified(id, value),
    onSuccess: (_data, variables) => {
      invalidateShopsCaches(queryClient, variables.id)
      toast.success(t("shops.edit.toast.verificationToggled"))
    },
    onError: (error) => toast.error(readErrorMessage(error)),
  })
}
