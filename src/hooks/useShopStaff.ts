"use client"

/**
 * Shop_Staff_UI query and mutation hooks.
 *
 * Read-side: paginated list of staff members for a single shop. Write-side
 * (task 6.2): invite, update, and remove — every mutation invalidates the
 * staff list on success and surfaces a localized toast.
 *
 * Error handling — the dialog (task 6.4) interprets two distinct backend
 * error families:
 *
 *   1. **Already-assigned (409)** — the picked user is already on this
 *      shop. Pages call {@link extractStaffFieldErrors} to receive a
 *      `{ userId: <message> }` map and route it through RHF `setError`,
 *      keeping every other entered value intact (Req 6.6).
 *   2. **Cap reached (422)** — the shop has hit `STAFF_LIMIT_REACHED`
 *      (50-staff cap) or the user has hit `STAFF_SHOP_LIMIT` (10-shop
 *      cap). The hook surfaces a destructive toast and leaves local
 *      state untouched so the dialog stays open with the entered values
 *      (Req 6.10).
 *
 * Backend code aliasing — the shop-staff backend returns the codes
 * `STAFF_ALREADY_ASSIGNED`, `STAFF_LIMIT_REACHED`, and `STAFF_SHOP_LIMIT`
 * (see `bakaloo-backend/src/modules/shop-staff/shop-staff.service.js`).
 * The dashboard i18n bundle keys these as `SHOP_STAFF_ALREADY_ASSIGNED`,
 * `SHOP_STAFF_CAP_REACHED`, and `USER_SHOP_CAP_REACHED` to align with the
 * spec wording. Both code names are accepted here so the hook stays
 * correct whether the backend or the dashboard is the source of truth.
 *
 * Design references:
 *   - design.md §5  "Central Query-Key Factory"
 *   - design.md §7  "Shop_Staff_UI Dialog"
 *   - design.md §15 "Performance Budget" — list hook uses
 *     `placeholderData: (prev) => prev` to avoid layout shift.
 *
 * Requirements:
 *   - 6.1  Staff list paginated 20/page, capped at 100 by service
 *   - 6.5  Invite assigns user as staff
 *   - 6.6  409 STAFF_ALREADY_ASSIGNED → field error on user picker
 *   - 6.8  Update PUT /shops/[shopId]/staff/[staffId]
 *   - 6.9  Remove DELETE /shops/[shopId]/staff/[staffId]
 *   - 6.10 422 cap-reached → destructive toast, local state unchanged
 *   - 14.2 List hooks use `keepPreviousData` equivalent
 *   - 15.2 Success toasts on every mutation
 *   - 15.3 Server error code → localized message via `translateServerError`
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"

import { qk } from "@/lib/query-keys"
import { t, translateServerError } from "@/lib/i18n"
import {
  shopStaffService,
  type ShopStaffInviteBody,
  type ShopStaffListParams,
  type ShopStaffUpdateBody,
} from "@/services/shop-staff.service"

// ─────────────────────────────────────────────────────────────────────────────
// Backend / dashboard code aliases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Codes returned when the picked user is already assigned to this shop.
 * The backend currently returns `STAFF_ALREADY_ASSIGNED`; the
 * dashboard i18n bundle and design wording use
 * `SHOP_STAFF_ALREADY_ASSIGNED`. Both are accepted so the dialog stays
 * correct under either name.
 */
const ALREADY_ASSIGNED_CODES: ReadonlySet<string> = new Set([
  "STAFF_ALREADY_ASSIGNED",
  "SHOP_STAFF_ALREADY_ASSIGNED",
])

/** Codes returned when the shop has hit the 50-staff cap (Req 6.10). */
const SHOP_STAFF_CAP_CODES: ReadonlySet<string> = new Set([
  "STAFF_LIMIT_REACHED",
  "SHOP_STAFF_CAP_REACHED",
])

/** Codes returned when the user has hit the 10-shop cap (Req 6.10). */
const USER_SHOP_CAP_CODES: ReadonlySet<string> = new Set([
  "STAFF_SHOP_LIMIT",
  "USER_SHOP_CAP_REACHED",
])

// ─────────────────────────────────────────────────────────────────────────────
// Error parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Pull the backend `code` field off an axios error, when present. */
function readErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const code = (error.response?.data as { code?: unknown } | undefined)?.code
  return typeof code === "string" ? code : undefined
}

