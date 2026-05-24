"use client"

/**
 * Shop_Selector page (Req 2.1–2.7).
 *
 * Vendor users with two or more shop assignments land here after `/login`
 * (see `app/(auth)/login/page.tsx` and the auth flow sequence diagram in
 * design.md). The page lists the user's shop assignments as cards and pivots
 * the dashboard into the chosen shop's scope via `useSelectShop`.
 *
 * Layering note: this page composes UI and delegates to hooks. All TanStack
 * Query orchestration lives in `useMyShops` / `useSelectShop`; axios calls
 * live in `services/auth.service.ts`. The page never calls axios directly.
 *
 * Subcomponents (`<ShopCard />`, `<ShopSearch />`) live under
 * `_components/` (task 2.5) and own their own presentation + debounce logic;
 * this page is responsible for wiring them to the data layer.
 *
 * Design reference: design.md "Auth Flow Sequence Diagram" + folder layout.
 */

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { AxiosError } from "axios"
import { LogOut, Store } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBlock } from "@/components/shared/error-block"
import { useMyShops, useSelectShop } from "@/hooks/useMyShops"
import { t } from "@/lib/i18n"
import { useAuthStore } from "@/store/auth.store"
import type { ShopAssignment } from "@/types"

import { ShopCard } from "./_components/shop-card"
import { ShopSearch } from "./_components/shop-search"

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SelectShopPage() {
  const router = useRouter()
  const myShopsQuery = useMyShops()
  const selectShopMutation = useSelectShop()
  const authLogout = useAuthStore((s) => s.logout)

  // Search state — `<ShopSearch />` owns its own immediate-input state and
  // emits debounced values to us (300ms, per its contract). We keep only
  // the settled query for filtering. The input itself is rendered
  // conditionally below per Req 2.6.
  const [searchQuery, setSearchQuery] = useState("")

  // Track which shop is currently being selected so we can show a per-card
  // spinner on the chosen card without disabling the entire list.
  const [pendingShopId, setPendingShopId] = useState<string | null>(null)

  const shops = myShopsQuery.data ?? []
  const showSearch = shops.length > 1

  // Case-insensitive substring match on name or branch code (Req 2.6).
  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return shops
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(q) ||
        shop.branchCode.toLowerCase().includes(q),
    )
  }, [shops, searchQuery])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectShop(shop: ShopAssignment) {
    if (selectShopMutation.isPending) return
    setPendingShopId(shop.id)

    selectShopMutation.mutate(
      { shopId: shop.id, shopAssignment: shop },
      {
        onSuccess: () => {
          // The hook has refreshed the token, set the shop context, and
          // invalidated every shop-scoped query. The root `/` redirects to
          // `/dashboard` (Req 2.4).
          router.replace("/")
        },
        onError: (error) => {
          // Surface the server-provided message inline (Req 2.5). The store
          // is left untouched by the hook on error.
          const message = readErrorMessage(error) || t("errors.genericError")
          toast.error(message)
          setPendingShopId(null)
        },
      },
    )
  }

  function handleRetry() {
    void myShopsQuery.refetch()
  }

  function handleLogout() {
    // Reuse the auth-store flow (Req 2.7 / 1.9). `logout()` posts to the
    // backend, clears storage + cookies, and redirects to `/login`.
    authLogout()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <header className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl stat-card-primary flex items-center justify-center">
          <Store className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select a shop</h1>
        <p className="text-sm text-muted-foreground">
          Choose which shop you want to manage in this session.
        </p>
      </header>

      {showSearch ? (
        <ShopSearch value={searchQuery} onChange={setSearchQuery} />
      ) : null}

      <div className="space-y-3">
        {myShopsQuery.isLoading ? (
          // Render at least three skeleton cards while loading (Req 2.2).
          <>
            <ShopCardSkeleton />
            <ShopCardSkeleton />
            <ShopCardSkeleton />
          </>
        ) : myShopsQuery.isError ? (
          <ErrorBlock
            status={readErrorStatus(myShopsQuery.error)}
            message={readErrorMessage(myShopsQuery.error)}
            onRetry={handleRetry}
          />
        ) : filteredShops.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {shops.length === 0
                  ? "You have no shop assignments yet. Contact your administrator."
                  : "No shops match your search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredShops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              isSelecting={pendingShopId === shop.id}
              onSelect={handleSelectShop}
            />
          ))
        )}
      </div>

      <div className="flex justify-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          type="button"
          className="text-muted-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — kept inline because it is not consumed elsewhere
// ─────────────────────────────────────────────────────────────────────────────

function ShopCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-full mt-3" />
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Pull a server-provided message off an axios/Error object, with fallback. */
function readErrorMessage(error: unknown): string {
  if (!error) return ""
  const axiosError = error as AxiosError<{ message?: string }>
  const serverMessage = axiosError.response?.data?.message
  if (typeof serverMessage === "string" && serverMessage.length > 0) {
    return serverMessage
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }
  return ""
}

/** Pull the HTTP status off an axios error, when present. */
function readErrorStatus(error: unknown): number | undefined {
  const axiosError = error as AxiosError | undefined
  return axiosError?.response?.status
}
