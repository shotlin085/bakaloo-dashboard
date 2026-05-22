import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  Banner,
  CreateBannerPayload,
  UpdateBannerPayload,
} from "@/types/banner.types"

export async function getBanners(): Promise<Banner[]> {
  const { data } = await api.get<ApiResponse<Banner[]>>("/admin/banners")
  return Array.isArray(data.data) ? data.data : []
}

export async function getBanner(id: string): Promise<Banner> {
  const { data } = await api.get<ApiResponse<Banner>>(`/admin/banners/${id}`)
  return data.data
}

export async function createBanner(payload: CreateBannerPayload): Promise<Banner> {
  const { data } = await api.post<ApiResponse<Banner>>("/admin/banners", payload)
  return data.data
}

export async function updateBanner(
  id: string,
  payload: UpdateBannerPayload
): Promise<Banner> {
  const { data } = await api.put<ApiResponse<Banner>>(
    `/admin/banners/${id}`,
    payload
  )
  return data.data
}

export async function deleteBanner(id: string): Promise<void> {
  await api.delete(`/admin/banners/${id}`)
}

export async function reorderBanners(orderedIds: string[]): Promise<void> {
  await api.put("/admin/banners/reorder", { orderedIds })
}
