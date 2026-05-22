/* eslint-disable @next/next/no-img-element */

import { memo, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

type MosaicLayout =
  | "hero_plus_four"
  | "two_by_three"
  | "single_hero"
  | "two_by_two"
  | "stacked_banners"

/** Pre-designed tile images from the Flutter app's assets/images/ */
const MINIBOX_IMAGES = [
  "/preview-assets/1ST_MINIBOX.png",
  "/preview-assets/2ND_MINIBOX.png",
  "/preview-assets/3RD_MINIBOX.png",
  "/preview-assets/4TH_MINIBOX.png",
]

/** Default tile configs matching Flutter's SeasonalMosaicTheme.defaults() */
const TILE_CONFIGS = [
  { title: "Summer Cool Deals", gradient: ["#0EA5E9", "#38BDF8"] },
  { title: "Frozen Fizz", gradient: ["#8B5CF6", "#A78BFA"] },
  { title: "Snack Attack", gradient: ["#F97316", "#FBBF24"] },
  { title: "Daily Essentials", gradient: ["#10B981", "#34D399"] },
  { title: "Sweet Dreams", gradient: ["#EC4899", "#F472B6"] },
  { title: "Mega Deals", gradient: ["#6366F1", "#818CF8"] },
]

const DEFAULT_CONTAINER_COLOR = "#DCEEFF"

function MosaicPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const layout =
    typeof config.layout_variant === "string"
      ? (config.layout_variant as MosaicLayout)
      : "hero_plus_four"
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR

  return (
    <button
      type="button"
      className={cn(
        styles.sectionSlot,
        styles.sectionSlotHover,
        isSelected && styles.sectionSlotSelected
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div
        style={{
          backgroundColor: containerColor,
          borderRadius: 24,
          overflow: "hidden",
          padding: layout === "hero_plus_four" ? "3px 0 4px" : "4px 0 5px",
        }}
      >
        <div style={{ padding: layout === "hero_plus_four" ? "0 5px" : "0 5px 2px" }}>
          {renderLayout(layout)}
        </div>
      </div>
    </button>
  )
}

export default memo(MosaicPreview)

function renderLayout(layout: MosaicLayout) {
  switch (layout) {
    case "two_by_three":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 6,
          }}
        >
          {Array.from({ length: 6 }, (_, i) =>
            renderAssetTile(i, undefined, "mini", { aspectRatio: "0.78" })
          )}
        </div>
      )

    case "single_hero":
      return (
        <div style={{ aspectRatio: "1.95" }}>
          {renderAssetTile(0, undefined, "hero", { height: "100%" })}
        </div>
      )

    case "two_by_two":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 6,
          }}
        >
          {Array.from({ length: 4 }, (_, i) =>
            renderAssetTile(i, undefined, "mini", { aspectRatio: "1.05" })
          )}
        </div>
      )

    case "stacked_banners":
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {Array.from({ length: 3 }, (_, i) =>
            renderAssetTile(i, undefined, "full", { aspectRatio: "2.35" })
          )}
        </div>
      )

    case "hero_plus_four":
    default:
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.36fr 0.64fr",
            gap: 6,
            aspectRatio: "1.44",
          }}
        >
          {renderAssetTile(0, undefined, "hero", {
            height: "100%",
          })}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {Array.from({ length: 4 }, (_, i) =>
              renderAssetTile(i, undefined, "mini", { height: "100%" })
            )}
          </div>
        </div>
      )
  }
}

function renderAssetTile(
  index: number,
  height: number | undefined,
  tone: "hero" | "mini" | "full",
  extraStyle: CSSProperties
) {
  const tileConfig = TILE_CONFIGS[index % TILE_CONFIGS.length]
  const assetImage = MINIBOX_IMAGES[index % MINIBOX_IMAGES.length]
  const [colorStart, colorEnd] = tileConfig.gradient

  return (
    <div
      key={`tile-${tone}-${index}`}
      style={{
        minHeight: height,
        borderRadius: tone === "hero" ? 22 : 18,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(180deg, ${colorStart}, ${colorEnd})`,
        boxShadow: "0 8px 18px rgba(0,0,0,0.07)",
        ...extraStyle,
      }}
    >
      {/* Asset image — the actual product collage from Flutter */}
      <img
        src={assetImage}
        alt={tileConfig.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "bottom center",
        }}
      />

      {/* Title overlay */}
      <div
        style={{
          position: "absolute",
          top: tone === "hero" ? 12 : 8,
          left: tone === "hero" ? 14 : 10,
          right: 18,
          fontSize: tone === "hero" ? 16 : 12,
          fontWeight: 700,
          color: "#ffffff",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          textShadow: "0 2px 4px rgba(0,0,0,0.22)",
        }}
      >
        {tileConfig.title}
      </div>
    </div>
  )
}
