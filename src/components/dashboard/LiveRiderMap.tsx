"use client"

import { useMemo, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRiderLocations } from "@/hooks/useSocket"
import { MapPin } from "lucide-react"
import "leaflet/dist/leaflet.css"

// Default center: Kolkata, India
const DEFAULT_CENTER: [number, number] = [22.5726, 88.3639]

// Custom rider icon
const riderIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#1A7A3C" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="12" r="6" fill="#fff"/>
      <circle cx="14" cy="12" r="4" fill="#1A7A3C"/>
    </svg>
  `),
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

/** Auto-fit bounds when rider locations change */
function FitBounds({ locations }: { locations: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (locations.length > 1) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    } else if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 14)
    }
  }, [locations, map])
  return null
}

export function LiveRiderMap() {
  const locations = useRiderLocations()

  const center = useMemo<[number, number]>(() => {
    if (locations.length > 0) {
      const avgLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length
      const avgLng = locations.reduce((s, l) => s + l.lng, 0) / locations.length
      return [avgLat, avgLng]
    }
    return DEFAULT_CENTER
  }, [locations])

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Live Riders</CardTitle>
          <Badge
            variant="outline"
            className="text-xs border-0"
            style={{ backgroundColor: "#ECFDF5", color: "#10B981" }}
          >
            {locations.length} online
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {locations.length === 0 ? (
          <div
            className="rounded-lg bg-muted flex flex-col items-center justify-center gap-2"
            style={{ height: 300 }}
          >
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No riders online right now
            </p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ height: 300 }}>
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds locations={locations} />
              {locations.map((rider) => (
                <Marker
                  key={rider.riderId}
                  position={[rider.lat, rider.lng]}
                  icon={riderIcon}
                >
                  <Popup>
                    <span className="font-medium text-sm">Rider {rider.riderId}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
