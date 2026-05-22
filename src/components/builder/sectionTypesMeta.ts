import type { LucideIcon } from "lucide-react"
import {
  BadgePercent,
  Circle,
  Columns,
  CreditCard,
  Grid3x3,
  Image,
  ImagePlus,
  LayoutGrid,
  Space,
  TrendingUp,
  Type,
} from "lucide-react"
import type { SectionType, ThemeStoreKey } from "@/types/theme.types"

export interface SectionTypeMeta {
  type: SectionType
  label: string
  icon: LucideIcon
  description: string
  maxPerTab: number
  defaultConfig: Record<string, unknown>
  accentClassName: string
  /** If defined, only available in these stores. If undefined, available in ALL stores. */
  storeKeys?: ThemeStoreKey[]
}

export const sectionTypesMeta: SectionTypeMeta[] = [
  {
    type: "animated_banner",
    label: "Animated Banner",
    icon: Image,
    description: "Top-of-tab hero banner with gradients, imagery, or motion.",
    maxPerTab: 2,
    defaultConfig: { gradient: ["#E8F5E9", "#C8E6C9"], height: 220 },
    accentClassName: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    type: "fee_strip",
    label: "Fee Strip",
    icon: BadgePercent,
    description: "Compact savings strip for fees, delivery, or promo messaging.",
    maxPerTab: 1,
    defaultConfig: { visible: true, container_color: "#BFEFFF" },
    accentClassName: "bg-lime-100 text-lime-700 border-lime-200",
  },
  {
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic",
    icon: LayoutGrid,
    description: "Promotional tile layout for campaigns, festivals, and collections.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "hero_plus_four",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    type: "round_category_icons",
    label: "Category Icons",
    icon: Circle,
    description: "Horizontally scrolling round category rail with optional labels.",
    maxPerTab: 2,
    defaultConfig: { icon_size: 64, gap: 12, show_labels: true },
    accentClassName: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  {
    type: "category_product_grid",
    label: "Product Grid",
    icon: Grid3x3,
    description: "Multi-column product block for category-led merchandising.",
    maxPerTab: 5,
    defaultConfig: { columns: 3, card_shape: "rounded" },
    accentClassName: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    type: "product_carousel",
    label: "Product Carousel",
    icon: Columns,
    description: "Scrollable strip of product cards for focused assortments.",
    maxPerTab: 5,
    defaultConfig: { card_style: "standard", auto_scroll: false },
    accentClassName: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    type: "trending_products",
    label: "Trending Products",
    icon: TrendingUp,
    description: "Single trending shelf for nearby bestsellers and demand spikes.",
    maxPerTab: 1,
    defaultConfig: { limit: 6 },
    accentClassName: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    type: "promo_carousel",
    label: "Promo Carousel",
    icon: Image,
    description: "Sliding promo banner carousel for editorial or seasonal campaigns.",
    maxPerTab: 3,
    defaultConfig: {
      auto_scroll_speed: 3000,
      aspect_ratio: "16:9",
      border_radius: 12,
    },
    accentClassName: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  },
  {
    type: "bank_offers",
    label: "Bank Offers",
    icon: CreditCard,
    description: "Payments strip for bank offers, cashback, and card promotions.",
    maxPerTab: 1,
    defaultConfig: { visible: true, image_urls: [] },
    accentClassName: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    type: "custom_banner",
    label: "Custom Banner",
    icon: ImagePlus,
    description: "Manual banner block for one-off campaigns and editorial moments.",
    maxPerTab: 5,
    defaultConfig: { border_radius: 12 },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    type: "text_header",
    label: "Text Header",
    icon: Type,
    description: "Simple text heading to separate groups and frame content.",
    maxPerTab: 10,
    defaultConfig: {
      text: "Section Title",
      font_size: 18,
      color: "#000000",
      alignment: "left",
    },
    accentClassName: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    type: "arched_product_showcase",
    label: "Arched Showcase",
    icon: Columns,
    description: "Puffy arch-top container with horizontal product cards and See All CTA.",
    maxPerTab: 3,
    defaultConfig: {
      // ── Zone 1: Title ──
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",

      // ── Zone 2: Banner ──
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },

      // ── Zone 3: Category Strip ──
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },

      // ── Zone 4: Products ──
      product_layout: "horizontal_scroll",
      card_shape: "arch",
      container_color: "#FDE7C4",
      bg_gradient: null,
      box_gradient: null,
      arch_height: 14,
      corner_radius: 24,
      limit: 10,
    },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: Space,
    description: "Breathing room between sections for rhythm and visual pacing.",
    maxPerTab: 10,
    defaultConfig: { height: 16 },
    accentClassName: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
]

export const sectionTypeMetaByType = Object.fromEntries(
  sectionTypesMeta.map((meta) => [meta.type, meta])
) as Record<SectionType, SectionTypeMeta>

export function getSectionTypeMeta(sectionType: SectionType) {
  return sectionTypeMetaByType[sectionType]
}

export function cloneSectionDefaultConfig(
  source: SectionType | SectionTypeMeta
): Record<string, unknown> {
  const meta = typeof source === "string" ? getSectionTypeMeta(source) : source
  return JSON.parse(JSON.stringify(meta.defaultConfig)) as Record<string, unknown>
}