/** Pull the server `message` field off an axios error, when present. */
function readErrorMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const message = (error.response?.data as { message?: unknown } | undefined)
    ?.message
  return typeof message === "string" && message.length > 0 ? message : undefined
}

/**
 * Field error map suitable for `react-hook-form`'s `setError(field, ...)`
 * call. Keys are RHF field paths (matching `shopStaffInviteSchema` —
 * `userId`, `role`, etc.) and values are user-facing messages.
 */
export type StaffFieldErrors = Record<string, string>

/**
 * Translate a shop-staff mutation error into RHF field errors.
 *
 * Returns:
 *   - `{ userId: <message> }` when the backend reports the user is
 *     already assigned (`STAFF_ALREADY_ASSIGNED` /
 *     `SHOP_STAFF_ALREADY_ASSIGNED`). The dialog applies this via
 *     `setError("userId", { type: "server", message })` so the user
 *     picker is the highlighted field — Req 6.6.
 *   - `{}` for cap-reached errors (`STAFF_LIMIT_REACHED` /
 *     `SHOP_STAFF_CAP_REACHED`, `STAFF_SHOP_LIMIT` /
 *     `USER_SHOP_CAP_REACHED`). These errors have no field path; the
 *     hook surfaces them as a destructive toast instead — Req 6.10.
 *   - `{}` for any other error (network, 5xx, validation). The
 *     interceptor in `lib/api.ts` already toasts 401 / 403 / 429 / 5xx
 *     centrally, and the mutation itself toasts a generic message via
 *     `onError`.
 */
export function extractStaffFieldErrors(error: unknown): StaffFieldErrors {
  const code = readErrorCode(error)
  if (!code) return {}

  if (ALREADY_ASSIGNED_CODES.has(code)) {
    const fallback =
      readErrorMessage(error) ?? t("shopStaff.invite.error.alreadyAssigned")
    return {
      userId: translateServerError("SHOP_STAFF_ALREADY_ASSIGNED", fallback),
    }
  }

  // Cap-reached errors carry no field path; the hook handles them via toast.
  return {}
}

/**
 * Predicate identifying cap-reached errors. Used by the invite hook to
 * decide whether to surface a destructive toast (Req 6.10).
 */
function isCapReachedError(error: unknown): boolean {
  const code = readErrorCode(error)
  if (!code) return false
  return SHOP_STAFF_CAP_CODES.has(code) || USER_SHOP_CAP_CODES.has(code)
}

/**
 * Choose the localized cap-reached toast message based on the backend
 * code. Falls back to the server-provided message when the code is
 * unknown.
 */
function capReachedToastMessage(error: unknown): string {
  const code = readErrorCode(error)
  const fallback = readErrorMessage(error) ?? t("errors.genericError")

  if (code && SHOP_STAFF_CAP_CODES.has(code)) {
    return translateServerError(
      "SHOP_STAFF_CAP_REACHED",
      t("shopStaff.toast.staffCapReached"),
    )
  }
  if (code && USER_SHOP_CAP_CODES.has(code)) {
    return translateServerError(
      "USER_SHOP_CAP_REACHED",
      t("shopStaff.toast.userShopCapReached"),
    )
  }
  return fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache invalidation helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalidate every paginated/filtered shop-staff query for a given shop.
 *
 * `qk.shopStaff(shopId, params)` returns `["shop-staff", shopId, params]`,
 * so a prefix-match invalidation against `["shop-staff", shopId]` covers
 * every list variant the page may have mounted (different filters, pages,
 * search terms). TanStack Query's default `invalidateQueries` matcher is
 * a prefix match, so the caller does not need a custom predicate.
 */
function invalidateShopStaffQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  shopId: string,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ["shop-staff", shopId] })
}

// ─────────────────────────────────────────────────────────────────────────────
// useShopStaffList — paginated list query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List staff for a shop with filters + pagination — feeds
 * `/shops/[shopId]/staff` (Req 6.1, 14.2).
 *
 * `enabled: !!shopId` defends against the App Router's transient
 * `undefined` route params during navigation; without it TanStack Query
 * would issue `GET /shops/undefined/staff`. The service caps `limit` at
 * 100 before issuing the request so any user-supplied value is bounded
 * (Req 14.4 / Property 12).
 *
 * `placeholderData: (prev) => prev` is the TanStack Query v5 equivalent
 * of `keepPreviousData` — paginated views keep showing the previous page
 * during the in-flight fetch instead of flashing empty.
 */
