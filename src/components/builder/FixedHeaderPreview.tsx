/* eslint-disable @next/next/no-img-element */

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
  /** Live API tab list — used for category tab icons and labels (replaces hardcoded config). */
  themeTabs?: ThemeTab[]
  /** When provided, makes chrome regions interactive. */
  onRegionClick?: (region: ChromeRegion) => void
  /** Currently selected chrome region (for outline highlight). */
  selectedRegion?: ChromeRegion | null
  /** Hovered chrome region (for hover outline). */
  hoveredRegion?: ChromeRegion | null
  /** Optional callback fired when a category tab inside the preview is clicked. */
  onPreviewTabChange?: (tabKey: string) => void
}

/**
 * Store chip images — sourced from the Flutter app's assets/images/ folder,
 * copied to public/preview-assets/ for the dashboard preview.
 */
const STORE_CHIPS = [
  { key: "bakaloo", image: "/preview-assets/Bakaloo.png" },
  { key: "off", image: "/preview-assets/50%25_OFF_zone.png" },
  { key: "super", image: "/preview-assets/Super_mall.png" },
  { key: "cafe", image: "/preview-assets/Cafe.png" },
]

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

  const activeChipColor =
    themeData?.sections.storeSelector.activeChipColor ?? config.chipActive
  const categoryTabsTheme = themeData?.sections.categoryTabs
  const showCategoryTabs = categoryTabsTheme?.visible ?? true
  // Flutter contract: category-tabs row shares `searchZone.backgroundColor` by default.
  // When the admin explicitly sets `categoryTabs.backgroundColor`, use that instead so
  // the two regions can be styled independently from the dashboard.
  const categoryTabsBackground =
    categoryTabsTheme?.backgroundColor ??
    themeData?.sections.searchZone.backgroundColor ??
    "#ffffff"

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

  // Build real tab list from API data (matching Flutter's CategoryTabsRow).
  // Falls back to hardcoded store config only when no API data is loaded yet.
  const realTabs: Array<{
    key: string
    label: string
    iconUrl: string | null
    fallbackEmoji: string
  }> = (() => {
    const apiTabs =
      themeTabs?.filter((t) => t.store_key === storeKey && t.status === "active")
        .sort((a, b) => a.sort_order - b.sort_order) ?? []

    if (apiTabs.length > 0) {
      return apiTabs.map((tab, i) => ({
        key: tab.key,
        label: tab.label,
        iconUrl: tab.image_url ?? null,
        fallbackEmoji: config.categoryIcons[i] ?? "📦",
      }))
    }

    // Fallback: hardcoded store config (used while tabs are loading)
    return config.categories.map((label, i) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
      iconUrl: null,
      fallbackEmoji: config.categoryIcons[i] ?? "📦",
    }))
  })()

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 58%, ${config.gradient[2]} 100%)`,
        color: config.text,
        willChange: "transform, opacity",
        transform: "translateZ(0)",
        contain: "layout style paint",
        transition: "background 250ms ease",
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
          }}
        >
          <CircleUserRound size={20} strokeWidth={2.1} />
        </div>
      </div>

      {/* Store chips */}
      <div
        data-region="store_chips"
        onClick={handleRegionClick("store_chips")}
        style={{
          ...regionStyle("store_chips"),
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          padding: "0 12px 8px",
          background: config.gradient[1],
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
                boxShadow: isActive
                  ? "0 8px 16px rgba(15,23,42,0.07)"
                  : "none",
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

      {/* Search bar — full width, no promo box.
          Flutter removed the "Everyday Essentials" promo accessory entirely.
          The search bar is always full width (width: double.infinity). */}
      <div
        data-region="search_bar"
        onClick={handleRegionClick("search_bar")}
        style={{
          ...regionStyle("search_bar"),
          padding: "7px 12px 6px",
          background: config.gradient[2],
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
          {/* Search icon (matches Flutter bakaloo-search-icon.png dimensions) */}
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
          {/* Purple divider — matches Flutter */}
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
          {/* Scan icon */}
          <div style={{ flexShrink: 0, opacity: 0.7 }}>
            <Search
              size={20}
              strokeWidth={1.8}
              style={{ transform: "rotate(0deg)" }}
            />
          </div>
        </div>
      </div>

      {/* Category tabs — real labels and icons from API, scrollable like Flutter */}
      {showCategoryTabs ? (
        <div
          data-region="category_tabs"
          onClick={handleRegionClick("category_tabs")}
          style={{
            ...regionStyle("category_tabs"),
            display: "flex",
            gap: 0,
            overflowX: "auto",
            padding: "4px 0 0 0",
            background: categoryTabsBackground,
            borderBottom: "1px solid rgba(15,23,42,0.06)",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {realTabs.map((tab) => {
            const active = tab.key === activeTabKey
            const isInteractiveTab = Boolean(onPreviewTabChange)
            return (
              <div
                key={tab.key}
                role={isInteractiveTab ? "tab" : undefined}
                aria-selected={isInteractiveTab ? active : undefined}
                onClick={(e) => {
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
                  cursor: isInteractiveTab ? "pointer" : "default",
                }}
              >
                {/* Tab icon — real image from API or emoji fallback */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: "grid",
                    placeItems: "center",
                    opacity: active ? 1 : 0.6,
                    overflow: "hidden",
                  }}
                >
                  {tab.iconUrl ? (
                    <img
                      src={tab.iconUrl}
                      alt={tab.label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        // On image load error, fall back to emoji
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
                    <span style={{ fontSize: 26, lineHeight: 1 }}>
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
                  }}
                >
                  {tab.label}
                </div>

                {/* Active indicator — pill bottom border, animates width */}
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
                  }}
                />
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
