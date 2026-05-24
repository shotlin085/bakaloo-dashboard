"use client"

/**
 * Shop detail page (`/shops/[shopId]`) — task 5.5.
 *
 * Layout:
 *   - Page header — name, branch code, status badges (active, verified),
 *     and an action bar (Edit shop / Toggle Active / Toggle Verified).
 *     Edit and toggle actions are gated to super-admin role (Req 5.8).
 *   - KPI strip — total_orders, total_revenue, avg_rating, rating_count.
 *   - Tabs — Overview, Service Area, Operating Hours, Commercials, Bank
 *     Details, Staff, Activity.
 *
 * Data: `useShop(shopId)` (Req 5.7) — short-circuits with skeleton while
 * loading, ErrorBlock on error.
 *
 * Mutations:
 *   - Toggle Active → `useDeactivateShop` / `useReactivateShop`. The
 *     deactivate path is gated behind a confirmation `AlertDialog`
 *     (Req 5.9). Both already invalidate the list + detail caches and
 *     show a localized success toast inside the hook.
 *   - Toggle Verified → `useToggleVerification`. No confirmation —
 *     verification is recoverable in either direction.
 *
 * RBAC: `useRouteRBAC("/shops/${shopId}")` covers `shops.read` (gates the
 * whole page); `useIsSuperAdmin()` gates the action bar.
 *
 * Requirements: 5.7, 5.8, 5.9
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  IndianRupee,
  Pencil,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Star,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { ErrorBlock } from "@/components/shared/error-block"
import { Forbidden } from "@/components/shared/forbidden"
import { PageHeader } from "@/components/shared/PageHeader"

import { useRouteRBAC } from "@/hooks/useRBAC"
import { useIsSuperAdmin } from "@/hooks/useShopContext"
import {
  useDeactivateShop,
  useReactivateShop,
  useShop,
  useToggleVerification,
} from "@/hooks/useShops"
import { formatCurrency, t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { Shop } from "@/types"

import { OverviewTab } from "./_tabs/overview-tab"
import { ServiceAreaTab } from "./_tabs/service-area-tab"
import { OperatingHoursTab } from "./_tabs/operating-hours-tab"
import { CommercialsTab } from "./_tabs/commercials-tab"
import { BankTab } from "./_tabs/bank-tab"
import { StaffTab } from "./_tabs/staff-tab"
import { ActivityTab } from "./_tabs/activity-tab"

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopDetailPage({
  params,
}: {
  params: { shopId: string }
}) {
  const shopId = params.shopId
  const { isAuthorized } = useRouteRBAC(`/shops/${shopId}`)
  const isSuperAdmin = useIsSuperAdmin()

  const { data: shop, isLoading, isError, error, refetch } = useShop(shopId)

  if (!isAuthorized) return <Forbidden />

  if (isError) {
    return (
      <div className="space-y-6">
        <BackToList />
        <ErrorBlock
          status={
            (error as { response?: { status?: number } } | null)?.response
              ?.status
          }
          message={(error as { message?: string } | null)?.message ?? ""}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  if (isLoading || !shop) {
    return (
      <div className="space-y-6">
        <BackToList />
        <ShopHeaderSkeleton />
        <KpiStripSkeleton />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ShopDetailView shop={shop} canManage={isSuperAdmin} />
}

// ─────────────────────────────────────────────────────────────────────────────
// View
// ─────────────────────────────────────────────────────────────────────────────

interface ShopDetailViewProps {
  shop: Shop
  canManage: boolean
}

function ShopDetailView({ shop, canManage }: ShopDetailViewProps) {
  const deactivate = useDeactivateShop()
  const reactivate = useReactivateShop()
  const toggleVerify = useToggleVerification()

  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const isToggling =
    deactivate.isPending || reactivate.isPending || toggleVerify.isPending

  function onToggleActive() {
    if (shop.is_active) {
      setConfirmDeactivate(true)
    } else {
      reactivate.mutate(shop.id)
    }
  }

  function onConfirmDeactivate() {
    deactivate.mutate(shop.id, {
      onSettled: () => setConfirmDeactivate(false),
    })
  }

  function onToggleVerified() {
    toggleVerify.mutate({ id: shop.id, value: !shop.is_verified })
  }

  return (
    <div className="space-y-6">
      <BackToList />

      <PageHeader
        title={shop.name}
        subtitle={shop.branch_code}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ActiveBadge active={shop.is_active} />
          <VerifiedBadge verified={shop.is_verified} />
          {canManage ? (
            <ActionBar
              shop={shop}
              isToggling={isToggling}
              onToggleActive={onToggleActive}
              onToggleVerified={onToggleVerified}
            />
          ) : null}
        </div>
      </PageHeader>

      <KpiStrip shop={shop} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="service-area" className="text-xs">
            Service area
          </TabsTrigger>
          <TabsTrigger value="hours" className="text-xs">
            Operating hours
          </TabsTrigger>
          <TabsTrigger value="commercials" className="text-xs">
            Commercials
          </TabsTrigger>
          <TabsTrigger value="bank" className="text-xs">
            Bank
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">
            Staff
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab shop={shop} />
        </TabsContent>
        <TabsContent value="service-area" className="mt-4">
          <ServiceAreaTab shop={shop} />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <OperatingHoursTab shop={shop} />
        </TabsContent>
        <TabsContent value="commercials" className="mt-4">
          <CommercialsTab shop={shop} />
        </TabsContent>
        <TabsContent value="bank" className="mt-4">
          <BankTab shop={shop} />
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <StaffTab shop={shop} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab shop={shop} />
        </TabsContent>
      </Tabs>

      {/* Toggle-active confirmation (only fires when deactivating) */}
      <AlertDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("shops.edit.confirmDeactivate.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("shops.edit.confirmDeactivate.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            {shop.name}{" "}
            <span className="font-mono text-xs">({shop.branch_code})</span>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivate.isPending}>
              {t("shopStaff.invite.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                onConfirmDeactivate()
              }}
              disabled={deactivate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivate.isPending
                ? t("shops.edit.submitting")
                : t("shops.edit.confirmDeactivate.title")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function BackToList() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/shops" aria-label="Back to shops">
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Back to shops
        </Link>
      </Button>
    </div>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={cn(
        "gap-1 text-[11px]",
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <XCircle className="h-3 w-3" aria-hidden="true" />
      )}
      {active
        ? t("shops.list.filter.active")
        : t("shops.list.filter.inactive")}
    </Badge>
  )
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[11px]",
        verified
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {verified ? (
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ShieldOff className="h-3 w-3" aria-hidden="true" />
      )}
      {verified
        ? t("shops.list.filter.verified")
        : t("shops.list.filter.unverified")}
    </Badge>
  )
}

