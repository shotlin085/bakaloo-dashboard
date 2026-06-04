"use client"

/**
 * Notifications hooks — wraps the existing template / campaign / segment
 * endpoints so each cache entry starts with the `notifications` tag and
 * includes `shopKey`, allowing the Shop_Switcher's predicate-based
 * invalidation to reach them on every pivot (Req 3.4, 10.3).
 *
 * Three query families live in this module:
 *   - notification templates (GET /notifications/templates)
 *   - notification campaigns  (GET /notifications/campaigns)
 *   - segment counts          (GET /notifications/segments/:segment/count)
 *
 * All three are keyed under the `notifications` prefix so a single
 * `invalidateQueries({ queryKey: ["notifications"] })` covers every entry
 * after a mutation. Each list query is gated by
 * `enabled: shopKey !== "NONE"` to mirror the convention from `useOrders`
 * / `useShopProductsList`.
 *
 * Note: the legacy `["notification-templates"]`, `["notification-campaigns"]`,
 * and `["segment-count"]` cache keys are no longer in use — every reader
 * now goes through the central `notifications` prefix so the Shop_Switcher
 * predicate invalidation covers them in one pass.
 *
 * Requirements: 10.1, 10.3
 */

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
import { useShopContext } from "@/hooks/useShopContext"
import type {
  CreateTemplatePayload,
  UpdateTemplatePayload,
  SendBulkPayload,
  ScheduleCampaignPayload,
  CampaignSegment,
} from "@/types/notification.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

/**
 * Resolve the `shopKey` used by every notifications query. `ALL_SHOPS` →
 * `"ALL"`; `SINGLE_SHOP` → `activeShopId`; otherwise the sentinel `"NONE"`.
 */
function useShopKey(): string {
  const { mode, activeShopId } = useShopContext()
  return mode === "HQ_MODE" ? "ALL" : activeShopId ?? NONE_SHOP_KEY
}

/* ── Templates ───────────────────────────────────── */

export function useTemplates() {
  const shopKey = useShopKey()
  // Keyed under the central `notifications` tag with `shopKey` as the second
  // segment so the Shop_Switcher predicate invalidation reaches it. Each
  // sub-resource (templates / campaigns / segment counts) keeps its own
  // discriminator after `shopKey` so cache entries never collide.
  return useQuery({
    queryKey: ["notifications", shopKey, "templates"] as const,
    queryFn: getTemplates,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: () => {
      toast.success("Template created")
      // Prefix-based invalidate drops every shop-keyed `notifications`
      // entry (templates, campaigns, segment counts) in one pass.
      qc.invalidateQueries({ queryKey: ["notifications"] })
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
      qc.invalidateQueries({ queryKey: ["notifications"] })
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
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => toast.error("Failed to delete template"),
  })
}

/* ── Campaigns ───────────────────────────────────── */

export function useCampaigns(page = 1, limit = 20) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["notifications", shopKey, "campaigns", page, limit] as const,
    queryFn: () => getCampaigns(page, limit),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useSendBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendBulkPayload) => sendBulk(payload),
    onSuccess: (data) => {
      toast.success(`Notification queued for ${data.target_count ?? data.sent_count ?? '?'} users`)
      qc.invalidateQueries({ queryKey: ["notifications"] })
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
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => toast.error("Failed to schedule campaign"),
  })
}

export function useSegmentCount(segment: CampaignSegment, segmentValue?: string) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: ["notifications", shopKey, "segment-count", segment, segmentValue] as const,
    queryFn: () => getSegmentCount(segment, segmentValue),
    enabled: shopKey !== NONE_SHOP_KEY && segment !== "cart_not_empty",
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
