import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  SpinPrize,
  CreateSpinPrizePayload,
  UpdateSpinPrizePayload,
  SpinWheelSettings,
  UpdateSpinWheelSettingsPayload,
  SpinMilestoneRule,
  CreateSpinMilestoneRulePayload,
  UpdateSpinMilestoneRulePayload,
  GrantSpinsPayload,
  GrantSpinsResult,
  SpinHistoryFilters,
  SpinHistoryResult,
} from "@/types/spin-wheel.types"

// ─── Prizes ──────────────────────────────────────────────────────────────

export async function getSpinPrizes(): Promise<SpinPrize[]> {
  const { data } = await api.get<ApiResponse<SpinPrize[]>>("/spin-wheel/admin/prizes")
  return data.data
}

export async function createSpinPrize(payload: CreateSpinPrizePayload): Promise<SpinPrize> {
  const { data } = await api.post<ApiResponse<SpinPrize>>("/spin-wheel/admin/prizes", payload)
  return data.data
}

export async function updateSpinPrize(id: string, payload: UpdateSpinPrizePayload): Promise<SpinPrize> {
  const { data } = await api.patch<ApiResponse<SpinPrize>>(`/spin-wheel/admin/prizes/${id}`, payload)
  return data.data
}

export async function deleteSpinPrize(id: string): Promise<void> {
  await api.delete(`/spin-wheel/admin/prizes/${id}`)
}

export async function reorderSpinPrizes(orderedIds: string[]): Promise<void> {
  await api.put("/spin-wheel/admin/prizes/reorder", { orderedIds })
}

// ─── Settings ────────────────────────────────────────────────────────────

export async function getSpinWheelSettings(): Promise<SpinWheelSettings> {
  const { data } = await api.get<ApiResponse<SpinWheelSettings>>("/spin-wheel/admin/settings")
  return data.data
}

export async function updateSpinWheelSettings(
  payload: UpdateSpinWheelSettingsPayload
): Promise<SpinWheelSettings> {
  const { data } = await api.put<ApiResponse<SpinWheelSettings>>("/spin-wheel/admin/settings", payload)
  return data.data
}

// ─── Milestone rules ─────────────────────────────────────────────────────

export async function getSpinMilestoneRules(): Promise<SpinMilestoneRule[]> {
  const { data } = await api.get<ApiResponse<SpinMilestoneRule[]>>("/spin-wheel/admin/milestones")
  return data.data
}

export async function createSpinMilestoneRule(
  payload: CreateSpinMilestoneRulePayload
): Promise<SpinMilestoneRule> {
  const { data } = await api.post<ApiResponse<SpinMilestoneRule>>("/spin-wheel/admin/milestones", payload)
  return data.data
}

export async function updateSpinMilestoneRule(
  id: string,
  payload: UpdateSpinMilestoneRulePayload
): Promise<SpinMilestoneRule> {
  const { data } = await api.patch<ApiResponse<SpinMilestoneRule>>(`/spin-wheel/admin/milestones/${id}`, payload)
  return data.data
}

export async function deleteSpinMilestoneRule(id: string): Promise<void> {
  await api.delete(`/spin-wheel/admin/milestones/${id}`)
}

// ─── Manual grant + history ──────────────────────────────────────────────

export async function grantSpins(payload: GrantSpinsPayload): Promise<GrantSpinsResult> {
  const { data } = await api.post<ApiResponse<GrantSpinsResult>>("/spin-wheel/admin/grant", payload)
  return data.data
}

export async function getSpinHistory(filters: SpinHistoryFilters = {}): Promise<SpinHistoryResult> {
  const params: Record<string, string | number> = {}
  if (filters.limit) params.limit = filters.limit
  if (filters.offset) params.offset = filters.offset
  if (filters.userId) params.userId = filters.userId
  const { data } = await api.get<ApiResponse<SpinHistoryResult>>("/spin-wheel/admin/history", { params })
  return data.data
}
