"use client"

/**
 * ProductMetadataFields — group of fields that drive the reference
 * grocery product card UI (veg marker, imported tag, custom badges,
 * delivery time). Pure presentational; caller supplies values + onChange.
 *
 * Maps directly to the Phase 1 backend `products` columns:
 *   - food_type             VARCHAR(20)  VEG/NON_VEG/EGG/NONE
 *   - origin_tag            VARCHAR(20)  IMPORTED/LOCAL/NONE
 *   - custom_badges         JSONB        []  (max ~6 short labels)
 *   - display_delivery_minutes INTEGER NULL 1-180
 */

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FoodType, OriginTag } from "@/types"
import { FOOD_TYPES, ORIGIN_TAGS } from "@/types"

const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  NONE: "Not specified",
  VEG: "Vegetarian",
  NON_VEG: "Non-vegetarian",
  EGG: "Egg",
}

const ORIGIN_LABELS: Record<OriginTag, string> = {
  NONE: "Not specified",
  LOCAL: "Local",
  IMPORTED: "Imported",
}

const MAX_BADGES = 6
const MAX_BADGE_LEN = 50

interface ProductMetadataFieldsProps {
  foodType: FoodType
  originTag: OriginTag
  customBadges: string[]
  displayDeliveryMinutes: string
  onFoodTypeChange: (value: FoodType) => void
  onOriginTagChange: (value: OriginTag) => void
  onCustomBadgesChange: (value: string[]) => void
  onDisplayDeliveryMinutesChange: (value: string) => void
  disabled?: boolean
}

export function ProductMetadataFields({
  foodType,
  originTag,
  customBadges,
  displayDeliveryMinutes,
  onFoodTypeChange,
  onOriginTagChange,
  onCustomBadgesChange,
  onDisplayDeliveryMinutesChange,
  disabled,
}: ProductMetadataFieldsProps) {
  const [badgeInput, setBadgeInput] = useState("")

  function addBadge() {
    const trimmed = badgeInput.trim().slice(0, MAX_BADGE_LEN)
    if (!trimmed) return
    if (customBadges.includes(trimmed)) {
      setBadgeInput("")
      return
    }
    if (customBadges.length >= MAX_BADGES) return
    onCustomBadgesChange([...customBadges, trimmed])
    setBadgeInput("")
  }

  function removeBadge(badge: string) {
    onCustomBadgesChange(customBadges.filter((b) => b !== badge))
  }

  function handleBadgeKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addBadge()
    }
  }

  function handleDeliveryChange(value: string) {
    if (value === "") {
      onDisplayDeliveryMinutesChange("")
      return
    }
    const num = Number(value)
    if (!Number.isFinite(num)) return
    if (num < 1 || num > 180) {
      onDisplayDeliveryMinutesChange(String(Math.max(1, Math.min(180, num))))
      return
    }
    onDisplayDeliveryMinutesChange(value)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Food Type</Label>
          <Select
            value={foodType}
            onValueChange={(v) => onFoodTypeChange(v as FoodType)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOOD_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {FOOD_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Shown as a veg/non-veg marker on mobile product cards.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Origin</Label>
          <Select
            value={originTag}
            onValueChange={(v) => onOriginTagChange(v as OriginTag)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_TAGS.map((value) => (
                <SelectItem key={value} value={value}>
                  {ORIGIN_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Adds an &quot;Imported&quot; or &quot;Local&quot; tag on the product card.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Custom Badges</Label>
        <div className="flex flex-wrap gap-2">
          {customBadges.map((badge) => (
            <Badge
              key={badge}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {badge}
              <button
                type="button"
                onClick={() => removeBadge(badge)}
                disabled={disabled}
                className="ml-1 rounded hover:bg-muted-foreground/20"
                aria-label={`Remove badge ${badge}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {customBadges.length < MAX_BADGES && (
            <Input
              value={badgeInput}
              onChange={(e) => setBadgeInput(e.target.value)}
              onKeyDown={handleBadgeKey}
              onBlur={addBadge}
              placeholder="Add badge (Bestseller, Organic…)"
              className="h-8 w-48"
              disabled={disabled}
              maxLength={MAX_BADGE_LEN}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add. Max {MAX_BADGES} badges, {MAX_BADGE_LEN}{" "}
          chars each. Examples: Bestseller, New, Premium, Value Pack.
        </p>
      </div>

      <div className="space-y-2 sm:max-w-xs">
        <Label>Display Delivery Time (minutes)</Label>
        <Input
          type="number"
          min={1}
          max={180}
          value={displayDeliveryMinutes}
          onChange={(e) => handleDeliveryChange(e.target.value)}
          placeholder="10"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Shown on mobile product cards. Range 1–180 minutes.
        </p>
      </div>
    </div>
  )
}
