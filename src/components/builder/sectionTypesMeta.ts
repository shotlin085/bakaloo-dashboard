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

/**
 * Section template group — drives Section Library filtering and grouping.
 *
 * Phase 3: every section type is now classified into one or more groups.
 * Existing consumers that ignore `group` continue to work (default = "content").
 */
export type SectionTemplateGroup =
  | "header"
  | "hero"
  | "offers"
  | "products"
  | "categories"
  | "content"
  | "seasonal"

/** Quick-filter tags surfaced as chips above the library list. */
export const QUICK_TAGS = [
  "Bestseller",
  "Festival",
  "Summer",
  "Deals",
  "Fresh",
  "Cafe",
] as const
export type QuickTag = (typeof QUICK_TAGS)[number]

export interface SectionTypeMeta {
  /**
   * Unique library-card identity — NOT necessarily the same as `type`.
   * Several cards can share one `type` (e.g. "Seasonal Mosaic — 2x2 Grid"
   * and "Seasonal Mosaic — Single Hero" both add a `seasonal_mosaic`
   * section, just pre-filled with a different `defaultConfig`) so the
   * library can offer more starting points without needing a new
   * mobile-app-recognized section type for each one. Always use `id` for
   * React keys / DnD ids / anything that must be unique per card; use
   * `type` for what actually gets persisted and rendered.
   */
  id: string
  type: SectionType
  label: string
  icon: LucideIcon
  description: string
  maxPerTab: number
  defaultConfig: Record<string, unknown>
  accentClassName: string
  /** If defined, only available in these stores. If undefined, available in ALL stores. */
  storeKeys?: ThemeStoreKey[]
  /** Phase 3: template group used for Section Library grouping/filtering. */
  group?: SectionTemplateGroup
  /** Phase 3: quick-filter tags ("Bestseller", "Festival", etc.) */
  tags?: QuickTag[]
  /** Phase 3: which dynamic data sources this section type can render. */
  dataSources?: Array<
    | "category"
    | "manual_products"
    | "tags"
    | "offers"
    | "recently_added"
    | "bestsellers"
    | "discounted"
    | "low_price"
    | "static"
  >
  /** Phase 3: short use-case suggestion shown in the library card. */
  useCase?: string
}

