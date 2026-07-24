import api from "@/lib/api"
import type { ApiResponse } from "@/types"

/**
 * Pincode Mapping service — talks to `/admin/pincode-mappings`
 * (bakaloo-backend migration 089). Admin-curated pincode -> city/area/state
 * overrides that the customer app's /addresses/validate-pincode response
 * attaches whenever an ACTIVE row matches, so a known-wrong reverse-geocode
 * result (e.g. a Gujarat pincode resolving to the wrong city) can be
 * corrected without depending on the third-party geocoder.
 */
export interface PincodeMapping {
  id: string
  pincode: string
  city: string
  area: string | null
  state: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePincodeMappingPayload {
  pincode: string
  city: string
  area?: string | null
  state: string
  isActive?: boolean
}

export interface UpdatePincodeMappingPayload {
  pincode?: string
  city?: string
  area?: string | null
  state?: string
  isActive?: boolean
}

export const pincodeMappingService = {
  async getAll(): Promise<PincodeMapping[]> {
    const { data } = await api.get<ApiResponse<PincodeMapping[]>>(
      "/admin/pincode-mappings"
    )
    return Array.isArray(data.data) ? data.data : []
  },

  async create(payload: CreatePincodeMappingPayload): Promise<PincodeMapping> {
    const { data } = await api.post<ApiResponse<PincodeMapping>>(
      "/admin/pincode-mappings",
      payload
    )
    return data.data
  },

  async update(
    id: string,
    payload: UpdatePincodeMappingPayload
  ): Promise<PincodeMapping> {
    const { data } = await api.put<ApiResponse<PincodeMapping>>(
      `/admin/pincode-mappings/${id}`,
      payload
    )
    return data.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/pincode-mappings/${id}`)
  },
}
