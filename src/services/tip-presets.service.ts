import api from "@/lib/api"
import type { ApiResponse } from "@/types"

export interface TipPresetAdmin {
  id: string
  amount: number
  emoji: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface CreateTipPresetPayload {
  amount: number
  emoji?: string
  sortOrder?: number
}

export interface UpdateTipPresetPayload {
  amount?: number
  emoji?: string
  sortOrder?: number
  isActive?: boolean
}

function normalizeTipPreset(row: TipPresetAdmin): TipPresetAdmin {
  return {
    ...row,
    amount: Number(row.amount),
    sort_order: Number(row.sort_order),
  }
}

export const tipPresetsService = {
  async getAll(): Promise<TipPresetAdmin[]> {
    const { data } = await api.get<ApiResponse<TipPresetAdmin[]>>(
      "/admin/tip-presets"
    )
    return Array.isArray(data.data) ? data.data.map(normalizeTipPreset) : []
  },

  async create(payload: CreateTipPresetPayload): Promise<TipPresetAdmin> {
    const { data } = await api.post<ApiResponse<TipPresetAdmin>>(
      "/admin/tip-presets",
      payload
    )
    return normalizeTipPreset(data.data)
  },

  async update(
    id: string,
    payload: UpdateTipPresetPayload
  ): Promise<TipPresetAdmin> {
    const { data } = await api.put<ApiResponse<TipPresetAdmin>>(
      `/admin/tip-presets/${id}`,
      payload
    )
    return normalizeTipPreset(data.data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/tip-presets/${id}`)
  },
}