export const sectionTypesMeta: SectionTypeMeta[] = [
  {
    id: "animated_banner",
    type: "animated_banner",
    label: "Animated Banner",
    icon: Image,
    description: "Top-of-tab hero banner with gradients, imagery, or motion.",
    maxPerTab: 2,
    defaultConfig: { gradient: ["#E8F5E9", "#C8E6C9"], height: 220 },
    accentClassName: "bg-emerald-100 text-emerald-700 border-emerald-200",
    group: "hero",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Open the page with motion or a campaign hero.",
  },
  {
    id: "animated_banner__tall",
    type: "animated_banner",
    label: "Animated Banner — Tall",
    icon: Image,
    description: "Same top-of-tab hero banner, taller for more visual impact.",
    maxPerTab: 2,
    defaultConfig: { gradient: ["#E8F5E9", "#C8E6C9"], height: 280 },
    accentClassName: "bg-emerald-100 text-emerald-700 border-emerald-200",
    group: "hero",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "A bigger, more dominant opening hero.",
  },
  {
    id: "fee_strip",
    type: "fee_strip",
    label: "Fee Strip",
    icon: BadgePercent,
    description: "Compact savings strip for fees, delivery, or promo messaging.",
    maxPerTab: 1,
    defaultConfig: { visible: true, container_color: "#BFEFFF" },
    accentClassName: "bg-lime-100 text-lime-700 border-lime-200",
    group: "offers",
    tags: ["Deals", "Fresh"],
    dataSources: ["static"],
    useCase: "Highlight free delivery or zero-fee promos.",
  },

  // ── Seasonal Mosaic — one Flutter widget (SeasonalDealMosaic), 5 real
  // layout_variant values it already knows how to render. Each card below
  // is the same `type`, just a different starting layout_variant.
  {
    id: "seasonal_mosaic",
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic — Hero + Four",
    icon: LayoutGrid,
    description: "Big hero tile plus four supporting tiles for campaigns and collections.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "hero_plus_four",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
    group: "seasonal",
    tags: ["Festival", "Summer", "Deals"],
    dataSources: ["category", "manual_products"],
    useCase: "Launch a festival or seasonal collection block.",
  },
  {
    id: "seasonal_mosaic__two_by_three",
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic — 2×3 Grid",
    icon: LayoutGrid,
    description: "Even 2×3 tile grid — no single dominant hero tile.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "two_by_three",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
    group: "seasonal",
    tags: ["Festival", "Deals"],
    dataSources: ["category", "manual_products"],
    useCase: "Six evenly-weighted collection tiles.",
  },
  {
    id: "seasonal_mosaic__single_hero",
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic — Single Hero",
    icon: LayoutGrid,
    description: "One full-width hero tile, no supporting tiles.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "single_hero",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
    group: "seasonal",
    tags: ["Festival", "Summer"],
    dataSources: ["category", "manual_products"],
    useCase: "One standalone campaign banner-tile.",
  },
  {
    id: "seasonal_mosaic__two_by_two",
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic — 2×2 Grid",
    icon: LayoutGrid,
    description: "Four evenly-sized tiles in a compact square grid.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "two_by_two",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
    group: "seasonal",
    tags: ["Festival", "Deals"],
    dataSources: ["category", "manual_products"],
    useCase: "Four collection tiles, compact footprint.",
  },
  {
    id: "seasonal_mosaic__stacked_banners",
    type: "seasonal_mosaic",
    label: "Seasonal Mosaic — Stacked Banners",
    icon: LayoutGrid,
    description: "Full-width banners stacked vertically, one per campaign.",
    maxPerTab: 3,
    defaultConfig: {
      layout_variant: "stacked_banners",
      container_color: "#FFF8E1",
    },
    accentClassName: "bg-amber-100 text-amber-700 border-amber-200",
    group: "seasonal",
    tags: ["Festival", "Summer"],
    dataSources: ["category", "manual_products"],
    useCase: "A short vertical run of full-width campaign banners.",
  },

  {
    id: "round_category_icons",
    type: "round_category_icons",
    label: "Category Icons",
    icon: Circle,
    description: "Horizontally scrolling round category rail with optional labels.",
    maxPerTab: 2,
    defaultConfig: { icon_size: 64, gap: 12, show_labels: true },
    accentClassName: "bg-cyan-100 text-cyan-700 border-cyan-200",
    group: "categories",
    tags: ["Fresh"],
    dataSources: ["category"],
    useCase: "Quick category navigation under the search bar.",
  },
  {
    id: "round_category_icons__compact",
    type: "round_category_icons",
    label: "Category Icons — Compact",
    icon: Circle,
    description: "Smaller, tighter icon rail — fits more categories on screen at once.",
    maxPerTab: 2,
    defaultConfig: { icon_size: 48, gap: 8, show_labels: true },
    accentClassName: "bg-cyan-100 text-cyan-700 border-cyan-200",
    group: "categories",
    tags: ["Fresh"],
    dataSources: ["category"],
    useCase: "A denser category rail for long category lists.",
  },
  {
    id: "round_category_icons__no_labels",
    type: "round_category_icons",
    label: "Category Icons — No Labels",
    icon: Circle,
    description: "Icon-only rail with no text labels beneath each category.",
    maxPerTab: 2,
    defaultConfig: { icon_size: 64, gap: 12, show_labels: false },
    accentClassName: "bg-cyan-100 text-cyan-700 border-cyan-200",
    group: "categories",
    tags: ["Fresh"],
    dataSources: ["category"],
    useCase: "A cleaner, icon-only category rail.",
  },

  // ── Product Grid — same widget, `columns` (2 or 3) and
  // `product_card_style` (QUICK_COMMERCE_COMPACT / BAKALOO_LEGACY_CLEAN)
  // are both already read by the Flutter renderer.
  {
    id: "category_product_grid",
    type: "category_product_grid",
    label: "Product Grid — 3 Column",
    icon: Grid3x3,
    description: "Multi-column product block for category-led merchandising.",
    maxPerTab: 20,
    defaultConfig: { columns: 3, card_shape: "rounded" },
    accentClassName: "bg-sky-100 text-sky-700 border-sky-200",
    group: "products",
    tags: ["Bestseller", "Fresh"],
    dataSources: ["category", "manual_products", "tags"],
    useCase: "Browse products by category or chosen list.",
  },
  {
    id: "category_product_grid__2col",
    type: "category_product_grid",
    label: "Product Grid — 2 Column",
    icon: Grid3x3,
    description: "Wider two-column cards — more product detail per row.",
    maxPerTab: 20,
    defaultConfig: { columns: 2, card_shape: "rounded" },
    accentClassName: "bg-sky-100 text-sky-700 border-sky-200",
    group: "products",
    tags: ["Bestseller", "Fresh"],
    dataSources: ["category", "manual_products", "tags"],
    useCase: "Fewer, larger product cards per row.",
  },
  {
    id: "category_product_grid__classic",
    type: "category_product_grid",
    label: "Product Grid — Classic Cards",
    icon: Grid3x3,
    description: "3-column grid using the classic (pre-quick-commerce) card style.",
    maxPerTab: 20,
    defaultConfig: {
      columns: 3,
      card_shape: "rounded",
      product_card_style: "BAKALOO_LEGACY_CLEAN",
    },
    accentClassName: "bg-sky-100 text-sky-700 border-sky-200",
    group: "products",
    tags: ["Bestseller", "Fresh"],
    dataSources: ["category", "manual_products", "tags"],
    useCase: "Same grid, classic card artwork/typography.",
  },

  {
    id: "product_carousel",
    type: "product_carousel",
    label: "Product Carousel",
    icon: Columns,
    description: "Scrollable strip of product cards for focused assortments.",
    maxPerTab: 20,
    defaultConfig: { card_style: "standard", auto_scroll: false },
    accentClassName: "bg-violet-100 text-violet-700 border-violet-200",
    group: "products",
    tags: ["Bestseller", "Deals"],
    dataSources: ["category", "manual_products", "bestsellers", "discounted"],
    useCase: "Spotlight a focused product strip.",
  },
  {
    id: "product_carousel__classic",
    type: "product_carousel",
    label: "Product Carousel — Classic Cards",
    icon: Columns,
    description: "Same scrollable strip using the classic card style.",
    maxPerTab: 20,
    defaultConfig: {
      card_style: "standard",
      auto_scroll: false,
      product_card_style: "BAKALOO_LEGACY_CLEAN",
    },
    accentClassName: "bg-violet-100 text-violet-700 border-violet-200",
    group: "products",
    tags: ["Bestseller", "Deals"],
    dataSources: ["category", "manual_products", "bestsellers", "discounted"],
    useCase: "Focused product strip, classic card artwork.",
  },

  {
    id: "trending_products",
    type: "trending_products",
    label: "Trending Products",
    icon: TrendingUp,
    description: "Single trending shelf for nearby bestsellers and demand spikes.",
    maxPerTab: 1,
    defaultConfig: { limit: 6 },
    accentClassName: "bg-rose-100 text-rose-700 border-rose-200",
    group: "products",
    tags: ["Bestseller"],
    dataSources: ["bestsellers", "recently_added"],
    useCase: "Show the most-bought items near the user.",
  },
  {
    id: "promo_carousel",
    type: "promo_carousel",
    label: "Promo Carousel",
    icon: Image,
    description: "Sliding promo banner carousel for editorial or seasonal campaigns.",
    maxPerTab: 3,
    defaultConfig: {
      banner_source: "system",
      auto_scroll_speed: 3000,
      aspect_ratio: "16:9",
      border_radius: 12,
      images: [],
    },
    accentClassName: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    group: "hero",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Editorial campaign carousel between sections.",
  },
  {
    id: "promo_carousel__square",
    type: "promo_carousel",
    label: "Promo Carousel — Square",
    icon: Image,
    description: "Same sliding carousel with a square (1:1) aspect ratio instead of wide.",
    maxPerTab: 3,
    defaultConfig: {
      banner_source: "system",
      auto_scroll_speed: 3000,
      aspect_ratio: "1:1",
      border_radius: 16,
      images: [],
    },
    accentClassName: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    group: "hero",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Square-format campaign carousel.",
  },
  {
    id: "promo_carousel__portrait",
    type: "promo_carousel",
    label: "Promo Carousel — Portrait",
    icon: Image,
    description: "Same sliding carousel with a tall portrait (4:5) aspect ratio.",
    maxPerTab: 3,
    defaultConfig: {
      banner_source: "system",
      auto_scroll_speed: 3000,
      aspect_ratio: "4:5",
      border_radius: 16,
      images: [],
    },
    accentClassName: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    group: "hero",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Portrait/story-style campaign carousel.",
  },
  {
    id: "bank_offers",
    type: "bank_offers",
    label: "Bank Offers",
    icon: CreditCard,
    description: "Payments strip for bank offers, cashback, and card promotions.",
    maxPerTab: 1,
    defaultConfig: { visible: true, image_urls: [] },
    accentClassName: "bg-teal-100 text-teal-700 border-teal-200",
    group: "offers",
    tags: ["Deals"],
    dataSources: ["offers", "static"],
    useCase: "Show bank/card-level cashback offers.",
  },
  {
    id: "custom_banner",
    type: "custom_banner",
    label: "Custom Banner",
    icon: ImagePlus,
    description: "Manual banner block for one-off campaigns and editorial moments.",
    maxPerTab: 5,
    defaultConfig: { border_radius: 12 },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "content",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Drop a single image-driven storytelling block.",
  },
  {
    id: "custom_banner__square",
    type: "custom_banner",
    label: "Custom Banner — Square",
    icon: ImagePlus,
    description: "Same banner block, pre-set to a square (1:1) crop.",
    maxPerTab: 5,
    defaultConfig: { border_radius: 16, aspect_ratio: "1:1" },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "content",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "Square storytelling block — good for product close-ups.",
  },
  {
    id: "custom_banner__wide",
    type: "custom_banner",
    label: "Custom Banner — Wide",
    icon: ImagePlus,
    description: "Same banner block, pre-set to an extra-wide (21:9) cinematic crop.",
    maxPerTab: 5,
    defaultConfig: { border_radius: 12, aspect_ratio: "21:9" },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "content",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "A slim, wide cinematic banner strip.",
  },
  {
    id: "custom_banner__portrait",
    type: "custom_banner",
    label: "Custom Banner — Portrait",
    icon: ImagePlus,
    description: "Same banner block, pre-set to a tall portrait (4:5) crop.",
    maxPerTab: 5,
    defaultConfig: { border_radius: 16, aspect_ratio: "4:5" },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "content",
    tags: ["Festival", "Summer"],
    dataSources: ["static"],
    useCase: "A tall, story-style storytelling block.",
  },
  {
    id: "text_header",
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
    group: "content",
    dataSources: ["static"],
    useCase: "Caption upcoming product/category groups.",
  },
  {
    id: "text_header__centered",
    type: "text_header",
    label: "Text Header — Centered",
    icon: Type,
    description: "Same text heading, center-aligned and slightly larger.",
    maxPerTab: 10,
    defaultConfig: {
      text: "Section Title",
      font_size: 22,
      color: "#000000",
      alignment: "center",
    },
    accentClassName: "bg-slate-100 text-slate-700 border-slate-200",
    group: "content",
    dataSources: ["static"],
    useCase: "A centered title for a standalone block.",
  },

  // ── Arched Showcase — one Flutter widget, 5 real product_layout values
  // (horizontal_scroll is the default/fallback; the other 4 are explicit
  // cases in buildArchedProductLayout).
  {
    id: "arched_product_showcase",
    type: "arched_product_showcase",
    label: "Arched Showcase — Horizontal Scroll",
    icon: Columns,
    description: "Puffy arch-top container with horizontal product cards and See All CTA.",
    maxPerTab: 3,
    defaultConfig: {
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },
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
    group: "products",
    tags: ["Bestseller", "Festival"],
    dataSources: ["category", "manual_products", "bestsellers"],
    useCase: "Premium curated showcase for top categories.",
  },
  {
    id: "arched_product_showcase__grid2col",
    type: "arched_product_showcase",
    label: "Arched Showcase — 2 Col Grid",
    icon: Columns,
    description: "Same arch-top container, products laid out as a 2-column grid.",
    maxPerTab: 3,
    defaultConfig: {
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },
      product_layout: "grid_2col",
      card_shape: "arch",
      container_color: "#FDE7C4",
      bg_gradient: null,
      box_gradient: null,
      arch_height: 14,
      corner_radius: 24,
      limit: 10,
    },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "products",
    tags: ["Bestseller", "Festival"],
    dataSources: ["category", "manual_products", "bestsellers"],
    useCase: "Curated showcase, 2-column grid layout.",
  },
  {
    id: "arched_product_showcase__grid3col",
    type: "arched_product_showcase",
    label: "Arched Showcase — 3 Col Grid",
    icon: Columns,
    description: "Same arch-top container, products laid out as a 3-column grid.",
    maxPerTab: 3,
    defaultConfig: {
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },
      product_layout: "grid_3col",
      card_shape: "arch",
      container_color: "#FDE7C4",
      bg_gradient: null,
      box_gradient: null,
      arch_height: 14,
      corner_radius: 24,
      limit: 10,
    },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "products",
    tags: ["Bestseller", "Festival"],
    dataSources: ["category", "manual_products", "bestsellers"],
    useCase: "Curated showcase, 3-column grid layout.",
  },
  {
    id: "arched_product_showcase__heroplusgrid",
    type: "arched_product_showcase",
    label: "Arched Showcase — Hero + Grid",
    icon: Columns,
    description: "Same arch-top container with one hero product plus a supporting grid.",
    maxPerTab: 3,
    defaultConfig: {
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },
      product_layout: "hero_plus_grid",
      card_shape: "arch",
      container_color: "#FDE7C4",
      bg_gradient: null,
      box_gradient: null,
      arch_height: 14,
      corner_radius: 24,
      limit: 10,
    },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "products",
    tags: ["Bestseller", "Festival"],
    dataSources: ["category", "manual_products", "bestsellers"],
    useCase: "One hero product plus a supporting product grid.",
  },
  {
    id: "arched_product_showcase__stacked",
    type: "arched_product_showcase",
    label: "Arched Showcase — Stacked Cards",
    icon: Columns,
    description: "Same arch-top container with products stacked as full-width cards.",
    maxPerTab: 3,
    defaultConfig: {
      title: "Top Picks",
      show_title: true,
      title_color: "#1A1A1A",
      banner: {
        enabled: false,
        content_source: "lottie",
        lottie_url: null,
        image_url: null,
        height: 120,
        gradient: ["#E8F5E9", "#C8E6C9"],
      },
      category_strip: {
        enabled: false,
        items: [],
        icon_size: 56,
        show_labels: true,
      },
      product_layout: "stacked_cards",
      card_shape: "arch",
      container_color: "#FDE7C4",
      bg_gradient: null,
      box_gradient: null,
      arch_height: 14,
      corner_radius: 24,
      limit: 10,
    },
    accentClassName: "bg-orange-100 text-orange-700 border-orange-200",
    group: "products",
    tags: ["Bestseller", "Festival"],
    dataSources: ["category", "manual_products", "bestsellers"],
    useCase: "Full-width stacked product cards.",
  },

  {
    id: "spacer",
    type: "spacer",
    label: "Spacer",
    icon: Space,
    description: "Breathing room between sections for rhythm and visual pacing.",
    maxPerTab: 10,
    defaultConfig: { height: 16 },
    accentClassName: "bg-zinc-100 text-zinc-700 border-zinc-200",
    group: "content",
    dataSources: ["static"],
    useCase: "Add vertical breathing room between sections.",
  },
]

