import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCampaigns,
  sendBulk,
  scheduleCampaign,
  getSegmentCount,
} from "@/services/notifications.service"
import type {
  CreateTemplatePayload,
  UpdateTemplatePayload,
  SendBulkPayload,
  ScheduleCampaignPayload,
  CampaignSegment,
} from "@/types/notification.types"

/* ── Templates ───────────────────────────────────── */

export function useTemplates() {
  return useQuery({
    queryKey: ["notification-templates"],
    queryFn: getTemplates,
    staleTime: 30_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: () => {
      toast.success("Template created")
      qc.invalidateQueries({ queryKey: ["notification-templates"] })
    },
    onError: () => toast.error("Failed to create template"),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      updateTemplate(id, payload),
    onSuccess: () => {
      toast.success("Template updated")
      qc.invalidateQueries({ queryKey: ["notification-templates"] })
    },
    onError: () => toast.error("Failed to update template"),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted")
      qc.invalidateQueries({ queryKey: ["notification-templates"] })
    },
    onError: () => toast.error("Failed to delete template"),
  })
}

/* ── Campaigns ───────────────────────────────────── */

export function useCampaigns(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["notification-campaigns", page, limit],
    queryFn: () => getCampaigns(page, limit),
    staleTime: 30_000,
  })
}

export function useSendBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendBulkPayload) => sendBulk(payload),
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.sent_count} users`)
      qc.invalidateQueries({ queryKey: ["notification-campaigns"] })
    },
    onError: () => toast.error("Failed to send notification"),
  })
}

export function useScheduleCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ScheduleCampaignPayload) => scheduleCampaign(payload),
    onSuccess: () => {
      toast.success("Campaign scheduled")
      qc.invalidateQueries({ queryKey: ["notification-campaigns"] })
    },
    onError: () => toast.error("Failed to schedule campaign"),
  })
}

export function useSegmentCount(segment: CampaignSegment) {
  return useQuery({
    queryKey: ["segment-count", segment],
    queryFn: () => getSegmentCount(segment),
    staleTime: 60_000,
  })
}
