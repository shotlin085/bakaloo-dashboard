"use client"

/**
 * Lazy-loaded Leaflet renderer for the Store Coverage Map.
 *
 * Mounted only via `next/dynamic({ ssr: false })` from page.tsx — matches
 * the LiveRiderMap / ShopLocationMap pattern already used elsewhere in this
 * dashboard (Leaflet touches `window`, so it can never run during SSR).
 *
 * Renders: the store's own pin (distinct icon), one boundary polygon per
 * pincode group (a real convex hull for 3+ customers, an approximate
 * circle otherwise — see coverage-map.service.js on the backend), and one
 * avatar pin per covered customer.
 */

import { useEffect, useMemo } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet"

import type { CoverageMapData } from "@/services/coverage-map.service"

import "leaflet/dist/leaflet.css"

const BOUNDARY_COLORS = ["#2563EB", "#0EA5E9", "#4F46E5", "#0891B2", "#7C3AED", "#0284C7"]

const STORE_ICON = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
        <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#111827" stroke="#fff" stroke-width="2.5"/>
        <circle cx="20" cy="19" r="12" fill="#fff"/>
        <path d="M11 15.5l1.4-4.5h15.2l1.4 4.5" fill="none" stroke="#111827" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M10.5 15.5h19v2.2a2.5 2.5 0 01-5 .4 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-4 -.4v-2.2z" fill="#111827"/>
        <rect x="13.5" y="19.5" width="13" height="8" rx="0.5" fill="none" stroke="#111827" stroke-width="1.5"/>
        <rect x="18" y="21.5" width="4" height="6" fill="#111827"/>
      </svg>
    `),
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -48],
})

function customerIcon(initial: string) {
  const safeInitial = (initial || "?").slice(0, 1).toUpperCase()
  return L.divIcon({
    className: "coverage-map-customer-icon",
    html: `<div style="
      width:26px;height:26px;border-radius:9999px;
      background:#DB2777;color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;font-family:inherit;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    ">${safeInitial}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  })
}

/** Auto-frames the store pin + every customer pin whenever the data set changes. */
function FitToCoverage({ data }: { data: CoverageMapData }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = [
      [data.shop.lat, data.shop.lng],
      ...data.customers.map((c): [number, number] => [c.lat, c.lng]),
    ]
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
  }, [data, map])
  return null
}

export interface CoverageMapViewProps {
  data: CoverageMapData
}

export function CoverageMapView({ data }: CoverageMapViewProps) {
  const center = useMemo<[number, number]>(() => [data.shop.lat, data.shop.lng], [data.shop])

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitToCoverage data={data} />

      {data.boundaries.map((boundary, index) => {
        const color = BOUNDARY_COLORS[index % BOUNDARY_COLORS.length]
        return (
          <Polygon
            key={boundary.pincode}
            positions={boundary.polygon}
            pathOptions={{
              color,
              weight: 2.5,
              fillColor: color,
              fillOpacity: 0.14,
            }}
          >
            <Tooltip sticky>
              <span className="text-xs font-medium">
                {boundary.pincode} — {boundary.count} customer{boundary.count === 1 ? "" : "s"}
              </span>
            </Tooltip>
          </Polygon>
        )
      })}

      {data.customers.map((customer) => (
        <Marker
          key={customer.userId}
          position={[customer.lat, customer.lng]}
          icon={customerIcon(customer.initial)}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{customer.name || "Customer"}</p>
              {customer.pincode && (
                <p className="text-xs text-muted-foreground">PIN {customer.pincode}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <Marker position={center} icon={STORE_ICON}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{data.shop.name}</p>
            <p className="text-xs text-muted-foreground">
              {data.shop.city}, {data.shop.state} — {data.shop.pincode}
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
