import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  FirstTimeOffer,
  CreateFirstTimeOfferPayload,
  UpdateFirstTimeOfferPayload,
} from "@/types/first-time-offer.types"

export async function getFirstTimeOffers(): Promise<FirstTimeOffer[]> {
  const { data } = await api.get<ApiResponse<FirstTimeOffer[]>>("/first-time-offers")
  return data.data
}

export async function createFirstTimeOffer(payload: CreateFirstTimeOfferPayload): Promise<FirstTimeOffer> {
  const { data } = await api.post<ApiResponse<FirstTimeOffer>>("/first-time-offers", payload)
  return data.data
}

export async function updateFirstTimeOffer(
  id: string,
  payload: UpdateFirstTimeOfferPayload
): Promise<FirstTimeOffer> {
  const { data } = await api.patch<ApiResponse<FirstTimeOffer>>(`/first-time-offers/${id}`, payload)
  return data.data
}

export async function deleteFirstTimeOffer(id: string): Promise<void> {
  await api.delete(`/first-time-offers/${id}`)
}
