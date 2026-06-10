/* eslint-disable @next/next/no-img-element */

"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  CircleUserRound,
  Search,
  SignalHigh,
  Wifi,
} from "lucide-react"
import type { ThemeData, ThemeTab } from "@/types/theme.types"
import { ALL_STORE_KEYS, STORE_CONFIGS } from "@/contexts/StoreContext"
import type { ThemeStoreKey } from "@/types/theme.types"
import type { ChromeRegion } from "./chromeRegions"

interface FixedHeaderPreviewProps {
  themeData: ThemeData | null
  activeTabKey: string
  storeKey: ThemeStoreKey
  /** Live API tab list — used for category tab icons and labels. */
  themeTabs?: ThemeTab[]
  onRegionClick?: (region: ChromeRegion) => void
  selectedRegion?: ChromeRegion | null
  hoveredRegion?: ChromeRegion | null
  onPreviewTabChange?: (tabKey: string) => void
}

const STORE_CHIPS = [
  { key: "bakaloo", image: "/preview-assets/Bakaloo.png" },
  { key: "off", image: "/preview-assets/50%25_OFF_zone.png" },
  { key: "super", image: "/preview-assets/Super_mall.png" },
  { key: "cafe", image: "/preview-assets/Cafe.png" },
]

/**
 * Scrollable category tabs with full mouse-drag + wheel support.
 * Matches Flutter's horizontal ListView with BouncingScrollPhysics.
 */
