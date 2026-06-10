/* eslint-disable @next/next/no-img-element */

import { memo, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"
import {
  DEFAULT_CONTAINER_COLOR,
  normalizeLayout,
  readMosaicTiles,
  type MosaicLayout,
  type MosaicTile,
} from "../editors/mosaic-model"

function MosaicPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const layout = normalizeLayout(config.layout_variant)
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR

  const { hero, mini } = readMosaicTiles(config, layout)

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
          {renderLayout(layout, hero, mini)}
        </div>
      </div>
    </button>
  )
}

export default memo(MosaicPreview)

function renderLayout(
  layout: MosaicLayout,
  hero: MosaicTile | null,
  mini: MosaicTile[]
) {
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
          {mini.map((tile, i) =>
            renderTile(tile, i, "mini", { aspectRatio: "0.78" })
          )}
        </div>
      )

    case "single_hero":
      return (
        <div style={{ aspectRatio: "1.95" }}>
          {hero && renderTile(hero, 0, "hero", { height: "100%" })}
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
          {mini.map((tile, i) =>
            renderTile(tile, i, "mini", { aspectRatio: "1.05" })
          )}
        </div>
      )

    case "stacked_banners":
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {mini.map((tile, i) =>
            renderTile(tile, i, "full", { aspectRatio: "2.35" })
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
          {hero && renderTile(hero, 0, "hero", { height: "100%" })}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {mini.map((tile, i) =>
              renderTile(tile, i, "mini", { height: "100%" })
            )}
          </div>
        </div>
      )
  }
}

function renderTile(
  tile: MosaicTile,
  index: number,
  tone: "hero" | "mini" | "full",
  extraStyle: CSSProperties
) {
  const [colorStart, colorEnd] = tile.gradient

  return (
    <div
      key={`tile-${tone}-${index}`}
      style={{
        borderRadius: tone === "hero" ? 22 : 18,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(180deg, ${colorStart}, ${colorEnd})`,
        boxShadow: "0 8px 18px rgba(0,0,0,0.07)",
        ...extraStyle,
      }}
    >
      {tile.imageUrl && (
        <img
          src={tile.imageUrl}
          alt={tile.title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: tile.imageFit,
            objectPosition: "bottom center",
          }}
        />
      )}

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
          whiteSpace: "pre-line",
        }}
      >
        {tile.title}
      </div>

      {tone === "hero" && tile.badgeText && (
        <div
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            padding: "3px 7px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 800,
            color: "#ffffff",
            background: `linear-gradient(180deg, ${
              tile.badgeGradient?.[0] ?? "#FF4CB7"
            }, ${tile.badgeGradient?.[1] ?? "#D91B83"})`,
            whiteSpace: "pre-line",
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {tile.badgeText}
        </div>
      )}
    </div>
  )
}
