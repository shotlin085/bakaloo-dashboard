/* ── Theme Types ─────────────────────────────── */

export interface TopBarTheme {
  backgroundColor: string
  textColor: string
}

export interface StoreSelectorTheme {
  backgroundColor: string
  activeChipColor: string
}

export interface CategoryTabsTheme {
  visible: boolean
  textColor: string
  indicatorColor: string
}

export interface SearchZoneTheme {
  backgroundColor: string
  waveColor: string
  searchHints: string[]
  promoBoxImageUrl: string | null
}

export interface BannerAnimationTheme {
  lottieUrl: string | null
  backgroundGradient: [string, string]
  containerColor: string
}

export interface FeeStripTheme {
  imageUrl: string | null
  visible: boolean
}

export interface HeroTileTheme {
  title: string
  gradient: [string, string]
  badgeText: string
  badgeGradient: [string, string]
}

export interface MiniTileTheme {
  title: string
  gradient: [string, string]
  imageUrl: string | null
}

export interface SeasonalMosaicTheme {
  containerColor: string
  heroTile: HeroTileTheme
  miniTiles: MiniTileTheme[]
}

export interface BankOffersTheme {
  visible: boolean
  bannerImageUrls: string[]
}

export interface ThemeMeta {
  seasonLabel: string
  statusBarBrightness: "light" | "dark"
}

export interface ThemeSections {
  topBar: TopBarTheme
  storeSelector: StoreSelectorTheme
  categoryTabs: CategoryTabsTheme
  searchZone: SearchZoneTheme
  bannerAnimation: BannerAnimationTheme
  feeStrip: FeeStripTheme
  seasonalMosaic: SeasonalMosaicTheme
  bankOffers: BankOffersTheme
}

export interface ThemeData {
  sections: ThemeSections
  meta: ThemeMeta
}

export type ThemeStatus = "draft" | "active" | "scheduled" | "archived"
export type ABVariant = "A" | "B"
export type ThemeStoreKey = "zepto" | "off_zone" | "super_mall" | "cafe"
export type ThemeTabStatus = "active" | "archived"

export interface MerchSectionConfig {
  category_ids: string[]
  product_ids: string[]
  limit: number
}

export interface CategoryRailConfig {
  category_id: string
  product_ids: string[]
  limit: number
  title: string | null
}

export interface ThemeTabMerchConfig {
  seasonal_mosaic: MerchSectionConfig
  featured: MerchSectionConfig
  deals: MerchSectionConfig
  trending: MerchSectionConfig
  category_rails: CategoryRailConfig[]
}

export interface ThemeLinkSummary {
  id: string
  name: string
  status: ThemeStatus
  updated_at: string
}

export interface ThemeTab {
  id: string
  store_key: ThemeStoreKey
  key: string
  label: string
  image_url: string | null
  text_color: string | null
  sort_order: number
  status: ThemeTabStatus
  merch_config: ThemeTabMerchConfig
  archived_at: string | null
  created_at: string
  updated_at: string
  theme_a: ThemeLinkSummary | null
  theme_b: ThemeLinkSummary | null
}

export interface Theme {
  id: string
  name: string
  is_active: boolean
  theme_data: ThemeData
  tab_id: string | null
  tab_key: string | null
  tab_label: string | null
  tab_icon_url: string | null
  tab_order: number
  store_key: ThemeStoreKey | null
  tab_status: ThemeTabStatus | null
  status: ThemeStatus
  scheduled_at: string | null
  expires_at: string | null
  base_theme_id: string | null
  ab_variant: ABVariant
  ab_split_percent: number
  version: number
  etag: string | null
  created_at: string
  updated_at: string
}

export interface CreateThemePayload {
  name: string
  theme_data: ThemeData
  tab_id?: string | null
  tab_key?: string
  tab_label?: string
  tab_icon_url?: string
  tab_order?: number
  status?: ThemeStatus
  ab_variant?: ABVariant
  ab_split_percent?: number
}

export interface UpdateThemePayload {
  name?: string
  theme_data?: ThemeData
  tab_id?: string | null
  tab_key?: string
  tab_label?: string
  tab_icon_url?: string
  tab_order?: number
  status?: ThemeStatus
  scheduled_at?: string | null
  expires_at?: string | null
  ab_variant?: ABVariant
  ab_split_percent?: number
}

export interface ThemeVersion {
  id: string
  version: number
  created_by: string | null
  created_at: string
}

export interface ScheduleThemePayload {
  scheduled_at: string
}

export interface RollbackPayload {
  version_id: string
}

export interface ThemeTabFilters {
  store_key?: ThemeStoreKey
  status?: ThemeTabStatus
}

export interface CreateThemeTabPayload {
  store_key: ThemeStoreKey
  key: string
  label: string
  image_url?: string | null
  text_color?: string | null
  sort_order?: number
  status?: ThemeTabStatus
  merch_config?: Partial<ThemeTabMerchConfig>
}

export interface UpdateThemeTabPayload {
  store_key?: ThemeStoreKey
  key?: string
  label?: string
  image_url?: string | null
  text_color?: string | null
  sort_order?: number
  status?: ThemeTabStatus
  merch_config?: Partial<ThemeTabMerchConfig>
}

export const SECTION_TYPES = [
  "animated_banner",
  "fee_strip",
  "seasonal_mosaic",
  "round_category_icons",
  "category_product_grid",
  "product_carousel",
  "trending_products",
  "promo_carousel",
  "bank_offers",
  "custom_banner",
  "text_header",
  "arched_product_showcase",
  "spacer",
] as const

export type SectionType = typeof SECTION_TYPES[number]

export interface MerchBinding {
  category_ids: string[]
  product_ids: string[]
  tags?: string[]
  limit: number
  source: "category" | "tag" | "manual"
}

export interface SectionManifest {
  id: string
  tab_id: string
  tab_key?: string
  store_key?: ThemeStoreKey
  section_type: SectionType
  sort_order: number
  visible: boolean
  config: Record<string, unknown>
  merch_binding: MerchBinding | null
  created_at: string
  updated_at: string
}

export interface CreateSectionPayload {
  section_type: SectionType
  config?: Record<string, unknown>
  visible?: boolean
  merch_binding?: MerchBinding
}

export interface UpdateSectionPayload {
  config?: Record<string, unknown>
  visible?: boolean
}

export interface ReorderSectionsPayload {
  order: string[]
}

export interface UpdateSectionMerchPayload {
  category_ids?: string[]
  product_ids?: string[]
  tags?: string[]
  limit?: number
  source?: "category" | "tag" | "manual"
}

export interface SectionManifestVersion {
  id: string
  tab_id: string
  version: number
  snapshot: SectionManifest[]
  created_by: string | null
  scheduled_at: string | null
  status: "applied" | "scheduled" | "expired"
  ab_variant: "A" | "B"
  ab_split_percent: number
  created_at: string
}

export interface ScheduleSectionLayoutPayload {
  scheduled_at: string
}
