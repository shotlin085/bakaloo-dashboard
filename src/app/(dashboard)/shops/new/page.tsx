"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Forbidden } from "@/components/shared/forbidden"

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
      // hook's onError handles toast
    }
  }

  if (!isAuthorized) return <Forbidden />

  return (
    <div className="bg-slate-50/40">
      {/* ── Compact header — breadcrumb bar ──────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Button asChild variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-violet-50 hover:text-violet-600">
            <Link href="/shops" aria-label="Back to shops">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <Link href="/shops" className="text-muted-foreground transition hover:text-violet-600">
              Stores
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="font-semibold text-slate-900">Create New Store</span>
          </nav>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-border/60 text-xs">
          <Link href="/shops">Cancel</Link>
        </Button>
      </div>

      {/* ── Compact violet banner — title + step pills ───────────────── */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div>
                <span className="text-base font-bold text-white">{t("shops.create.title")}</span>
                <span className="ml-2 hidden text-xs text-violet-200 sm:inline">
                  Set up a new store location, contact details, service settings and banking info.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {["Basic Info","Contact","Address & Map","Service Area","Hours","Banking"].map((step, i) => (
                  <span key={step}
                    className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/90">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/30 text-[9px] font-bold leading-none">
                      {i + 1}
                    </span>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form content ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <ShopForm
          mode="create"
          onSubmit={onSubmit}
          isPending={createShop.isPending}
          serverFieldErrors={createShop.serverFieldErrors}
        />
      </div>
    </div>
  )
}
