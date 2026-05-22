/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function BannerPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const gradient = Array.isArray(config.gradient)
    ? config.gradient.filter((value): value is string => typeof value === "string")
    : []
  const start = gradient[0] ?? "#A8E6CF"
  const end = gradient[1] ?? "#88D4AB"
  const backgroundColor =
    typeof config.container_color === "string" ? config.container_color : start
  const imageUrl = typeof config.image_url === "string" ? config.image_url : null
  const lottieUrl = typeof config.lottie_url === "string" ? config.lottie_url : null
  const height = typeof config.height === "number" ? config.height : 188
  const title = typeof config.title === "string" ? config.title : "SUMMER"
  const subtitle = typeof config.subtitle === "string" ? config.subtitle : "Sip & Scoop"

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
          minHeight: height,
          padding: 0,
          borderRadius: 0,
          background: backgroundColor,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${start}, ${end})`,
          }}
        />

        {/* Content: split layout like Flutter */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: imageUrl || lottieUrl ? "1.1fr 0.9fr" : "1fr",
            gap: 8,
            alignItems: "end",
            minHeight: height,
            padding: "18px 14px 14px",
          }}
        >
          {/* Text side */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 0.92,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1,
                color: "#0f172a",
                fontStyle: "italic",
                opacity: 0.85,
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Image side — real image from config */}
          {imageUrl ? (
            <div
              style={{
                justifySelf: "end",
                width: "100%",
                maxWidth: 160,
                minHeight: Math.max(110, height - 50),
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <img
                src={imageUrl}
                alt="Banner"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          ) : lottieUrl ? (
            <div
              style={{
                justifySelf: "end",
                width: "100%",
                maxWidth: 148,
                minHeight: Math.max(100, height - 60),
                borderRadius: 20,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.4)",
              }}
            >
              <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
                <PlayCircle size={26} color="#0f172a" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                  Lottie
                </span>
              </div>
            </div>
          ) : (
            /* Decorative placeholder — clouds/circles */
            <div
              style={{
                justifySelf: "end",
                width: "100%",
                maxWidth: 148,
                minHeight: Math.max(100, height - 60),
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -12,
                  top: 8,
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, rgba(71,85,105,0.12), transparent 60%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  bottom: 6,
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.5), transparent 65%)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export default memo(BannerPreview)
