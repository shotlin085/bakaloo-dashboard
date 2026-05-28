/**
 * Chrome Region — selectable areas of the mobile skin that map to ThemeData fields.
 *
 * The mobile preview chrome (top bar, search bar, category tabs, bottom nav, etc.)
 * is rendered from the parent ThemeData entity (separate from per-tab sections).
 * Each region maps to one or more `theme_data.sections.*` fields so the
 * ChromeRegionEditor can deep-merge updates and persist them via useUpdateTheme.
 *
 * Designed to be additive — never breaks existing ThemeData consumers.
 */

export type ChromeRegion =
  | "top_bar"
  | "search_bar"
  | "category_tabs"
  | "bottom_nav"
  | "store_chips"

export interface ChromeRegionMeta {
  region: ChromeRegion
  label: string
  description: string
}

export const CHROME_REGION_META: Record<ChromeRegion, ChromeRegionMeta> = {
  top_bar: {
    region: "top_bar",
    label: "Top Bar",
    description: "Status bar, delivery time, address line, profile icon.",
  },
  search_bar: {
    region: "search_bar",
    label: "Search Bar",
    description: "Search field, hints, and the right-side promo box.",
  },
  category_tabs: {
    region: "category_tabs",
    label: "Category Tabs",
    description: "Horizontal category icons / labels under the search bar.",
  },
  bottom_nav: {
    region: "bottom_nav",
    label: "Bottom Nav",
    description: "Persistent bottom navigation dock (Home, Cart, Categories, Profile).",
  },
  store_chips: {
    region: "store_chips",
    label: "Store Chips",
    description: "Top store selector chip strip.",
  },
}

export function getChromeRegionMeta(region: ChromeRegion): ChromeRegionMeta {
  return CHROME_REGION_META[region]
}
