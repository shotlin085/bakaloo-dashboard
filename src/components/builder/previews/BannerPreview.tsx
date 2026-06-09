/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

/**
 * Preview for the `animated_banner` section type.
 *
 * Flutter renders: `AnimatedBannerSection` — a fixed-height container
 * with a gradient background plus an optional image or Lottie animation.
 * There is no text/subtitle rendered in Flutter — they are not part of this
 * section's config at all. The preview must match that contract exactly.
 */
function BannerPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>

  // Gradient colors — Flutter: bannerTheme.backgroundGradient
  const gradient = Array.isArray(config.gradient)
    ? config.gradient.filter((v): v is string => typeof v === "string")
    : []
  const gradientStart = gradient[0] ?? "#B1EAFF"
  const gradientEnd = gradient[1] ?? "#A8E6FF"

  // Container background color — Flutter: bannerTheme.containerColor
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : gradientStart

  // Image or lottie URL
  const imageUrl =
    typeof config.image_url === "string" && config.image_url.trim()
      ? config.image_url
      : null
  const lottieUrl =
    typeof config.lottie_url === "string" && config.lottie_url.trim()
      ? config.lottie_url
      : null

  // Height — Flutter: entry.height ?? 120
  const height = typeof config.height === "number" ? config.height : 120

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
      {/* Outer container — Flutter DecoratedBox(color: containerColor) */}
      <div
        style={{
          background: containerColor,
          overflow: "hidden",
        }}
      >
        {/* Fixed-height banner area */}
        <div
          style={{
            position: "relative",
            height,
            overflow: "hidden",
          }}
        >
          {/* Background gradient — Flutter LinearGradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${gradientStart}, ${gradientEnd})`,
            }}
          />
          {/* White shimmer overlay — Flutter: two Color(0x26FFFFFF) → Color(0x00FFFFFF) stops */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 28%, transparent 62%)",
              pointerEvents: "none",
            }}
          />

          {/* Content layer */}
          {imageUrl ? (
            /* Network image — Flutter BoxFit.cover */
            <img
              src={imageUrl}
              alt="Banner"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : lottieUrl ? (
            /* Lottie placeholder — shows an indicator since we can't run Lottie in browser */
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                gap: 6,
              }}
            >
              <div style={{ display: "grid", placeItems: "center", gap: 4 }}>
                <PlayCircle
                  size={24}
                  color="rgba(255,255,255,0.8)"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))" }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.75)",
                    letterSpacing: "0.08em",
                  }}
                >
                  LOTTIE ANIMATION
                </span>
              </div>
            </div>
          ) : (
            /* No asset configured — matches Flutter: just the gradient with shimmer */
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.06em",
                }}
              >
                Gradient background
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export default memo(BannerPreview)
