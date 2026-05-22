"use client"

/* eslint-disable @next/next/no-img-element */

import { memo, useEffect, useState } from "react"
import { Ticket, BadgePercent } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

const FALLBACK_ASPECT_RATIO = 336 / 74
const MIN_STRIP_HEIGHT = 60
const MAX_STRIP_HEIGHT = 96

function FeeStripPreview({
  section,
  isSelected,
  onClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const imageUrl = typeof config.image_url === "string" ? config.image_url : null
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : "#BFEFFF"
  const isBankOffer = section.section_type === "bank_offers"
  const bankOfferImages = Array.isArray(config.image_urls)
    ? (config.image_urls as string[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .slice(0, 10)
    : imageUrl
      ? [imageUrl]
      : []
  const [aspectRatio, setAspectRatio] = useState(FALLBACK_ASPECT_RATIO)
  const text = typeof config.text === "string" && config.text.trim()
    ? config.text.trim()
    : isBankOffer
    ? "10% Instant Bank Offer"
    : "₹0 Platform Fee • ₹0 Delivery Fee"
  const visible = config.visible !== false

  useEffect(() => {
    if (!imageUrl) {
      setAspectRatio(FALLBACK_ASPECT_RATIO)
      return
    }

    let cancelled = false
    const image = new window.Image()

    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return
      setAspectRatio(image.naturalWidth / image.naturalHeight)
    }

    image.onerror = () => {
      if (cancelled) return
      setAspectRatio(FALLBACK_ASPECT_RATIO)
    }

    image.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  if (!visible && !imageUrl) return null

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
      <div style={{ padding: isBankOffer ? "6px 5px 2px" : "0" }}>
        {isBankOffer && bankOfferImages.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              padding: "6px 12px 2px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {bankOfferImages.map((offerImage, index) => (
              <div
                key={`${section.id}-bank-offer-${index}`}
                style={{
                  flex: "0 0 336px",
                  height: 74,
                  overflow: "hidden",
                  borderRadius: 16,
                  background: "#f2f8ff",
                }}
              >
                <img
                  src={offerImage}
                  alt={`Bank Offer ${index + 1}`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "left center",
                  }}
                />
              </div>
            ))}
          </div>
        ) : imageUrl ? (
          <div
            style={{
              height: Math.min(
                MAX_STRIP_HEIGHT,
                Math.max(MIN_STRIP_HEIGHT, 430 / aspectRatio)
              ),
              width: "100%",
              overflow: "hidden",
              borderRadius: 0,
              background: containerColor,
            }}
          >
            <img
              src={imageUrl}
              alt="Strip"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </div>
        ) : (
          /* Exact Flutter match: #1C9A38 green, ticket icon, bold white text */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 16px",
              borderRadius: 14,
              background: isBankOffer
                ? "linear-gradient(135deg, #0f766e, #14b8a6)"
                : "#1C9A38",
              color: "#ffffff",
            }}
          >
            {isBankOffer ? (
              <BadgePercent size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            ) : (
              <Ticket size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {text}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

export default memo(FeeStripPreview)