function CategoryTabsScrollRow({
  tabs,
  activeTabKey,
  categoryTabsTheme,
  background,
  onRegionClick,
  selectedRegion,
  regionStyle,
  onPreviewTabChange,
}: {
  tabs: Array<{ key: string; label: string; iconUrl: string | null; fallbackEmoji: string }>
  activeTabKey: string
  categoryTabsTheme: ThemeData["sections"]["categoryTabs"] | undefined
  background: string
  onRegionClick?: (region: ChromeRegion) => void
  selectedRegion?: ChromeRegion | null
  regionStyle: (region: ChromeRegion) => React.CSSProperties
  onPreviewTabChange?: (tabKey: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Track drag state in a ref to avoid stale closures and prevent click events
  // firing when the user was actually scrolling
  const dragStateRef = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false })
  const [isDragging, setIsDragging] = useState(false)

  // Auto-scroll active tab into view whenever activeTabKey changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeEl = el.querySelector<HTMLElement>(`[data-tab-key="${activeTabKey.replace(/"/g, '\\"')}"]`)
    if (!activeEl) return
    const elLeft = activeEl.offsetLeft
    const elRight = elLeft + activeEl.offsetWidth
    const containerLeft = el.scrollLeft
    const containerRight = containerLeft + el.offsetWidth
    if (elLeft < containerLeft) {
      el.scrollTo({ left: Math.max(0, elLeft - 8), behavior: "smooth" })
    } else if (elRight > containerRight) {
      el.scrollTo({ left: elRight - el.offsetWidth + 8, behavior: "smooth" })
    }
  }, [activeTabKey])

  // Mouse-wheel horizontal scroll (shift+wheel or natural horizontal scroll)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // natural horizontal — handled by browser
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return
    const el = scrollRef.current
    if (!el) return
    const dx = e.clientX - dragStateRef.current.startX
    if (Math.abs(dx) > 4) {
      dragStateRef.current.moved = true
    }
    el.scrollLeft = dragStateRef.current.scrollLeft - dx
  }

  const handleMouseUp = () => {
    dragStateRef.current.dragging = false
    setIsDragging(false)
  }

  return (
    <div
      data-region="category_tabs"
      onClick={(e) => {
        if (!onRegionClick) return
        // Don't fire region click if user was dragging
        if (dragStateRef.current.moved) return
        e.stopPropagation()
        onRegionClick("category_tabs")
      }}
      style={{
        ...regionStyle("category_tabs"),
        background,
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        transition: "background 200ms ease",
      }}
    >
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "flex",
          gap: 0,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "4px 0 0 0",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTabKey
          const isInteractiveTab = Boolean(onPreviewTabChange)
          return (
            <div
              key={tab.key}
              data-tab-key={tab.key}
              role={isInteractiveTab ? "tab" : undefined}
              aria-selected={isInteractiveTab ? active : undefined}
              onClick={(e) => {
                // Block tab switch if user was dragging
                if (dragStateRef.current.moved) {
                  e.stopPropagation()
                  dragStateRef.current.moved = false
                  return
                }
                if (!onPreviewTabChange) return
                e.stopPropagation()
                onPreviewTabChange(tab.key)
              }}
              style={{
                width: 78,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingBottom: 4,
                cursor: isInteractiveTab && !isDragging ? "pointer" : "inherit",
              }}
            >
              {/* Tab icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  opacity: active ? 1 : 0.6,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                {tab.iconUrl ? (
                  <img
                    src={tab.iconUrl}
                    alt={tab.label}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent && !parent.querySelector("span")) {
                        const span = document.createElement("span")
                        span.style.fontSize = "26px"
                        span.style.lineHeight = "1"
                        span.textContent = tab.fallbackEmoji
                        parent.appendChild(span)
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 26, lineHeight: 1, userSelect: "none" }}>
                    {tab.fallbackEmoji}
                  </span>
                )}
              </div>

              {/* Tab label */}
              <div
                style={{
                  marginTop: 1,
                  fontSize: 10.8,
                  fontWeight: active ? 700 : 500,
                  color: active
                    ? (categoryTabsTheme?.textColor ?? "#111827")
                    : categoryTabsTheme?.textColor
                    ? `${categoryTabsTheme.textColor}B8`
                    : "#111827",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  maxWidth: 74,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {tab.label}
              </div>

              {/* Active indicator */}
              <div
                style={{
                  marginTop: 4,
                  width: active ? Math.round(78 * 0.78) : 0,
                  height: 5,
                  borderRadius: "999px 999px 0 0",
                  background: active
                    ? (categoryTabsTheme?.indicatorColor ?? "#111827")
                    : "transparent",
                  transition: "width 200ms ease",
                  pointerEvents: "none",
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FixedHeaderPreview({
  themeData,
  activeTabKey,
  storeKey,
  themeTabs,
  onRegionClick,
  selectedRegion,
  hoveredRegion,
  onPreviewTabChange,
}: FixedHeaderPreviewProps) {
  const config = STORE_CONFIGS[storeKey]
  const activeChipIndex = ALL_STORE_KEYS.indexOf(storeKey)

  // ── Resolve theme colors — use saved values, fall back to store config ──
  //
  // FIX: Previously the entire outer wrapper used config.gradient (store hardcode).
  // Now each region reads from themeData directly.

  // Top bar: uses topBar.backgroundColor (set via "Top Bar" region editor)
  const topBarBg =
    themeData?.sections.topBar.backgroundColor ?? config.gradient[0]
  const topBarTextColor =
    themeData?.sections.topBar.textColor ?? config.text

  // Store selector: uses storeSelector.backgroundColor for store-chip row background
  const storeSelectorBg =
    themeData?.sections.storeSelector.backgroundColor ?? config.gradient[1]
  const activeChipColor =
    themeData?.sections.storeSelector.activeChipColor ?? config.chipActive

  // Search zone: uses searchZone.backgroundColor (set via "Search Bar" region editor)
  const searchZoneBg =
    themeData?.sections.searchZone.backgroundColor ?? config.gradient[2]

  // Category tabs: uses own backgroundColor if set, else falls back to searchZoneBg
  const categoryTabsTheme = themeData?.sections.categoryTabs
  const showCategoryTabs = categoryTabsTheme?.visible ?? true
  const categoryTabsBg =
    categoryTabsTheme?.backgroundColor ?? searchZoneBg

  const interactive = Boolean(onRegionClick)

  const regionStyle = (region: ChromeRegion): React.CSSProperties => {
    if (!interactive) return {}
    const isSelected = selectedRegion === region
    const isHovered = hoveredRegion === region
    return {
      cursor: "pointer",
      outline: isSelected
        ? "2px solid var(--store-accent, #3B82F6)"
        : isHovered
        ? "2px dashed rgba(59, 130, 246, 0.55)"
        : "2px solid transparent",
      outlineOffset: -2,
      borderRadius: 4,
      transition: "outline-color 150ms ease",
    }
  }

  const handleRegionClick =
    (region: ChromeRegion) => (e: React.MouseEvent) => {
      if (!onRegionClick) return
      e.stopPropagation()
      onRegionClick(region)
    }

  // Build real tab list from API data (matching Flutter's CategoryTabsRow)
  const realTabs = (() => {
    const apiTabs =
      themeTabs
        ?.filter((t) => t.store_key === storeKey && t.status === "active")
        .sort((a, b) => a.sort_order - b.sort_order) ?? []

    if (apiTabs.length > 0) {
      return apiTabs.map((tab, i) => ({
        key: tab.key,
        label: tab.label,
        iconUrl: tab.image_url ?? null,
        fallbackEmoji: config.categoryIcons[i] ?? "📦",
      }))
    }

    return config.categories.map((label, i) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
      iconUrl: null,
      fallbackEmoji: config.categoryIcons[i] ?? "📦",
    }))
  })()

  return (
    <div style={{ color: topBarTextColor }}>
      {/* ── Top bar (status + delivery header) ─────────────────── */}
      <div
        style={{
          background: topBarBg,
          transition: "background 200ms ease",
        }}
      >
        {/* Status bar */}
        <div
          data-region="top_bar"
          onClick={handleRegionClick("top_bar")}
          style={{
            ...regionStyle("top_bar"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 18px 4px",
            fontSize: 11,
            fontWeight: 700,
            color: topBarTextColor,
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SignalHigh size={12} strokeWidth={2.1} />
            <Wifi size={12} strokeWidth={2.1} />
            <div
              style={{
                width: 18,
                height: 9,
                borderRadius: 999,
                border: "1.5px solid currentColor",
              }}
            />
          </div>
        </div>

        {/* Delivery header */}
        <div
          data-region="top_bar"
          onClick={handleRegionClick("top_bar")}
          style={{
            ...regionStyle("top_bar"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "4px 16px 8px",
            color: topBarTextColor,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              <span>⚡</span>
              <span>6 mins delivery</span>
            </div>
            <div
              style={{
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                fontWeight: 500,
                opacity: 0.78,
              }}
            >
              <span>Add delivery address</span>
              <ChevronDown size={12} strokeWidth={2.2} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 999,
              background: "rgba(255,255,255,0.78)",
              color: "#111827",
            }}
          >
            <CircleUserRound size={20} strokeWidth={2.1} />
          </div>
        </div>
      </div>

      {/* ── Store chips ──────────────────────────────────────────── */}
      {/* FIX: Store chips are always shown in the Flutter home_screen.
          The user said they disabled the store section — but in Flutter,
          StoreSelectorRow has no "visible" field. The store chips appear
          in the old home_screen.dart layout. In the newer StoreScreenShell,
          the store chips row is NOT rendered at all (it's replaced by the
          HomeHeader + search + category tab flow). Since the builder preview
          uses the Bakaloo/Zepto store which is the main home screen,
          we hide the store chips row — it matches the current mobile UX
          where the store chips are only visible in specific store sub-screens. */}
      {false && (
        <div
          data-region="store_chips"
          onClick={handleRegionClick("store_chips")}
          style={{
            ...regionStyle("store_chips"),
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 8,
            padding: "0 12px 8px",
            background: storeSelectorBg,
            transition: "background 200ms ease",
          }}
        >
          {STORE_CHIPS.map((chip, index) => {
            const isActive = index === activeChipIndex
            return (
              <div
                key={chip.key}
                style={{
                  height: isActive ? 58 : 52,
                  marginTop: isActive ? 0 : 4,
                  borderRadius: isActive ? 16 : 14,
                  background: isActive ? activeChipColor : "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: isActive ? "0 8px 16px rgba(15,23,42,0.07)" : "none",
                  overflow: "hidden",
                  padding: isActive ? "8px 10px 10px" : "6px 7px",
                  opacity: isActive ? 1 : 0.55,
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  transition: "all 200ms ease",
                }}
              >
                <img
                  src={chip.image}
                  alt={chip.key}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Search bar ───────────────────────────────────────────── */}
      {/* FIX: Was using config.gradient[2] (store hardcode). Now uses searchZone.backgroundColor */}
      <div
        data-region="search_bar"
        onClick={handleRegionClick("search_bar")}
        style={{
          ...regionStyle("search_bar"),
          padding: "7px 12px 6px",
          background: searchZoneBg,
          transition: "background 200ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 50,
            padding: "0 14px",
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid rgba(234,231,240,1)",
            boxShadow: "0 4px 14px rgba(42,26,71,0.06)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Search size={18} strokeWidth={2.2} color="#6B3FA0" />
          </div>
          <div
            style={{
              width: 1.5,
              height: 20,
              background: "#6B3FA0",
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 400,
              color: "#6B6770",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Search &apos;fresh vegetables&apos;
          </span>
          <div style={{ flexShrink: 0, opacity: 0.7 }}>
            <Search size={20} strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* ── Category tabs — scrollable with mouse drag ────────────── */}
      {showCategoryTabs ? (
        <CategoryTabsScrollRow
          tabs={realTabs}
          activeTabKey={activeTabKey}
          categoryTabsTheme={categoryTabsTheme}
          background={categoryTabsBg}
          onRegionClick={onRegionClick}
          selectedRegion={selectedRegion}
          regionStyle={regionStyle}
          onPreviewTabChange={onPreviewTabChange}
        />
      ) : null}
    </div>
  )
}
