/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function CarouselPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const images = Array.isArray(config.images)
    ? (config.images as string[]).filter((u: string) => typeof u === "string" && u.trim())
    : []
  const singleImage =
    typeof config.image_url === "string" && config.image_url.trim()
      ? config.image_url
      : null
  const borderRadius =
    typeof config.border_radius === "number" ? config.border_radius : 18

  const allImages = images.length > 0 ? images : singleImage ? [singleImage] : []
  const isPromo = section.section_type === "promo_carousel"

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
      <div style={{ padding: "8px 10px" }}>
        {allImages.length > 0 ? (
          <div>
            {/* Show first image as main card */}
            <div
              style={{
                borderRadius,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={allImages[0]}
                alt={isPromo ? "Promo Banner" : "Carousel"}
                style={{
                  width: "100%",
                  height: isPromo ? 160 : 140,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            {/* Pagination dots */}
            {allImages.length > 1 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {allImages.map((_, index) => (
                  <div
                    key={`dot-${index}`}
                    style={{
                      width: index === 0 ? 16 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: index === 0 ? "#e67e22" : "#d5d5d5",
                      transition: "width 0.18s ease",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          /* Placeholder carousel */
          <div>
            <div
              style={{
                height: isPromo ? 160 : 140,
                borderRadius,
                background:
                  "linear-gradient(135deg, #e2e8f0, #f1f5f9, #e2e8f0)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Promo Banner
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 4 }}>
                  Add images via config
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginTop: 8,
              }}
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={`dot-${index}`}
                  style={{
                    width: index === 0 ? 16 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: index === 0 ? "#e67e22" : "#d5d5d5",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

export default memo(CarouselPreview)
