/* ── Notification Types ──────────────────────────── */

export interface NotificationTemplate {
  id: string
  name: string
  title: string
  body: string
  type: "PUSH" | "SMS" | "EMAIL" | "IN_APP"
  variables: string // JSON string of array
  image_url?: string
  deep_link?: string
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

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>

export interface NotificationCampaign {
  id: string
  title: string
  body: string
  image_url?: string
  deep_link?: string
  segment?: string
  target_type?: string
  segment_filters?: Record<string, unknown>
  target_count: number
  sent_count: number
  opened_count: number
  failed_count: number
  status: "QUEUED" | "SENDING" | "SENT" | "FAILED" | "SCHEDULED" | "CANCELLED"
  template_id?: string
  scheduled_at?: string
  sent_at?: string
  created_by: string
  created_by_name?: string
  created_at: string
}

export interface SendBulkPayload {
  title: string
  body: string
  segment: CampaignSegment
  segmentFilters?: Record<string, unknown>
  image_url?: string
  deep_link?: string
  target_phones?: string[]
}

export interface ScheduleCampaignPayload extends SendBulkPayload {
  scheduledAt: string
}

export interface SegmentCount {
  segment: string
  count: number
}

export type CampaignSegment = "all" | "new" | "inactive" | "high_value" | "riders" | "specific"
