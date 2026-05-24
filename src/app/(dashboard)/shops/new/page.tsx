"use client"

/**
 * Shop create page (`/shops/new`) — task 5.4.
 *
 * Thin wrapper around the shared `<ShopForm />` (see
 * `../_components/shop-form.tsx`). The form is owned by that component;
 * this page handles route gating, the page header, the create mutation,
 * and the post-success redirect.
 *
 * Behaviour:
 *   - Route gating uses `useRouteRBAC("/shops/new")` — non-super-admins
 *     or users without `shops.write` see `<Forbidden />` and the create
 *     mutation never fires (Req 4.3).
 *   - Submission calls `useCreateShop`. On 409 the `<ShopForm />` reads
 *     the hook's `serverFieldErrors` reactively and routes the offending
 *     field path onto RHF `setError` so the highlighted input preserves
 *     every other entered value (Req 5.11). On success a localized
 *     toast fires (handled by the hook) and the page redirects to
 *     `/shops/[id]`.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.11, 12.5
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

import { Forbidden } from "@/components/shared/forbidden"
import { PageHeader } from "@/components/shared/PageHeader"

import { useRouteRBAC } from "@/hooks/useRBAC"
import { useCreateShop } from "@/hooks/useShops"

import { t } from "@/lib/i18n"
import type { ShopInput } from "@/lib/shop-validations"

import { ShopForm } from "../_components/shop-form"

export default function NewShopPage() {
  const router = useRouter()
  const { isAuthorized } = useRouteRBAC("/shops/new")
  const createShop = useCreateShop()

  async function onSubmit(body: ShopInput) {
    try {
      const created = await createShop.mutateAsync(body)
      router.push(`/shops/${created.id}`)
    } catch {
      // The hook's onError already either suppresses the toast (for 409s)
      // or shows a destructive one. The shared `<ShopForm />` reads
      // `serverFieldErrors` reactively from the hook and surfaces the
      // conflict on the offending input via setError (Req 5.11).
    }
  }

  // RBAC gate — short-circuit before mounting the form / its effects.
  if (!isAuthorized) {
    return <Forbidden />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/shops" aria-label="Back to shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={t("shops.create.title")}
          subtitle={t("shops.list.subtitle")}
        />
      </div>

      <ShopForm
        mode="create"
        onSubmit={onSubmit}
        isPending={createShop.isPending}
        serverFieldErrors={createShop.serverFieldErrors}
      />
    </div>
  )
}
