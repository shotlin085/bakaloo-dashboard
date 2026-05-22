import api from "@/lib/api"
import type { ApiResponse } from "@/types"

export interface FeeConfig {
  id: string
  fee_type: string
  amount: number
  free_threshold: number | null
  is_active: boolean
  description: string | null
  start_hour: number | null
  end_hour: number | null
  created_at: string
  updated_at: string
}

export interface UpdateFeePayload {
  amount?: number
  free_threshold?: number | null
  is_active?: boolean
  description?: string
  start_hour?: number | null
  end_hour?: number | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeFee(row: FeeConfig): FeeConfig {
  return {
    ...row,
    amount: toNumber(row.amount),
    free_threshold:
      row.free_threshold === null ? null : toNumber(row.free_threshold),
  }
}

export const feesService = {
  async getAll(): Promise<FeeConfig[]> {
    const { data } = await api.get<ApiResponse<FeeConfig[]>>("/admin/fee-config")
    return Array.isArray(data.data) ? data.data.map(normalizeFee) : []
  },

  async update(feeType: string, payload: UpdateFeePayload): Promise<FeeConfig> {
    const { data } = await api.put<ApiResponse<FeeConfig>>(
      `/admin/fee-config/${feeType}`,
      payload
    )
    return normalizeFee(data.data)
  },
}
