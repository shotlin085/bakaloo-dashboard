/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function TrendingPreview({
  section,
  isSelected,
  onClick,
  products,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const title =
    typeof config.title === "string" && config.title.trim()
      ? config.title.trim()
      : "Trending Near You"

  const items = (products ?? []).slice(0, 8)

  // Flutter: last word of title is green accent
  const words = title.split(" ")
  const hasAccent = words.length >= 2

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
      {/* Section header — Flutter style with colored last word */}
      <div style={{ padding: "12px 18px 0" }}>
        {hasAccent ? (
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
            <span style={{ color: "#131313" }}>
              {words.slice(0, -1).join(" ")}{" "}
            </span>
            <span style={{ color: "#0D8320", fontWeight: 900 }}>
              {words[words.length - 1]}
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#131313",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
        )}
      </div>

      {/* Horizontal product scroll */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "10px 14px 8px",
        }}
      >
        {items.length > 0
          ? items.map((product) => (
            <TrendingCard key={product.id} product={product} />
          ))
          : Array.from({ length: 4 }, (_, i) => (
            <TrendingPlaceholder key={`ph-${i}`} index={i} />
          ))}
      </div>
    </button>
  )
}

export default memo(TrendingPreview)

function TrendingCard({ product }: { product: Product }) {
  const displayPrice = product.sale_price ?? product.price
  const hasDiscount = product.sale_price && product.sale_price < product.price

  return (
    <div
      style={{
        minWidth: 120,
        maxWidth: 130,
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 80,
          background: "#f8fafc",
          display: "grid",
          placeItems: "center",
          borderBottom: "1px solid #f0f0f0",
          overflow: "hidden",
        }}
      >
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e2e8f0",
            }}
          />
        )}
      </div>
      <div style={{ padding: "6px 8px 8px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#1e293b",
            lineHeight: 1.15,
            height: 25,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 3,
            marginTop: 3,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#131313" }}>
            ₹{displayPrice}
          </span>
          {hasDiscount ? (
            <span
              style={{
                fontSize: 9,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              ₹{product.price}
            </span>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 5,
            height: 24,
            borderRadius: 7,
            background: "#ffffff",
            border: "1.5px solid #16a34a",
            color: "#16a34a",
            fontSize: 11,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
          }}
        >
          ADD
        </div>
      </div>
    </div>
  )
}

function TrendingPlaceholder({ index }: { index: number }) {
  return (
    <div
      style={{
        minWidth: 120,
        maxWidth: 130,
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, hsl(${140 + index * 30}, 22%, 93%), hsl(${160 + index * 30}, 22%, 88%))`,
        }}
      />
      <div style={{ padding: "8px 8px 10px" }}>
        <div
          style={{
            height: 7,
            width: "80%",
            borderRadius: 3,
            background: "#e2e8f0",
          }}
        />
        <div
          style={{
            height: 5,
            width: "50%",
            borderRadius: 2,
            background: "#e2e8f0",
            marginTop: 5,
          }}
        />
        <div
          style={{
            marginTop: 7,
            height: 22,
            borderRadius: 6,
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
          }}
        />
      </div>
    </div>
  )
}
