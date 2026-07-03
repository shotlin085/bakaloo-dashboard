import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CartMilestone,
  CreateCartMilestonePayload,
  UpdateCartMilestonePayload,
} from "@/types/cart-milestone.types"

export async function getCartMilestones(): Promise<CartMilestone[]> {
  const { data } = await api.get<ApiResponse<CartMilestone[]>>("/cart-milestones")
  return data.data
}

export async function createCartMilestone(payload: CreateCartMilestonePayload): Promise<CartMilestone> {
  const { data } = await api.post<ApiResponse<CartMilestone>>("/cart-milestones", payload)
  return data.data
}

export async function updateCartMilestone(
  id: string,
  payload: UpdateCartMilestonePayload
): Promise<CartMilestone> {
  const { data } = await api.patch<ApiResponse<CartMilestone>>(`/cart-milestones/${id}`, payload)
  return data.data
}

export async function deleteCartMilestone(id: string): Promise<void> {
  await api.delete(`/cart-milestones/${id}`)
}
