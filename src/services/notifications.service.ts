import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  NotificationTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  NotificationCampaign,
  SendBulkPayload,
  ScheduleCampaignPayload,
  SegmentCount,
  CampaignSegment,
} from "@/types/notification.types"

/* ── Templates ───────────────────────────────────── */

export async function getTemplates(): Promise<NotificationTemplate[]> {
  const { data } = await api.get<ApiResponse<NotificationTemplate[]>>(
    "/admin/notifications/templates"
  )
  return Array.isArray(data.data) ? data.data : []
}

export async function getTemplate(id: string): Promise<NotificationTemplate> {
  const { data } = await api.get<ApiResponse<NotificationTemplate>>(
    `/admin/notifications/templates/${id}`
  )
  return data.data
}

export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<NotificationTemplate> {
  const { data } = await api.post<ApiResponse<NotificationTemplate>>(
    "/admin/notifications/templates",
    payload
  )
  return data.data
}

export async function updateTemplate(
  id: string,
  payload: UpdateTemplatePayload
): Promise<NotificationTemplate> {
  const { data } = await api.put<ApiResponse<NotificationTemplate>>(
    `/admin/notifications/templates/${id}`,
    payload
  )
  return data.data
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/admin/notifications/templates/${id}`)
}

/* ── Campaigns ───────────────────────────────────── */

export async function getCampaigns(
  page = 1,
  limit = 20
): Promise<{ campaigns: NotificationCampaign[]; total: number }> {
  const { data } = await api.get<
    ApiResponse<{ campaigns: NotificationCampaign[]; total: number }>
  >("/admin/notifications/campaigns", { params: { page, limit } })
  return data.data
}

export async function getCampaign(id: string): Promise<NotificationCampaign> {
  const { data } = await api.get<ApiResponse<NotificationCampaign>>(
    `/admin/notifications/campaigns/${id}`
  )
  return data.data
}

export async function sendBulk(
  payload: SendBulkPayload
): Promise<NotificationCampaign & { sent_count: number }> {
  const { data } = await api.post<
    ApiResponse<NotificationCampaign & { sent_count: number }>
  >("/admin/notifications/send-bulk", payload)
  return data.data
}

export async function scheduleCampaign(
  payload: ScheduleCampaignPayload
): Promise<NotificationCampaign> {
  const { data } = await api.post<ApiResponse<NotificationCampaign>>(
    "/admin/notifications/schedule",
    payload
  )
  return data.data
}

export async function getSegmentCount(
  segment: CampaignSegment
): Promise<SegmentCount> {
  const { data } = await api.get<ApiResponse<SegmentCount>>(
    "/admin/notifications/segment-count",
    { params: { segment } }
  )
  return data.data
}
