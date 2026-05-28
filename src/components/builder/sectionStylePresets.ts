import type { SectionType } from "@/types/theme.types"

/**
 * Section style preset — a named patch to merge into a section's `config`.
 * Applying a preset never replaces the entire config (backward compatible);
 * it deep-merges the patch over the current config so unrelated keys (data
 * binding, custom titles, etc.) are preserved.
 */
export interface SectionStylePreset {
  id: string
  label: string
  description?: string
  /** Partial config patch merged over existing config. */
  patch: Record<string, unknown>
}

/** Map of section type → curated style presets. */
export const SECTION_STYLE_PRESETS: Partial<
  Record<SectionType, SectionStylePreset[]>
> = {
  animated_banner: [
    {
      id: "clean-white",
      label: "Clean White",
      description: "Soft neutral gradient with airy headline space.",
      patch: { gradient: ["#FFFFFF", "#F4F6FA"], height: 200 },
    },
    {
      id: "blue-premium",
      label: "Blue Premium",
      description: "Deep blue Quick-Commerce hero.",
      patch: { gradient: ["#0F172A", "#1E40AF"], height: 220 },
    },
    {
      id: "summer-cool",
      label: "Summer Cool",
      description: "Cool gradient for hot-weather campaigns.",
      patch: { gradient: ["#E0F7FA", "#80DEEA"], height: 220 },
    },
    {
      id: "festival-glow",
      label: "Festival Glow",
      description: "Warm gradient for festival sales.",
      patch: { gradient: ["#FFF1E6", "#FFD8A8"], height: 220 },
    },
    {
      id: "dark-luxury",
      label: "Dark Luxury",
      description: "Premium dark hero for night-mode skins.",
      patch: { gradient: ["#0B0B14", "#27272A"], height: 240 },
    },
  ],
  product_carousel: [
    {
      id: "minimal-cards",
      label: "Minimal Cards",
      patch: { card_style: "standard", auto_scroll: false },
    },
    {
      id: "rounded-premium",
      label: "Rounded Premium",
      patch: { card_style: "premium", auto_scroll: false },
    },
    {
      id: "compact-commerce",
      label: "Compact Commerce",
      patch: { card_style: "compact", auto_scroll: false },
    },
    {
      id: "big-image-cards",
      label: "Big Image Cards",
      patch: { card_style: "big_image", auto_scroll: true },
    },
  ],
  category_product_grid: [
    {
      id: "grid-2",
      label: "2-up Grid",
      patch: { columns: 2, card_shape: "rounded" },
    },
    {
      id: "grid-3",
      label: "3-up Grid",
      patch: { columns: 3, card_shape: "rounded" },
    },
    {
      id: "compact",
      label: "Compact",
      patch: { columns: 4, card_shape: "square" },
    },
  ],
  round_category_icons: [
    {
      id: "icon-pills",
      label: "Icon Pills",
      patch: { icon_size: 56, gap: 14, show_labels: true },
    },
    {
      id: "circle-icons",
      label: "Circle Icons",
      patch: { icon_size: 64, gap: 12, show_labels: true },
    },
    {
      id: "minimal-text",
      label: "Minimal Text",
      patch: { icon_size: 40, gap: 10, show_labels: true },
    },
    {
      id: "underline-tabs",
      label: "Underline Tabs",
      patch: { icon_size: 48, gap: 16, show_labels: true },
    },
  ],
  fee_strip: [
    {
      id: "light-blue",
      label: "Light Blue",
      patch: { container_color: "#BFEFFF" },
    },
    {
      id: "green-savings",
      label: "Green Savings",
      patch: { container_color: "#D1FAE5" },
    },
    {
      id: "coupon-yellow",
      label: "Coupon Yellow",
      patch: { container_color: "#FEF9C3" },
    },
    {
      id: "premium-white",
      label: "Premium White",
      patch: { container_color: "#FFFFFF" },
    },
  ],
  arched_product_showcase: [
    {
      id: "warm",
      label: "Warm",
      patch: { container_color: "#FDE7C4", arch_height: 14, corner_radius: 24 },
    },
    {
      id: "fresh-mint",
      label: "Fresh Mint",
      patch: { container_color: "#D1FAE5", arch_height: 12, corner_radius: 20 },
    },
    {
      id: "bold-blue",
      label: "Bold Blue",
      patch: { container_color: "#DBEAFE", arch_height: 16, corner_radius: 28 },
    },
  ],
  text_header: [
    {
      id: "left-bold",
      label: "Left Bold",
      patch: { font_size: 18, alignment: "left", color: "#0F172A" },
    },
    {
      id: "centered-soft",
      label: "Centered Soft",
      patch: { font_size: 16, alignment: "center", color: "#334155" },
    },
    {
      id: "campaign-pop",
      label: "Campaign Pop",
      patch: { font_size: 22, alignment: "left", color: "#1D4ED8" },
    },
  ],
}

/**
 * Pure helper: return the merged config after applying a preset patch.
 * Deep-merges plain objects; arrays and primitives are replaced.
 */
export function applyStylePreset(
  config: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return deepMerge(config, patch)
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      base[k] !== null &&
      typeof base[k] === "object" &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(
        base[k] as Record<string, unknown>,
        v as Record<string, unknown>
      )
    } else {
      out[k] = v
    }
  }
  return out as T
}

export function getStylePresets(
  sectionType: SectionType
): SectionStylePreset[] {
  return SECTION_STYLE_PRESETS[sectionType] ?? []
}
