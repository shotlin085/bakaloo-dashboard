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
}

/** Update banner payload */
export type UpdateBannerPayload = Partial<CreateBannerPayload>

/** Reorder payload */
export interface ReorderBannersPayload {
  orderedIds: string[]
}
