import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  ScratchPrize,
  CreateScratchPrizePayload,
  UpdateScratchPrizePayload,
  ScratchCardSettings,
  UpdateScratchCardSettingsPayload,
  ScratchMilestoneRule,
  CreateScratchMilestoneRulePayload,
  UpdateScratchMilestoneRulePayload,
  GrantScratchesPayload,
  GrantScratchesResult,
  ScratchHistoryFilters,
  ScratchHistoryResult,
} from "@/types/scratch-card.types"

// ─── Prizes ──────────────────────────────────────────────────────────────

export async function getScratchPrizes(): Promise<ScratchPrize[]> {
  const { data } = await api.get<ApiResponse<ScratchPrize[]>>("/scratch-card/admin/prizes")
  return data.data
}

export async function createScratchPrize(payload: CreateScratchPrizePayload): Promise<ScratchPrize> {
  const { data } = await api.post<ApiResponse<ScratchPrize>>("/scratch-card/admin/prizes", payload)
  return data.data
}

export async function updateScratchPrize(id: string, payload: UpdateScratchPrizePayload): Promise<ScratchPrize> {
  const { data } = await api.patch<ApiResponse<ScratchPrize>>(`/scratch-card/admin/prizes/${id}`, payload)
  return data.data
}

export async function deleteScratchPrize(id: string): Promise<void> {
  await api.delete(`/scratch-card/admin/prizes/${id}`)
}

export async function reorderScratchPrizes(orderedIds: string[]): Promise<void> {
  await api.put("/scratch-card/admin/prizes/reorder", { orderedIds })
}

// ─── Settings ────────────────────────────────────────────────────────────

export async function getScratchCardSettings(): Promise<ScratchCardSettings> {
  const { data } = await api.get<ApiResponse<ScratchCardSettings>>("/scratch-card/admin/settings")
  return data.data
}

export async function updateScratchCardSettings(
  payload: UpdateScratchCardSettingsPayload
): Promise<ScratchCardSettings> {
  const { data } = await api.put<ApiResponse<ScratchCardSettings>>("/scratch-card/admin/settings", payload)
  return data.data
}

// ─── Milestone rules ─────────────────────────────────────────────────────

export async function getScratchMilestoneRules(): Promise<ScratchMilestoneRule[]> {
  const { data } = await api.get<ApiResponse<ScratchMilestoneRule[]>>("/scratch-card/admin/milestones")
  return data.data
}

export async function createScratchMilestoneRule(
  payload: CreateScratchMilestoneRulePayload
): Promise<ScratchMilestoneRule> {
  const { data } = await api.post<ApiResponse<ScratchMilestoneRule>>("/scratch-card/admin/milestones", payload)
  return data.data
}

export async function updateScratchMilestoneRule(
  id: string,
  payload: UpdateScratchMilestoneRulePayload
): Promise<ScratchMilestoneRule> {
  const { data } = await api.patch<ApiResponse<ScratchMilestoneRule>>(`/scratch-card/admin/milestones/${id}`, payload)
  return data.data
}

export async function deleteScratchMilestoneRule(id: string): Promise<void> {
  await api.delete(`/scratch-card/admin/milestones/${id}`)
}

// ─── Manual grant + history ──────────────────────────────────────────────

export async function grantScratches(payload: GrantScratchesPayload): Promise<GrantScratchesResult> {
  const { data } = await api.post<ApiResponse<GrantScratchesResult>>("/scratch-card/admin/grant", payload)
  return data.data
}

export async function getScratchHistory(filters: ScratchHistoryFilters = {}): Promise<ScratchHistoryResult> {
  const params: Record<string, string | number> = {}
  if (filters.limit) params.limit = filters.limit
  if (filters.offset) params.offset = filters.offset
  if (filters.userId) params.userId = filters.userId
  const { data } = await api.get<ApiResponse<ScratchHistoryResult>>("/scratch-card/admin/history", { params })
  return data.data
}
