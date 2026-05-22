"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeGradientPicker } from "@/components/themes/ThemeGradientPicker"
import AnimationPicker from "./AnimationPicker"
import LayoutVariantPicker from "./LayoutVariantPicker"

interface MosaicEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

function getHeroGradient(config: Record<string, unknown>): [string, string] {
  const gradient = Array.isArray(config.hero_gradient)
    ? config.hero_gradient.filter((entry): entry is string => typeof entry === "string")
    : []

  return [gradient[0] ?? "#FFD166", gradient[1] ?? "#F97316"]
}

export default function MosaicEditor({ config, onChange }: MosaicEditorProps) {
  const heroGradient = getHeroGradient(config)
  const layoutVariant =
    typeof config.layout_variant === "string"
      ? config.layout_variant
      : "hero_plus_four"
  const containerColor =
    typeof config.container_color === "string" ? config.container_color : "#FFF8E1"
  const heroTitle =
    typeof config.hero_title === "string" ? config.hero_title : "Fresh picks"
  const heroBadgeText =
    typeof config.hero_badge_text === "string"
      ? config.hero_badge_text
      : "Limited time"

  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({
      ...config,
      ...patch,
    })
  }

  return (
    <div className="space-y-6">
      <LayoutVariantPicker
        value={layoutVariant}
        onChange={(variant) => patchConfig({ layout_variant: variant })}
      />

      <ThemeColorPicker
        label="Container Color"
        value={containerColor}
        onChange={(value) => patchConfig({ container_color: value })}
      />

      <div className="space-y-2">
        <Label htmlFor="mosaic-hero-title">Hero Tile Title</Label>
        <Input
          id="mosaic-hero-title"
          value={heroTitle}
          onChange={(event) => patchConfig({ hero_title: event.target.value })}
          placeholder="Fresh picks"
        />
      </div>

      <ThemeGradientPicker
        label="Hero Tile Gradient"
        value={heroGradient}
        onChange={(gradient) => patchConfig({ hero_gradient: gradient })}
      />

      <div className="space-y-2">
        <Label htmlFor="mosaic-badge-text">Hero Badge Text</Label>
        <Input
          id="mosaic-badge-text"
          value={heroBadgeText}
          onChange={(event) => patchConfig({ hero_badge_text: event.target.value })}
          placeholder="Limited time"
        />
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patchConfig({ animation: value })}
      />
    </div>
  )
}
