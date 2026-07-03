/* ── Notification Types ──────────────────────────── */

export type NotificationType =
  | "system"
  | "offer"
  | "product_offer"
  | "category_offer"
  | "store_offer"
  | "order_update"
  | "rider_update"
  | "wallet"
  | "coupon"
  | "cart_reminder"
  | "general"
  | "PUSH"
  | "SMS"
  | "EMAIL"
  | "IN_APP"

export type CampaignSegment =
  | "all_customers"
  | "specific_user"
  | "store_customers"
  | "inactive_customers"
  | "cart_not_empty"
  | "all"
  | "new"
  | "inactive"
  | "high_value"
  | "custom_segment"

export interface NotificationTemplate {
  id: string
  name: string
  title: string
  body: string
  type: "PUSH" | "SMS" | "EMAIL" | "IN_APP"
  variables: string // JSON string of array
  image_url?: string | null
  deep_link?: string | null
  is_active?: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateTemplatePayload {
  name: string
  title: string
  body: string
  type: "PUSH" | "SMS" | "EMAIL" | "IN_APP"
  variables?: string[]
  image_url?: string
  deep_link?: string
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload> & {
  is_active?: boolean
}

export interface NotificationCampaign {
  id: string
  title: string
  body: string
  type?: string
  image_url?: string | null
  deep_link?: string | null
  segment?: string | null
  target_type?: string | null
  target_count: number
  sent_count: number
  opened_count: number | null
  failed_count: number | null
  failure_summary?: Record<string, unknown> | null
  status: "QUEUED" | "SENDING" | "SENT" | "FAILED" | "SCHEDULED" | "CANCELLED"
  template_id?: string | null
  scheduled_at?: string | null
  expires_at?: string | null
  sent_at?: string | null
  created_by: string
  created_by_name?: string
  created_at: string
  updated_at?: string
}

export interface SendBulkPayload {
  title: string
  body: string
  segment: CampaignSegment
  segmentValue?: string
  segmentFilters?: Record<string, unknown>
  image_url?: string
  deep_link?: string
  type?: string
  expires_at?: string
  template_id?: string
  target_phones?: string[]
}

export interface ScheduleCampaignPayload extends SendBulkPayload {
  scheduledAt: string
}

export interface SegmentCount {
  segment: string
  segmentValue?: string
  count: number
}
