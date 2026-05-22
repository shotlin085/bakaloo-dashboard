import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function SpacerPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const height = typeof config.height === "number" ? config.height : 16

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
          borderRadius: 14,
          border: "2px dashed rgba(148,163,184,0.6)",
          background: "rgba(148,163,184,0.08)",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        Spacer ({height}px)
      </div>
    </button>
  )
}

export default memo(SpacerPreview)
