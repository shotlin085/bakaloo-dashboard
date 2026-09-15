import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  ExternalLinksSettings,
  UpdateExternalLinksPayload,
} from "@/types/external-links.types"

/**
 * External Links service — talks to `/api/v1/external-links` (the public
 * GET the app itself uses) and `/api/v1/external-links/admin` (the write
 * path this dashboard uses).
 */
export const externalLinksService = {
  /** Fetch the currently configured destination URLs. */
  async get(): Promise<ExternalLinksSettings> {
    const { data } = await api.get<ApiResponse<ExternalLinksSettings>>("/external-links")
    return data.data
  },

  /** Update either destination URL. */
  async update(payload: UpdateExternalLinksPayload): Promise<ExternalLinksSettings> {
    const { data } = await api.put<ApiResponse<ExternalLinksSettings>>(
      "/external-links/admin",
      payload,
    )
    return data.data
  },
}
