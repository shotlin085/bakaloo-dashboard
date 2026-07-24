"use client"

/**
 * Store Coverage Map — pick a store, see its pin, every currently-covered
 * customer's pin, and a boundary shape per serviceable pincode (a real
 * convex hull drawn from actual customer addresses where there are enough
 * of them, an approximate circle otherwise). Backed by
 * `/admin/coverage-map/:shopId` (bakaloo-backend).
 *
 * Cross-shop by design (HQ surface, not a per-store settings page) — every
 * platform admin role manages the whole store network, not one shop, so a
 * store picker is the right entry point rather than scoping to "my shop".
 */

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Store, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveShopsForSwitcher } from "@/hooks/useShops"
import { coverageMapService } from "@/services/coverage-map.service"

const CoverageMapView = dynamic(
  () => import("./coverage-map-view").then((m) => m.CoverageMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    ),
  }
)

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CoverageMapPage() {
  const { data: shopsResult, isLoading: shopsLoading } = useActiveShopsForSwitcher()
  const shops = useMemo(() => shopsResult?.items ?? [], [shopsResult])

  const [shopId, setShopId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!shopId && shops.length > 0) {
      setShopId(shops[0].id)
    }
  }, [shopId, shops])

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "coverage-map", shopId],
    queryFn: () => coverageMapService.get(shopId as string),
    enabled: !!shopId,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Coverage Map"
        subtitle="Where a store's real, delivered-to customers actually are — pincode boundaries are drawn from live address data, not guesswork."
      >
        <Select value={shopId} onValueChange={setShopId} disabled={shopsLoading}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder={shopsLoading ? "Loading stores…" : "Select a store"} />
          </SelectTrigger>
          <SelectContent>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.name}
                <span className="ml-1.5 text-xs text-muted-foreground">({shop.city})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {!shopId && !shopsLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No active stores to show yet.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Unable to load the coverage map for this store right now.
          </CardContent>
        </Card>
      )}

      {shopId && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-[76px] rounded-lg" />
                <Skeleton className="h-[76px] rounded-lg" />
                <Skeleton className="h-[76px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  icon={Users}
                  label="Customers covered"
                  value={data.totalCustomers.toLocaleString()}
                />
                <StatCard
                  icon={MapPin}
                  label="Pincodes with customers"
                  value={data.boundaries.length}
                />
                <StatCard
                  icon={Store}
                  label="Serviceable pincodes"
                  value={data.serviceablePincodes.length}
                />
              </>
            )}
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-semibold">
                {data ? data.shop.name : "Coverage"}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                    Active order
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#DB2777]" />
                    No active order
                  </span>
                </div>
                {isFetching && (
                  <span className="text-xs text-muted-foreground">Refreshing…</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading || !data ? (
                <Skeleton className="h-[560px] w-full rounded-lg" />
              ) : (
                <div className="h-[560px] w-full overflow-hidden rounded-lg border">
                  <CoverageMapView data={data} />
                </div>
              )}
            </CardContent>
          </Card>

          {data && data.boundaries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pincode breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.boundaries
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((boundary) => (
                    <Badge key={boundary.pincode} variant="outline" className="font-mono">
                      {boundary.pincode} · {boundary.count}
                    </Badge>
                  ))}
                {data.uncoveredPincodes.map((pincode) => (
                  <Badge
                    key={pincode}
                    variant="outline"
                    className="font-mono text-muted-foreground"
                  >
                    {pincode} · 0
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
