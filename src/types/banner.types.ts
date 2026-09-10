/** Which storefront audience sees a banner. 'ALL' shows to everyone. */
export type BannerAudience = "B2C" | "B2B" | "ALL"

/** Banner entity — snake_case (backend returns raw DB rows) */
export interface Banner {
  id: string
  title: string
  image_url: string
  banner_type: "carousel" | "popup" | "announcement"
  link_type: "category" | "product" | "url" | "none"
  link_value: string | null
  is_active: boolean
  sort_order: number
  start_date: string | null
  end_date: string | null
  /** 'ALWAYS' (default) shows regardless of store status; 'STORE_CLOSED' shows only while the store is closed. */
  trigger_type: "ALWAYS" | "STORE_CLOSED"
  audience: BannerAudience
  created_at: string
  updated_at: string
}

/** Create banner payload — camelCase (backend schema expects camelCase) */
export interface CreateBannerPayload {
  title: string
  imageUrl: string
  bannerType?: "carousel" | "popup" | "announcement"
  linkType?: "category" | "product" | "url" | "none"
  linkValue?: string
  isActive?: boolean
  startDate?: string
  endDate?: string
  triggerType?: "ALWAYS" | "STORE_CLOSED"
  audience?: BannerAudience
}

/** Update banner payload */
export type UpdateBannerPayload = Partial<CreateBannerPayload>

/** Reorder payload */
export interface ReorderBannersPayload {
  orderedIds: string[]
}
