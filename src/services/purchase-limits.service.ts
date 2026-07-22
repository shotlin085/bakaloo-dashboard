import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  PurchaseLimitRule,
  CreatePurchaseLimitRulePayload,
  UpdatePurchaseLimitRulePayload,
} from "@/types/purchase-limit.types"

/** List every purchase limit rule. No pagination — admin-configured rules number in the dozens at most. */
export async function getPurchaseLimitRules(): Promise<PurchaseLimitRule[]> {
  const { data } = await api.get<ApiResponse<PurchaseLimitRule[]>>("/purchase-limits")
  return data.data
}

export async function createPurchaseLimitRule(
  payload: CreatePurchaseLimitRulePayload
): Promise<PurchaseLimitRule> {
  const { data } = await api.post<ApiResponse<PurchaseLimitRule>>("/purchase-limits", payload)
  return data.data
}

export async function updatePurchaseLimitRule(
  id: string,
  payload: UpdatePurchaseLimitRulePayload
): Promise<PurchaseLimitRule> {
  const { data } = await api.patch<ApiResponse<PurchaseLimitRule>>(`/purchase-limits/${id}`, payload)
  return data.data
}

/** Dedicated toggle endpoint for the list page's inline Active switch. */
export async function togglePurchaseLimitRule(
  id: string,
  isActive: boolean
): Promise<PurchaseLimitRule> {
  const { data } = await api.patch<ApiResponse<PurchaseLimitRule>>(
    `/purchase-limits/${id}/toggle`,
    { isActive }
  )
  return data.data
}

export async function deletePurchaseLimitRule(id: string): Promise<void> {
  await api.delete(`/purchase-limits/${id}`)
}
