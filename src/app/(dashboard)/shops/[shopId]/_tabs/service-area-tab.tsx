"use client"

/**
 * Shop detail — Service Area tab.
 *
 * Renders the shop's serviceable pincode list, delivery radius (km), and a
 * lat/lng map preview.
 *
 * Map rendering: there is no shared `next/dynamic` Leaflet wrapper at the
 * time of writing — `LiveRiderMap` is the only Leaflet user in the
 * dashboard, and it is rider-specific. Rather than refactor a shared
 * wrapper here (out of scope for task 5.6), this tab loads its own minimal
 * `<ShopLocationMap />` lazily via `next/dynamic({ ssr: false })`. If a
 * shared wrapper lands in a later task, swap the import here.
 *
 * Pure presentation — no mutations or user input. The lazy import keeps
 * Leaflet out of the main bundle so the tab is cheap to render until the
 * user opens it.
 *
 * Requirements: 5.7
 */

import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Shop } from "@/types"

/**
 * Lazy-load the Leaflet preview. Leaflet relies on `window`, so SSR is
 * disabled — matches the pattern used by `LiveRiderMap` on the dashboard
 * home (`app/(dashboard)/dashboard/page.tsx`).
 */
const ShopLocationMap = dynamic(
  () => import("./shop-location-map").then((m) => m.ShopLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] w-full items-center justify-center rounded-lg bg-muted">
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    ),
  },
)

export interface ServiceAreaTabProps {
  shop: Shop
}

export function ServiceAreaTab({ shop }: ServiceAreaTabProps) {
  const hasCoordinates =
    typeof shop.lat === "number" &&
    typeof shop.lng === "number" &&
    Number.isFinite(shop.lat) &&
    Number.isFinite(shop.lng)

  const pincodes = shop.serviceable_pincodes ?? []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Pincodes + radius ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Delivery radius
            </p>
            <p className="text-sm">
              {shop.delivery_radius_km} km
              {shop.pincode_only && (
                <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-700">
                  Pincode-only mode — radius ignored
                </Badge>
              )}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Serviceable pincodes ({pincodes.length})
            </p>
            {pincodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pincodes configured.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pincodes.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map preview ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCoordinates ? (
            <>
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">Lat: {shop.lat.toFixed(6)}</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono">Lng: {shop.lng.toFixed(6)}</span>
              </div>
              <div className="h-[260px] w-full overflow-hidden rounded-lg border">
                <ShopLocationMap
                  lat={shop.lat}
                  lng={shop.lng}
                  label={shop.name}
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No coordinates configured for this shop.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
