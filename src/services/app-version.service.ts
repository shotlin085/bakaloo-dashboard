import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  AppPlatform,
  AppVersionConfig,
  UpdateAppVersionPayload,
} from "@/types/app-version.types"

/**
 * App Version service — talks to `/api/v1/admin/app-versions`, the
 * force/soft-update thresholds the customer app checks against on every
 * launch (see `/api/v1/app/version-check`, called with no auth).
 */
export const appVersionService = {
  /** Fetch the current config for both platforms. */
  async list(): Promise<AppVersionConfig[]> {
    const { data } = await api.get<ApiResponse<AppVersionConfig[]>>("/admin/app-versions")
    return data.data
  },

  /** Update the config for one platform. */
  async update(
    platform: AppPlatform,
    payload: UpdateAppVersionPayload,
  ): Promise<AppVersionConfig> {
    const { data } = await api.put<ApiResponse<AppVersionConfig>>(
      `/admin/app-versions/${platform}`,
      payload,
    )
    return data.data
  },
}
