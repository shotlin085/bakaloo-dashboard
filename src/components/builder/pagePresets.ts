import type { SectionType, ThemeData, ThemeSections } from "@/types/theme.types"

/**
 * Full-page theme preset.
 *
 * Applying a preset:
 *   - "Apply Style Only" → merges `themeDataPatch` into the active theme's
 *     `theme_data.sections` and persists via `useUpdateTheme`. Sections are
 *     untouched. No Push Live.
 *   - "Replace Layout With Preset" → replaces `localSections` (in-memory only)
 *     with `recommendedSections`. Marks builder dirty. No Push Live.
 *
 * `recommendedSections` is a list of `{ section_type, config? }` entries that
 * the page-level handler converts into BuilderSections with temp ids.
 */
export interface PageThemePreset {
  id: string
  label: string
  description: string
  /** Partial patch over `ThemeData.sections` — all keys optional. */
  themeDataPatch: Partial<ThemeSections>
  /** Recommended starter section stack for "Replace Layout" action. */
  recommendedSections: Array<{
    section_type: SectionType
    config?: Record<string, unknown>
  }>
}

/**
 * Curated full-page presets.
 * `themeDataPatch` is intentionally `Partial<ThemeSections>` so old saved
 * `theme_data` documents that are missing newer fields still merge cleanly.
 */
