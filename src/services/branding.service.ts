import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type { BrandingConfig, UpdateBrandingPayload } from "@/types/branding.types"

export async function getBranding(): Promise<BrandingConfig> {
  const { data } = await api.get<ApiResponse<BrandingConfig>>("/admin/branding")
  return data.data
}

export async function updateBranding(
  payload: UpdateBrandingPayload
): Promise<BrandingConfig> {
  const { data } = await api.put<ApiResponse<BrandingConfig>>(
    "/admin/branding",
    payload
  )
  return data.data
}
