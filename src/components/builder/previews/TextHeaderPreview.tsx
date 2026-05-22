import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function TextHeaderPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const text = typeof config.text === "string" ? config.text : "Section Title"
  const fontSize =
    typeof config.font_size === "number" ? config.font_size : 18
  const color = typeof config.color === "string" ? config.color : "#000000"
  const alignment =
    config.alignment === "center" || config.alignment === "right"
      ? config.alignment
      : "left"

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
          padding: "14px 16px 10px",
          fontSize,
          color,
          textAlign: alignment,
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
    </button>
  )
}

export default memo(TextHeaderPreview)
