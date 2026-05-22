/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { ImagePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function CustomBannerPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const imageUrl = typeof config.image_url === "string" ? config.image_url : null
  const radius =
    typeof config.border_radius === "number" ? config.border_radius : 12

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
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Custom banner preview"
          style={{
            display: "block",
            width: "100%",
            minHeight: 168,
            objectFit: "cover",
            borderRadius: Math.max(10, radius),
          }}
        />
      ) : (
        <div
          style={{
            minHeight: 156,
            borderRadius: Math.max(10, radius),
            border: "2px dashed rgba(59,130,246,0.45)",
            background:
              "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(219,234,254,0.7))",
            display: "grid",
            placeItems: "center",
            gap: 10,
            color: "#1d4ed8",
          }}
        >
          <ImagePlus size={28} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            Click to add banner
          </span>
        </div>
      )}
    </button>
  )
}

export default memo(CustomBannerPreview)