/** Phase 3: group display metadata. */
export const SECTION_GROUP_META: Record<
  SectionTemplateGroup,
  { label: string; description: string }
> = {
  header: {
    label: "Header / Navigation",
    description: "Top bar, search, category tabs, store chips.",
  },
  hero: {
    label: "Hero / Campaign",
    description: "Top-of-tab campaigns and rotating promos.",
  },
  offers: {
    label: "Offers / Benefits",
    description: "Fees, coupons, bank offers, price drops.",
  },
  products: {
    label: "Product Sections",
    description: "Carousels, grids, showcases, trending shelves.",
  },
  categories: {
    label: "Category Sections",
    description: "Category rails and grids.",
  },
  content: {
    label: "Content / Layout",
    description: "Text, spacers, and standalone visuals.",
  },
  seasonal: {
    label: "Seasonal",
    description: "Festival and seasonal mosaics.",
  },
}

/**
 * Canonical (generic) meta per underlying `type` — used to render an
 * already-placed section (icon/label/accent) generically, independent of
 * which library card originally added it. Deliberately keyed by `type`,
 * not `id`: multiple library cards can share a type (see above), and the
 * FIRST one in the array wins here since it's the "plain" variant.
 */
export const sectionTypeMetaByType = sectionTypesMeta.reduce<
  Record<string, SectionTypeMeta>
>((acc, meta) => {
  if (!(meta.type in acc)) {
    acc[meta.type] = meta
  }
  return acc
}, {}) as Record<SectionType, SectionTypeMeta>

export function getSectionTypeMeta(sectionType: SectionType) {
  return sectionTypeMetaByType[sectionType]
}

export function cloneSectionDefaultConfig(
  source: SectionType | SectionTypeMeta
): Record<string, unknown> {
  const meta = typeof source === "string" ? getSectionTypeMeta(source) : source
  return JSON.parse(JSON.stringify(meta.defaultConfig)) as Record<string, unknown>
}
