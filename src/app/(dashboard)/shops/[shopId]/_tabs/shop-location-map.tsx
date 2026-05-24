"use client"

/**
 * Lazy-loaded Leaflet preview for a single shop location.
 *
 * Mounted only inside the Service Area tab via `next/dynamic({ ssr: false })`
 * so Leaflet stays out of the main bundle and never executes during SSR.
 * Mirrors the LiveRiderMap dashboard component's setup, scaled down to a
 * single static marker.
 *
 * Pure presentation — receives lat/lng/label props, renders a tile layer +
 * marker.
 */

import { useMemo } from "react"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"

import "leaflet/dist/leaflet.css"

export interface ShopLocationMapProps {
  lat: number
  lng: number
  label: string
}

/**
 * Inline SVG pin avoids the asset-resolution pitfalls of Leaflet's default
 * marker images under bundlers; matches the LiveRiderMap pattern.
 */
const SHOP_PIN = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#1A7A3C" stroke="#fff" stroke-width="2"/>
        <circle cx="14" cy="12" r="6" fill="#fff"/>
        <circle cx="14" cy="12" r="3" fill="#1A7A3C"/>
      </svg>
    `),
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

export function ShopLocationMap({ lat, lng, label }: ShopLocationMapProps) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng])

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      attributionControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={center} icon={SHOP_PIN}>
        <Popup>
          <span className="text-sm font-medium">{label}</span>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
