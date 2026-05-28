/* eslint-disable @next/next/no-img-element */

import {
  ChevronDown,
  CircleUserRound,
  Search,
  SignalHigh,
  Wifi,
} from "lucide-react"
import type { ThemeData } from "@/types/theme.types"
import { ALL_STORE_KEYS, STORE_CONFIGS } from "@/contexts/StoreContext"
import type { ThemeStoreKey } from "@/types/theme.types"
import type { ChromeRegion } from "./chromeRegions"

interface FixedHeaderPreviewProps {
  themeData: ThemeData | null
  activeTabKey: string
  storeKey: ThemeStoreKey
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
  { key: "off", image: "/preview-assets/50%_OFF_zone.png" },
  { key: "super", image: "/preview-assets/Super_mall.png" },
  { key: "cafe", image: "/preview-assets/Cafe.png" },
]


export function FixedHeaderPreview({
  themeData,
  activeTabKey,
  storeKey,
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
  const promoImageUrl = themeData?.sections.searchZone.promoBoxImageUrl ?? null
  const categoryTabsBackground =
    themeData?.sections.searchZone.backgroundColor ?? "#ffffff"

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

  const handleRegionClick = (region: ChromeRegion) => (e: React.MouseEvent) => {
    if (!onRegionClick) return
    e.stopPropagation()
    onRegionClick(region)
  }

  const storeTabs = config.categories.map((label, i) => ({
    key: label.toLowerCase().replace(/\s+/g, "_"),
    label,
    fallbackEmoji: config.categoryIcons[i] ?? "📦",
  }))

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
        <span>6:17</span>
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
            <span>Log in to add your delivery address</span>
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

      {/* Store chips — using actual Flutter app PNG images */}
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
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Search bar + promo box */}
      <div
        data-region="search_bar"
        onClick={handleRegionClick("search_bar")}
        style={{
          ...regionStyle("search_bar"),
          display: "grid",
          gridTemplateColumns: "1fr 112px",
          gap: 8,
          padding: "7px 12px 6px",
          background: config.gradient[2],
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minHeight: 56,
            padding: "0 16px",
            borderRadius: 16,
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          <Search size={21} strokeWidth={2.4} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(15,23,42,0.74)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {config.label === "Bakaloo"
              ? "Search for \"Lego\""
              : config.label === "50% OFF Zone"
              ? "Search for \"deals\""
              : config.label === "Super Mall"
              ? "Search for \"Earrings\""
              : "Search for \"Toys\""}
          </span>
        </div>

        <div
          style={{
            minHeight: 56,
            borderRadius: "16px 0 0 16px",
            border: "1px solid rgba(15,23,42,0.10)",
            background: "#ffffff",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            padding: 4,
          }}
        >
          {promoImageUrl ? (
            <img
              src={promoImageUrl}
              alt="Promo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src="/preview-assets/everyday_essentials.png"
              alt="Everyday Essentials"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
      </div>

      {/* Category tabs — 3D icons from tab_icon_url or fallback emoji */}
      {showCategoryTabs ? (
        <div
          data-region="category_tabs"
          onClick={handleRegionClick("category_tabs")}
          style={{
            ...regionStyle("category_tabs"),
            display: "flex",
            gap: 2,
            overflowX: "auto",
            padding: "6px 0 0 0",
            background: categoryTabsBackground,
            borderBottom: "1px solid rgba(15,23,42,0.06)",
            scrollbarWidth: "none",
          }}
        >
          {storeTabs.map((tab) => {
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
                  paddingBottom: 6,
                  cursor: isInteractiveTab ? "pointer" : undefined,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: "grid",
                    placeItems: "center",
                    opacity: active ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>
                    {tab.fallbackEmoji}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 10.8,
                    fontWeight: active ? 700 : 500,
                    color: active
                      ? categoryTabsTheme?.textColor ?? "#111827"
                      : categoryTabsTheme?.textColor
                      ? `${categoryTabsTheme.textColor}B8`
                      : "#111827",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    width: active ? 56 : 0,
                    height: 5,
                    borderRadius: "999px 999px 0 0",
                    background: active
                      ? categoryTabsTheme?.indicatorColor ?? "#111827"
                      : "transparent",
                    transition: "width 150ms ease",
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
