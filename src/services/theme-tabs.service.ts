import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  CreateThemeTabPayload,
  ThemeLinkSummary,
  ThemeTab,
  ThemeTabFilters,
  ThemeTabMerchConfig,
  UpdateThemeTabPayload,
} from "@/types/theme.types"

type RawThemeTab = {
  id: string
  store_key: ThemeTab["store_key"]
  key: string
  label: string
  image_url: string | null
  text_color: string | null
  sort_order: number
  status: ThemeTab["status"]
  merch_config: ThemeTabMerchConfig | null
  archived_at: string | null
  created_at: string
  updated_at: string
  theme_a_id: string | null
  theme_a_name: string | null
  theme_a_status: ThemeLinkSummary["status"] | null
  theme_a_updated_at: string | null
  theme_b_id: string | null
  theme_b_name: string | null
  theme_b_status: ThemeLinkSummary["status"] | null
  theme_b_updated_at: string | null
}

function defaultMerchSection(limit: number) {
  return {
    category_ids: [],
    product_ids: [],
    limit,
  }
}

export function defaultMerchConfig(): ThemeTabMerchConfig {
  return {
    seasonal_mosaic: defaultMerchSection(8),
    featured: defaultMerchSection(12),
    deals: defaultMerchSection(12),
    trending: defaultMerchSection(6),
    category_rails: [],
  }
}

function normalizeThemeLink(
  id: string | null,
  name: string | null,
  status: ThemeLinkSummary["status"] | null,
  updatedAt: string | null
): ThemeLinkSummary | null {
  if (!id || !name || !status || !updatedAt) {
    return null
  }

  return {
    id,
    name,
    status,
    updated_at: updatedAt,
  }
}

function normalizeThemeTab(raw: RawThemeTab): ThemeTab {
  return {
    id: raw.id,
    store_key: raw.store_key,
    key: raw.key,
    label: raw.label,
    image_url: raw.image_url,
    text_color: raw.text_color,
    sort_order: raw.sort_order,
    status: raw.status,
    merch_config: raw.merch_config ?? defaultMerchConfig(),
    archived_at: raw.archived_at,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    theme_a: normalizeThemeLink(
      raw.theme_a_id,
      raw.theme_a_name,
      raw.theme_a_status,
      raw.theme_a_updated_at
    ),
    theme_b: normalizeThemeLink(
      raw.theme_b_id,
      raw.theme_b_name,
      raw.theme_b_status,
      raw.theme_b_updated_at
    ),
  }
}

export async function getThemeTabs(filters: ThemeTabFilters = {}): Promise<ThemeTab[]> {
  const { data } = await api.get<ApiResponse<RawThemeTab[]>>("/admin/theme-tabs", {
    params: filters,
  })
  return data.data.map(normalizeThemeTab)
}

export async function getThemeTab(id: string): Promise<ThemeTab> {
  const { data } = await api.get<ApiResponse<RawThemeTab>>(`/admin/theme-tabs/${id}`)
  return normalizeThemeTab(data.data)
}

export async function createThemeTab(
  payload: CreateThemeTabPayload
): Promise<ThemeTab> {
  const { data } = await api.post<ApiResponse<RawThemeTab>>(
    "/admin/theme-tabs",
    payload
  )
  return normalizeThemeTab(data.data)
}

export async function updateThemeTab(
  id: string,
  payload: UpdateThemeTabPayload
): Promise<ThemeTab> {
  const { data } = await api.put<ApiResponse<RawThemeTab>>(
    `/admin/theme-tabs/${id}`,
    payload
  )
  return normalizeThemeTab(data.data)
}

export async function archiveThemeTab(id: string): Promise<ThemeTab> {
  const { data } = await api.delete<ApiResponse<RawThemeTab>>(
    `/admin/theme-tabs/${id}`
  )
  return normalizeThemeTab(data.data)
}

export async function restoreThemeTab(id: string): Promise<ThemeTab> {
  const { data } = await api.post<ApiResponse<RawThemeTab>>(
    `/admin/theme-tabs/${id}/restore`
  )
  return normalizeThemeTab(data.data)
}
