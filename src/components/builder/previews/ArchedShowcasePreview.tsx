/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function getGradient(value: unknown): [string, string] | null {
  const gradient = Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0
      )
    : []

  return gradient.length >= 2 ? [gradient[0], gradient[1]] : null
}

interface PreviewProduct {
  name?: string
  price?: number
  images?: string[]
}

function createPlaceholderProducts(count: number): PreviewProduct[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Product ${index + 1}`,
    price: [99, 129, 149, 179, 219, 249][index % 6],
  }))
}

function renderProducts(
  layout: string,
  products: Array<{ name?: string; price?: number; images?: string[] }>,
  opts: {
    cardBg: string
    cardBgColor: string
    cornerRadius: number
    cardShape: string
    archHeight: number
    cardCanvasBackground: string
    cardContentTopPadding: number
  }
) {
  const renderCard = (
    product: (typeof products)[number],
    index: number,
    width: number,
    height: number
  ) => {
    const mediaHeight = Math.max(42, Math.round(height * 0.46))

    return (
      <div
        key={`prod-${index}`}
        style={{
          width,
          minWidth: width,
          minHeight: height,
          background: opts.cardBg,
          borderRadius: opts.cornerRadius,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {opts.cardShape === "arch" ? (
          <svg
            viewBox="0 0 400 36"
            preserveAspectRatio="none"
            style={{
              width: "100%",
              height: opts.archHeight,
              display: "block",
              position: "absolute",
              top: 0,
              left: 0,
              background: opts.cardCanvasBackground,
            }}
          >
            <path
              d="M0 36 Q200 -12 400 36 L400 36 L0 36 Z"
              fill={opts.cardBgColor}
            />
          </svg>
        ) : null}

        <div style={{ padding: `${opts.cardContentTopPadding}px 8px 8px` }}>
          <div
            style={{
              width: "100%",
              height: mediaHeight,
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: 6,
              background: "transparent",
            }}
          >
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name ?? "Product"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    "radial-gradient(circle at 50% 45%, #fef3c7, transparent 70%)",
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: width <= 76 ? 8 : 9,
              fontWeight: 600,
              color: "#111",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name ?? `Product ${index + 1}`}
          </div>
          <div
            style={{
              fontSize: width <= 76 ? 9 : 10,
              fontWeight: 700,
              color: "#111",
              marginTop: 4,
            }}
          >
            ₹{product.price ?? 99}
          </div>
        </div>
      </div>
    )
  }

  switch (layout) {
    case "grid_2col": {
      const previewProducts =
        products.length > 0 ? products.slice(0, 4) : createPlaceholderProducts(4)

      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            justifyItems: "stretch",
          }}
        >
          {previewProducts.map((product, index) =>
            renderCard(product, index, 120, 110)
          )}
        </div>
      )
    }
    case "grid_3col": {
      const previewProducts =
        products.length > 0 ? products.slice(0, 6) : createPlaceholderProducts(6)

      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            justifyItems: "stretch",
          }}
        >
          {previewProducts.map((product, index) =>
            renderCard(product, index, 76, 90)
          )}
        </div>
      )
    }
    case "hero_plus_grid": {
      const previewProducts =
        products.length > 0 ? products.slice(0, 3) : createPlaceholderProducts(3)

      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            alignItems: "start",
          }}
        >
          <div style={{ gridRow: "span 2" }}>
            {previewProducts[0]
              ? renderCard(previewProducts[0], 0, 140, 220)
              : null}
          </div>
          {previewProducts.slice(1, 3).map((product, index) =>
            renderCard(product, index + 1, 120, 105)
          )}
        </div>
      )
    }
    case "stacked_cards": {
      const previewProducts =
        products.length > 0 ? products.slice(0, 3) : createPlaceholderProducts(3)

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {previewProducts.map((product, index) => (
            <div
              key={`stacked-${index}`}
              style={{
                display: "flex",
                gap: 8,
                background: opts.cardBg,
                borderRadius: opts.cornerRadius,
                padding: 8,
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  background: "#f5f5f5",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name ?? ""}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background:
                        "radial-gradient(circle at 50% 45%, #fef3c7, transparent 70%)",
                    }}
                  />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#111",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {product.name ?? `Product ${index + 1}`}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#111",
                    marginTop: 4,
                  }}
                >
                  ₹{product.price ?? 99}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    default: {
      const previewProducts =
        products.length > 0 ? products.slice(0, 4) : createPlaceholderProducts(4)

      return (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "hidden",
            paddingBottom: 4,
          }}
        >
          {previewProducts.map((product, index) =>
            renderCard(product, index, 96, 110)
          )}
        </div>
      )
    }
  }
}

function ArchedShowcasePreview({
  section,
  isSelected,
  onClick,
  products,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>

  // Top-level
  const showTitle =
    typeof config.show_title === "boolean" ? config.show_title : true
  const title =
    typeof config.title === "string" && config.title.trim()
      ? config.title
      : "Top Picks"
  const titleColor =
    typeof config.title_color === "string" ? config.title_color : "#1A1A1A"
  const bgColor =
    typeof config.container_color === "string" && config.container_color.trim()
      ? config.container_color
      : "#FDE7C4"
  const limit = typeof config.limit === "number" ? config.limit : 10
  const archHeight =
    typeof config.arch_height === "number" ? config.arch_height : 14
  const cornerRadius =
    typeof config.corner_radius === "number" ? config.corner_radius : 24
  const cardShape = config.card_shape === "wave" ? "wave" : "arch"
  const bgGradient = getGradient(config.bg_gradient)
  const boxGradient = getGradient(config.box_gradient)

  // Banner
  const bannerCfg = (
    typeof config.banner === "object" && config.banner !== null
      ? config.banner
      : {}
  ) as Record<string, unknown>
  const bannerEnabled = bannerCfg.enabled === true
  const bannerHeight =
    typeof bannerCfg.height === "number" ? bannerCfg.height : 120
  const bannerGradient = getGradient(bannerCfg.gradient)

  // Category Strip
  const catCfg = (
    typeof config.category_strip === "object" && config.category_strip !== null
      ? config.category_strip
      : {}
  ) as Record<string, unknown>
  const catEnabled = catCfg.enabled === true
  const catItems = Array.isArray(catCfg.items) ? catCfg.items : []

  // Product layout
  const productLayout =
    typeof config.product_layout === "string"
      ? config.product_layout
      : "horizontal_scroll"

  const sectionBg = bgGradient
    ? `linear-gradient(180deg, ${bgGradient[0]}, ${bgGradient[1]})`
    : undefined
  const sectionSurface = sectionBg ?? bgColor
  const cardBgColor = boxGradient?.[0] ?? bgColor
  const cardBg = boxGradient
    ? `linear-gradient(180deg, ${boxGradient[0]}, ${boxGradient[1]})`
    : bgColor
  const displayProducts: PreviewProduct[] = (products ?? [])
    .slice(0, limit)
    .map((product) => ({
      name: product.name,
      price: product.price,
      images: product.images,
    }))
  const cardContentTopPadding = cardShape === "arch" ? archHeight + 8 : 14
  const cardCanvasBackground = sectionSurface

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
          padding: "12px 14px",
          background: sectionSurface,
          borderRadius: cornerRadius + 4,
        }}
      >
        {/* ── ZONE 1: Title ── */}
        {showTitle && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: titleColor,
              marginBottom: 10,
              textAlign: "left",
            }}
          >
            {title}
          </div>
        )}

        {/* ── ZONE 2: Banner ── */}
        {bannerEnabled && (
          <div
            style={{
              height: Math.min(bannerHeight * 0.4, 60),
              borderRadius: 10,
              marginBottom: 10,
              background: bannerGradient
                ? `linear-gradient(135deg, ${bannerGradient[0]}, ${bannerGradient[1]})`
                : "linear-gradient(135deg, #E8F5E9, #C8E6C9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#666",
              fontWeight: 500,
            }}
          >
            🎬 Banner
          </div>
        )}

        {/* ── ZONE 3: Category Strip ── */}
        {catEnabled && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              overflowX: "hidden",
            }}
          >
            {(catItems.length > 0 ? catItems.slice(0, 6) : [0, 1, 2, 3, 4]).map(
              (_: unknown, index: number) => (
                <div
                  key={index}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: index === 0 ? "#D8B4FE" : "#E5E7EB",
                    border: "1px solid rgba(255,255,255,0.5)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                    flexShrink: 0,
                  }}
                />
              )
            )}
          </div>
        )}

        {/* ── ZONE 4: Products ── */}
        {renderProducts(productLayout, displayProducts, {
          cardBg,
          cardBgColor,
          cornerRadius,
          cardShape,
          archHeight,
          cardCanvasBackground,
          cardContentTopPadding,
        })}

        {/* See all CTA */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              background: "#FFDFB8",
              borderRadius: 100,
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              color: "#333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: "100%",
            }}
          >
            See all ▸
          </div>
        </div>
      </div>
    </button>
  )
}

export default memo(ArchedShowcasePreview)