export const PAGE_THEME_PRESETS: PageThemePreset[] = [
  {
    id: "clean-grocery",
    label: "Clean Grocery",
    description: "Light neutral skin with airy whitespace and Bakaloo blue.",
    themeDataPatch: {
      topBar: { backgroundColor: "#88D4FE", textColor: "#0F172A" },
      storeSelector: { backgroundColor: "#88D4FE", activeChipColor: "#B1EAFF" },
      categoryTabs: {
        visible: true,
        textColor: "#111827",
        indicatorColor: "#0EA5E9",
      },
      searchZone: {
        backgroundColor: "#FFFFFF",
        waveColor: "#88D4FE",
        searchHints: ["Lego", "Snacks", "Cold drinks"],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "fee_strip", config: { container_color: "#BFEFFF" } },
      { section_type: "round_category_icons" },
      { section_type: "trending_products", config: { limit: 8 } },
      {
        section_type: "category_product_grid",
        config: { columns: 2, card_shape: "rounded" },
      },
    ],
  },
  {
    id: "blink-quick-commerce",
    label: "Blink Quick Commerce",
    description: "Dark hero with high contrast for 10-minute delivery vibes.",
    themeDataPatch: {
      topBar: { backgroundColor: "#FFD400", textColor: "#0B0B14" },
      categoryTabs: {
        visible: true,
        textColor: "#0B0B14",
        indicatorColor: "#0B0B14",
      },
      searchZone: {
        backgroundColor: "#FFFFFF",
        waveColor: "#FFD400",
        searchHints: [],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#0B0B14", "#27272A"], height: 220 } },
      { section_type: "fee_strip", config: { container_color: "#FFD400" } },
      { section_type: "round_category_icons" },
      { section_type: "product_carousel", config: { card_style: "compact", auto_scroll: false } },
    ],
  },
  {
    id: "premium-white",
    label: "Premium White",
    description: "Editorial whitespace, ideal for premium grocers.",
    themeDataPatch: {
      topBar: { backgroundColor: "#FFFFFF", textColor: "#0F172A" },
      storeSelector: { backgroundColor: "#FFFFFF", activeChipColor: "#F4F6FA" },
      categoryTabs: {
        visible: true,
        textColor: "#0F172A",
        indicatorColor: "#1E293B",
      },
      searchZone: {
        backgroundColor: "#FFFFFF",
        waveColor: "#F1F5F9",
        searchHints: [],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#FFFFFF", "#F4F6FA"], height: 200 } },
      { section_type: "round_category_icons" },
      { section_type: "category_product_grid", config: { columns: 3, card_shape: "rounded" } },
      { section_type: "spacer", config: { height: 8 } },
    ],
  },
  {
    id: "fresh-green",
    label: "Fresh Green",
    description: "Outdoor-fresh greens for daily essentials and produce.",
    themeDataPatch: {
      topBar: { backgroundColor: "#D1FAE5", textColor: "#064E3B" },
      categoryTabs: {
        visible: true,
        textColor: "#064E3B",
        indicatorColor: "#059669",
      },
      searchZone: {
        backgroundColor: "#ECFDF5",
        waveColor: "#A7F3D0",
        searchHints: ["Spinach", "Onion", "Eggs"],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#A7F3D0", "#FFFFFF"], height: 200 } },
      { section_type: "fee_strip", config: { container_color: "#D1FAE5" } },
      { section_type: "round_category_icons" },
      { section_type: "category_product_grid", config: { columns: 2, card_shape: "rounded" } },
    ],
  },
  {
    id: "summer-deals",
    label: "Summer Deals",
    description: "Bright cool gradient for summer drink and snack pushes.",
    themeDataPatch: {
      topBar: { backgroundColor: "#80DEEA", textColor: "#003A45" },
      categoryTabs: {
        visible: true,
        textColor: "#003A45",
        indicatorColor: "#003A45",
      },
      searchZone: {
        backgroundColor: "#E0F7FA",
        waveColor: "#80DEEA",
        searchHints: ["cold drinks", "ice cream"],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#E0F7FA", "#80DEEA"], height: 220 } },
      { section_type: "promo_carousel" },
      { section_type: "category_product_grid", config: { columns: 2, card_shape: "rounded" } },
    ],
  },
  {
    id: "festival-sale",
    label: "Festival Sale",
    description: "Warm festival glow for Diwali, EID, Holi style sales.",
    themeDataPatch: {
      topBar: { backgroundColor: "#FFD8A8", textColor: "#7C2D12" },
      categoryTabs: {
        visible: true,
        textColor: "#7C2D12",
        indicatorColor: "#C2410C",
      },
      searchZone: {
        backgroundColor: "#FFF7ED",
        waveColor: "#FFD8A8",
        searchHints: ["dry fruits", "sweets"],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#FFF1E6", "#FFD8A8"], height: 220 } },
      { section_type: "seasonal_mosaic", config: { layout_variant: "hero_plus_four", container_color: "#FFF8E1" } },
      { section_type: "category_product_grid", config: { columns: 2, card_shape: "rounded" } },
    ],
  },
  {
    id: "cafe-mode",
    label: "Cafe Mode",
    description: "Warm cafe browns for cafe and coffee skins.",
    themeDataPatch: {
      topBar: { backgroundColor: "#92400E", textColor: "#FFFFFF" },
      categoryTabs: {
        visible: true,
        textColor: "#FFF7ED",
        indicatorColor: "#FED7AA",
      },
      searchZone: {
        backgroundColor: "#FFF7ED",
        waveColor: "#FED7AA",
        searchHints: ["coffee", "tea"],
        promoBoxImageUrl: null,
      },
    },
    recommendedSections: [
      { section_type: "animated_banner", config: { gradient: ["#92400E", "#B45309"], height: 220 } },
      { section_type: "round_category_icons" },
      { section_type: "product_carousel", config: { card_style: "premium", auto_scroll: false } },
    ],
  },
]

/**
 * Pure helper: returns a new `ThemeData` with `themeDataPatch` shallow-merged
 * over `theme_data.sections`. Each section field is replaced as a whole
 * (matching how `ChromeRegionEditor` writes back).
 */
export function applyPagePresetStyle(
  themeData: ThemeData,
  preset: PageThemePreset
): ThemeData {
  return {
    ...themeData,
    sections: mergeSections(themeData.sections, preset.themeDataPatch),
  }
}

function mergeSections(
  base: ThemeSections,
  patch: Partial<ThemeSections>
): ThemeSections {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      (base as Record<string, unknown>)[k]
    ) {
      out[k] = {
        ...((base as Record<string, unknown>)[k] as object),
        ...(v as object),
      }
    } else {
      out[k] = v
    }
  }
  return out as ThemeSections
}

/** Phase 3 starter templates surfaced when a tab has no sections yet. */
export const STARTER_TEMPLATES: Array<{
  id: string
  label: string
  description: string
  presetId: PageThemePreset["id"]
}> = [
  {
    id: "quick-commerce-home",
    label: "Quick Commerce Home",
    description: "Hero, fee strip, categories, and a trending shelf.",
    presetId: "blink-quick-commerce",
  },
  {
    id: "summer-campaign",
    label: "Summer Campaign",
    description: "Cool hero + promo carousel + product grid.",
    presetId: "summer-deals",
  },
  {
    id: "festival-grocery",
    label: "Festival Grocery",
    description: "Festival hero + mosaic + product grid.",
    presetId: "festival-sale",
  },
  {
    id: "cafe-landing",
    label: "Cafe Landing",
    description: "Warm cafe hero + categories + carousel.",
    presetId: "cafe-mode",
  },
  {
    id: "minimal-essentials",
    label: "Minimal Essentials",
    description: "Clean white skin with categories and grid.",
    presetId: "premium-white",
  },
]

export function getPagePresetById(id: string): PageThemePreset | undefined {
  return PAGE_THEME_PRESETS.find((p) => p.id === id)
}