interface ActionBarProps {
  shop: Shop
  isToggling: boolean
  onToggleActive: () => void
  onToggleVerified: () => void
}

function ActionBar({
  shop,
  isToggling,
  onToggleActive,
  onToggleVerified,
}: ActionBarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/shops/${shop.id}/edit`}>
          <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("shops.edit.title")}
        </Link>
      </Button>
      <Button
        size="sm"
        variant={shop.is_active ? "outline" : "default"}
        onClick={onToggleActive}
        disabled={isToggling}
      >
        {shop.is_active ? "Deactivate" : "Reactivate"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onToggleVerified}
        disabled={isToggling}
      >
        {shop.is_verified ? "Unverify" : "Verify"}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI strip
// ─────────────────────────────────────────────────────────────────────────────

function KpiStrip({ shop }: { shop: Shop }) {
  // Newly-created shops have NULL aggregate columns until first activity
  // (Postgres NUMERIC NULL → undefined on the wire). Coerce every numeric
  // KPI through Number(... ?? 0) so the strip never crashes the page.
  const totalOrders = Number(shop.total_orders ?? 0)
  const totalRevenue = Number(shop.total_revenue ?? 0)
  const ratingCount = Number(shop.rating_count ?? 0)
  const avgRating = Number(shop.avg_rating ?? 0)

  const items = useMemo(
    () => [
      {
        id: "orders",
        label: "Total orders",
        value: totalOrders.toLocaleString(),
        icon: <ShoppingBag className="h-4 w-4" aria-hidden="true" />,
      },
      {
        id: "revenue",
        label: "Total revenue",
        value: formatCurrency(totalRevenue),
        icon: <IndianRupee className="h-4 w-4" aria-hidden="true" />,
      },
      {
        id: "rating",
        label: "Avg rating",
        value: ratingCount > 0 ? avgRating.toFixed(2) : "—",
        icon: (
          <Star
            className="h-4 w-4 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
        ),
      },
      {
        id: "rating-count",
        label: "Ratings",
        value: ratingCount.toLocaleString(),
        icon: <Star className="h-4 w-4" aria-hidden="true" />,
      },
    ],
    [totalOrders, totalRevenue, ratingCount, avgRating],
  )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {item.label}
              </p>
              <p className="truncate text-base font-semibold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────────────────────

function ShopHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
