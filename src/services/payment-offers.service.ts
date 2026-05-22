import api from "@/lib/api"
import type { ApiResponse } from "@/types"

export interface PaymentOfferAdmin {
  id: string
  title: string
  description: string | null
  provider: string
  icon_url: string | null
  cashback_amount: number
  cashback_percent: number | null
  min_order_amount: number
  max_cashback: number | null
  lock_threshold: number | null
  is_active: boolean
  valid_from: string
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface PaymentOfferPayload {
  title?: string
  description?: string | null
  provider?: string
  iconUrl?: string | null
  cashbackAmount?: number
  cashbackPercent?: number | null
  minOrderAmount?: number
  maxCashback?: number | null
  lockThreshold?: number | null
  isActive?: boolean
  validFrom?: string | null
  validUntil?: string | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeOffer(row: PaymentOfferAdmin): PaymentOfferAdmin {
  return {
    ...row,
    cashback_amount: toNumber(row.cashback_amount),
    cashback_percent:
      row.cashback_percent === null ? null : toNumber(row.cashback_percent),
    min_order_amount: toNumber(row.min_order_amount),
    max_cashback: row.max_cashback === null ? null : toNumber(row.max_cashback),
    lock_threshold:
      row.lock_threshold === null ? null : toNumber(row.lock_threshold),
  }
}

export const paymentOffersService = {
  async getAll(): Promise<PaymentOfferAdmin[]> {
    const { data } = await api.get<ApiResponse<PaymentOfferAdmin[]>>(
      "/admin/payment-offers"
    )
    return Array.isArray(data.data) ? data.data.map(normalizeOffer) : []
  },

  async create(payload: PaymentOfferPayload): Promise<PaymentOfferAdmin> {
    const { data } = await api.post<ApiResponse<PaymentOfferAdmin>>(
      "/admin/payment-offers",
      payload
    )
    return normalizeOffer(data.data)
  },

  async update(
    id: string,
    payload: PaymentOfferPayload
  ): Promise<PaymentOfferAdmin> {
    const { data } = await api.put<ApiResponse<PaymentOfferAdmin>>(
      `/admin/payment-offers/${id}`,
      payload
    )
    return normalizeOffer(data.data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/payment-offers/${id}`)
  },
}
