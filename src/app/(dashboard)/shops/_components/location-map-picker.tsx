"use client"

/**
 * LocationMapPicker
 * - Map: Leaflet + OpenStreetMap tiles (free, no key, full India coverage)
 * - Search: Nominatim geocoding (OSM, free, no API key, excellent India support)
 * - Click map or search to drop pin; drag pin to fine-tune
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, MapPin, Navigation, RotateCcw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LocationMapPickerProps {
  lat: number | undefined
  lng: number | undefined
  onChange: (lat: number, lng: number) => void
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
}

const INDIA = { lat: 20.5937, lng: 78.9629, zoom: 5 }
const NOMINATIM = "https://nominatim.openstreetmap.org"

export function LocationMapPicker({ lat, lng, onChange }: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import("leaflet").Map | null>(null)
  const markerRef    = useRef<import("leaflet").Marker | null>(null)
  const pinIconRef   = useRef<import("leaflet").DivIcon | null>(null)

  const [ready, setReady]           = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  // Search
  const [query, setQuery]           = useState("")
  const [results, setResults]       = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── drop / move pin ─────────────────────────────────────────────
  const setPin = useCallback((newLat: number, newLng: number) => {
    const map = mapRef.current
    const icon = pinIconRef.current
    if (!map || !icon) return

    const rounded = (v: number) => Math.round(v * 1_000_000) / 1_000_000
    const rlat = rounded(newLat)
    const rlng = rounded(newLng)

    if (markerRef.current) {
      markerRef.current.setLatLng([rlat, rlng])
    } else {
      // need L reference — dynamic import cached by browser after first load
      import("leaflet").then(({ default: L }) => {
        if (!mapRef.current) return
        const m = L.marker([rlat, rlng], { icon, draggable: true })
          .addTo(mapRef.current)
        m.on("dragend", () => {
          const p = m.getLatLng()
          onChange(rounded(p.lat), rounded(p.lng))
        })
        markerRef.current = m
      })
    }
    onChange(rlat, rlng)
  }, [onChange])

  // ── init map (runs once, non-strict-safe) ───────────────────────
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    // If map already mounted on this node, bail — handles React 18 strict
    if ((node as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

    let alive = true

    import("leaflet").then(({ default: L }) => {
      if (!alive || !containerRef.current) return
      if ((containerRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      // Fix webpack broken icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      // Custom purple pin icon
      pinIconRef.current = L.divIcon({
        html: `<div style="
          width:28px;height:36px;position:relative">
          <div style="
            width:28px;height:28px;
            background:linear-gradient(135deg,#7c3aed,#4f46e5);
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:2.5px solid #fff;
            box-shadow:0 3px 12px rgba(124,58,237,.55)">
          </div>
        </div>`,
        className: "",
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -38],
      })

      const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0
      const map = L.map(containerRef.current!, {
        center: hasCoords ? [lat!, lng!] : [INDIA.lat, INDIA.lng],
        zoom:   hasCoords ? 16 : INDIA.zoom,
        zoomControl: true,
      })

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      map.on("click", (e) => setPin(e.latlng.lat, e.latlng.lng))
      mapRef.current = map

      // Place initial pin
      if (hasCoords && pinIconRef.current) {
        const m = L.marker([lat!, lng!], { icon: pinIconRef.current, draggable: true })
          .addTo(map)
        const rounded = (v: number) => Math.round(v * 1_000_000) / 1_000_000
        m.on("dragend", () => {
          const p = m.getLatLng()
          onChange(rounded(p.lat), rounded(p.lng))
        })
        markerRef.current = m
      }

      setReady(true)
    })

    return () => {
      alive = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        pinIconRef.current = null
        setReady(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── geolocate ───────────────────────────────────────────────────
  function handleGeolocate() {
    if (!navigator.geolocation || !mapRef.current) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current?.flyTo([coords.latitude, coords.longitude], 17, { duration: 1 })
        setPin(coords.latitude, coords.longitude)
        setIsLocating(false)
      },
      () => setIsLocating(false),
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  // ── reset ────────────────────────────────────────────────────────
  function handleReset() {
    mapRef.current?.flyTo([INDIA.lat, INDIA.lng], INDIA.zoom)
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
    onChange(0, 0)
  }

  // ── Nominatim search (debounced 500 ms) ─────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (query.trim().length < 3) { setResults([]); setShowDropdown(false); return }

    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(
          `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query + " India")}&limit=6&countrycodes=in`,
          { headers: { "Accept-Language": "en", "User-Agent": "BakalooAdmin/1.0" } },
        )
        const data: SearchResult[] = await r.json()
        setResults(data)
        setShowDropdown(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [query])

  function pickResult(r: SearchResult) {
    const rlat = parseFloat(r.lat), rlng = parseFloat(r.lon)
    mapRef.current?.flyTo([rlat, rlng], 17, { duration: 1 })
    setPin(rlat, rlng)
    setQuery(r.display_name.split(",").slice(0, 2).join(", "))
    setShowDropdown(false)
  }

  const hasPinned = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0

  return (
    <div className="space-y-2.5">

      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
          {searching
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
            : <Search className="h-4 w-4 shrink-0 text-slate-400" />
          }
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search address, landmark, locality in India…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
          />
          {query && (
            <button type="button"
              onClick={() => { setQuery(""); setResults([]); setShowDropdown(false) }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-56 overflow-auto rounded-xl border border-border/60 bg-white shadow-xl">
            {results.map((r) => (
              <button key={r.place_id} type="button" onClick={() => pickResult(r)}
                className="flex w-full items-start gap-2.5 border-b border-border/30 px-3 py-2.5 text-left text-xs transition last:border-0 hover:bg-violet-50">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="text-slate-700 line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-violet-500" />
          <span>Search or click the map to pin your exact store location</span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm"
            onClick={handleGeolocate} disabled={isLocating || !ready}
            className="h-7 gap-1 rounded-lg border-border/60 text-xs">
            {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
            {isLocating ? "Locating…" : "My location"}
          </Button>
          <Button type="button" variant="ghost" size="sm"
            onClick={handleReset} disabled={!ready}
            className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:text-slate-600" title="Reset">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="relative overflow-hidden rounded-xl border-2 border-violet-100 shadow-md" style={{ height: 300 }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Loading map…
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {hasPinned ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs">
          <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="font-medium text-emerald-700">Location pinned</span>
          <span className="font-mono text-emerald-600">{lat!.toFixed(6)}, {lng!.toFixed(6)}</span>
          <span className="ml-auto text-emerald-400">Drag pin to adjust</span>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs",
          "border-amber-300 bg-amber-50 text-amber-700",
        )}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Search for your address above, or click the map to pin the location
        </div>
      )}
    </div>
  )
}