export function useShopStaffList(
  shopId: string,
  params: ShopStaffListParams = {},
) {
  return useQuery({
    queryKey: qk.shopStaff(shopId, params),
    queryFn: () => shopStaffService.list(shopId, params),
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useInviteShopStaff — POST /shops/[shopId]/staff
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invite (assign) a user to a shop as staff (Req 6.5).
 *
 * On success: invalidates the staff list and shows the
 * `shopStaff.toast.invited` success toast (Req 15.2).
 *
 * On error:
 *   - **Cap reached** (`STAFF_LIMIT_REACHED` / `STAFF_SHOP_LIMIT`) —
 *     surfaces a destructive toast carrying the translated server
 *     message; the dialog stays open with entered values intact
 *     (Req 6.10).
 *   - **Already assigned** (`STAFF_ALREADY_ASSIGNED`) — does NOT toast.
 *     The dialog calls {@link extractStaffFieldErrors} from its own
 *     `onError` to highlight the user picker via `setError`, and a toast
 *     would be redundant noise on top of the inline field message
 *     (Req 6.6).
 *   - **Other errors** — surfaces a generic destructive toast. The
 *     interceptor in `lib/api.ts` already handles 401 / 403 / 429 / 5xx
 *     centrally; this branch covers the long tail (network failures,
 *     unexpected 4xx).
 */
export function useInviteShopStaff(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ShopStaffInviteBody) =>
      shopStaffService.invite(shopId, body),

    onSuccess: () => {
      void invalidateShopStaffQueries(queryClient, shopId)
      toast.success(t("shopStaff.toast.invited"))
    },

    onError: (error) => {
      if (isCapReachedError(error)) {
        toast.error(capReachedToastMessage(error))
        return
      }

      const code = readErrorCode(error)
      if (code && ALREADY_ASSIGNED_CODES.has(code)) {
        // Field-level error — handled by the dialog via
        // `extractStaffFieldErrors`. No toast (would duplicate the
        // inline picker error message).
        return
      }

      // Long-tail errors — show a generic destructive toast unless the
      // axios interceptor (lib/api.ts) already handled it (5xx / 401 /
      // 403 / 429 always reject after toasting, so this branch only fires
      // for unexpected 4xx and offline failures).
      const message = readErrorMessage(error) ?? t("errors.genericError")
      toast.error(message)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useUpdateShopStaff — PUT /shops/[shopId]/staff/[staffId]
// ─────────────────────────────────────────────────────────────────────────────

/** Variables passed to the {@link useUpdateShopStaff} mutation. */
export interface UpdateShopStaffVariables {
  staffId: string
  body: ShopStaffUpdateBody
}

/**
 * Update a staff record's role / permissions / is_active flag (Req 6.8).
 *
 * On success: invalidates the staff list and shows the
 * `shopStaff.toast.updated` success toast.
 *
 * Update calls do not trigger the cap-reached families (those only fire
 * on initial assignment) and the backend already enforces uniqueness, so
 * this hook's error path is the same generic-toast tail as the other
 * mutations. The shared `extractStaffFieldErrors` helper still works for
 * the rare case where the dialog re-opens against an updated record and
 * the server reports a stale conflict.
 */
export function useUpdateShopStaff(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ staffId, body }: UpdateShopStaffVariables) =>
      shopStaffService.update(shopId, staffId, body),

    onSuccess: () => {
      void invalidateShopStaffQueries(queryClient, shopId)
      toast.success(t("shopStaff.toast.updated"))
    },

    onError: (error) => {
      const message = readErrorMessage(error) ?? t("errors.genericError")
      toast.error(message)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useRemoveShopStaff — DELETE /shops/[shopId]/staff/[staffId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete (deactivate) a staff member (Req 6.9).
 *
 * On success: invalidates the staff list and shows the
 * `shopStaff.toast.removed` success toast.
 *
 * On error: surfaces a generic destructive toast carrying the
 * server-provided message when present (typically `STAFF_NOT_FOUND` for
 * a stale row).
 */
export function useRemoveShopStaff(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staffId: string) => shopStaffService.remove(shopId, staffId),

    onSuccess: () => {
      void invalidateShopStaffQueries(queryClient, shopId)
      toast.success(t("shopStaff.toast.removed"))
    },

    onError: (error) => {
      const message = readErrorMessage(error) ?? t("errors.genericError")
      toast.error(message)
    },
  })
}
