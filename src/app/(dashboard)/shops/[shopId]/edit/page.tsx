"use client"

/**
 * Shop edit page (`/shops/[shopId]/edit`) — task 5.7.
 *
 * Reuses the shared `<ShopForm />` (see `../../_components/shop-form.tsx`)
 * with `defaultValues` populated from `useShop(id)`. On submit we PUT via
 * `useUpdateShop`; the hook invalidates the list + detail queries on
 * success so the detail page refetches via tag invalidation (Req 5.10).
 * On 409 conflict the form reactively maps the offending field path onto
 * RHF `setError`, preserving every other entered value (Req 5.11).
 *
 * Behaviour:
 *   - Route gating uses `useRouteRBAC("/shops/[id]/edit")` — gated to
 *     super-admins with `shops.write` (see `lib/permissions.ts`); other
 *     users see `<Forbidden />` and no fetches issue (Req 4.3, 4.4).
 *   - While the detail query is loading we render a skeleton card stack
 *     so the operator sees an outline of the form rather than empty
 *     space (Req 14.2).
 *   - On query failure we render `<ErrorBlock />` with the server status
 *     + message and a Retry affordance (Req 15.1).
 *   - On submit, the page awaits `useUpdateShop().mutateAsync` and (on
 *     success) navigates back to the shop detail page so the operator
 *     sees the saved changes immediately. The hook's success toast and
 *     cache invalidation drive the refetch (Req 5.10).
 *
 * Requirements: 5.10, 5.11, 12.5
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { ErrorBlock } from "@/components/shared/error-block"
import { Forbidden } from "@/components/shared/forbidden"
import { PageHeader } from "@/components/shared/PageHeader"

import { useRouteRBAC } from "@/hooks/useRBAC"
import { useShop, useUpdateShop } from "@/hooks/useShops"

import { t } from "@/lib/i18n"
import type { ShopInput } from "@/lib/shop-validations"
import type { Shop } from "@/types"

import { ShopForm } from "../../_components/shop-form"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Project a `Shop` record onto the subset of fields the form accepts.
 *
 * The `Shop` type carries a handful of read-only computed fields
 * (`total_orders`, `total_revenue`, `avg_rating`, `rating_count`,
 * timestamps) plus the lifecycle flags (`is_active`, `is_verified`) that
 * the edit form does not own. We strip those here so the form receives
 * only `ShopInput`-shaped values; toggling active / verified happens via
 * the dedicated mutations on the detail page (Req 5.8, 5.9).
 */
function shopToFormDefaults(shop: Shop): Partial<ShopInput> {
  return {
    name: shop.name,
    branch_code: shop.branch_code,
    slug: shop.slug,
    description: shop.description,
    logo_url: shop.logo_url,
    banner_url: shop.banner_url,
    phone: shop.phone,
    email: shop.email,
    whatsapp: shop.whatsapp,
    address_line1: shop.address_line1,
    address_line2: shop.address_line2,
    city: shop.city,
    state: shop.state,
    pincode: shop.pincode,
    lat: shop.lat,
    lng: shop.lng,
    serviceable_pincodes: shop.serviceable_pincodes,
    delivery_radius_km: shop.delivery_radius_km,
    operating_hours: shop.operating_hours,
    commission_rate: shop.commission_rate,
    gst_number: shop.gst_number,
    pan_number: shop.pan_number,
    bank_account_number: shop.bank_account_number,
    bank_ifsc: shop.bank_ifsc,
    bank_name: shop.bank_name,
    bank_holder_name: shop.bank_holder_name,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page component — receives the dynamic `shopId` segment from the App
 * Router via `params.shopId`.
 */
interface EditShopPageProps {
  params: { shopId: string }
}

export default function EditShopPage({ params }: EditShopPageProps) {
  const shopId = params.shopId
  const router = useRouter()

  const { isAuthorized } = useRouteRBAC(`/shops/${shopId}/edit`)
  const shopQuery = useShop(shopId)
  const updateShop = useUpdateShop()

  // ─── RBAC gate — short-circuit before issuing the detail fetch ─────────
  // Note: `useShop` already short-circuits on a falsy id, but in the
  // unauthorized branch we want to avoid even the authorized fetch path
  // so we render `<Forbidden />` first.
  if (!isAuthorized) {
    return <Forbidden />
  }

  // ─── Submit ────────────────────────────────────────────────────────────
  async function onSubmit(body: ShopInput) {
    try {
      await updateShop.mutateAsync({ id: shopId, body })
      // Cache invalidation in the hook drives the detail page's refetch.
      // We additionally navigate back so the operator sees the saved
      // changes in context immediately.
      router.push(`/shops/${shopId}`)
    } catch {
      // The hook's onError suppresses the toast for 409s (the form
      // surfaces the conflict on the offending input) and emits a
      // destructive toast for everything else.
    }
  }

  // ─── Header (rendered above every state) ───────────────────────────────
  const header = (
    <div className="flex items-center gap-3">
      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
        <Link
          href={`/shops/${shopId}`}
          aria-label="Back to shop detail"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <PageHeader
        title={t("shops.edit.title")}
        subtitle={shopQuery.data?.name ?? t("shops.list.subtitle")}
      />
    </div>
  )

  // ─── Loading state ─────────────────────────────────────────────────────
  // Skeleton outline of the six form sections so the page doesn't flash
  // empty between the route mount and the detail query resolving.
  if (shopQuery.isPending) {
    return (
      <div className="space-y-6">
        {header}
        <ShopFormSkeleton />
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (shopQuery.isError || !shopQuery.data) {
    const status = (shopQuery.error as { response?: { status?: number } })
      ?.response?.status
    const message =
      (shopQuery.error as { message?: string })?.message ??
      t("errors.genericError")
    return (
      <div className="space-y-6">
        {header}
        <ErrorBlock
          status={status}
          message={message}
          onRetry={() => shopQuery.refetch()}
        />
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {header}

      <ShopForm
        mode="edit"
        defaultValues={shopToFormDefaults(shopQuery.data)}
        onSubmit={onSubmit}
        isPending={updateShop.isPending}
        serverFieldErrors={updateShop.serverFieldErrors}
        cancelHref={`/shops/${shopId}`}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skeleton stand-in for the six `<Card />` sections of `<ShopForm />`.
 * Approximates the column counts and field heights so the layout doesn't
 * shift when the real form mounts.
 */
function ShopFormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Identity (2 cols, 5 rows) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-9 w-full md:col-span-2" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full md:col-span-2" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      {/* Contact (3 cols) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      {/* Address (2 cols, 5 rows) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-9 w-full md:col-span-2" />
          <Skeleton className="h-9 w-full md:col-span-2" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      {/* Service area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-12 w-full md:col-span-2" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      {/* Operating hours (7 weekday rows) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>

      {/* Commercial + bank (2 cols, 7 fields) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Submit row */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  )
}
