import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  OlaMapsSettings,
  OlaMapsTestResult,
  OlaMapsSaveResult,
  SaveOlaMapsSettingsPayload,
} from "@/types/ola-maps-settings.types"

/**
 * Ola Maps settings service — talks to bakaloo-backend's
 * `/api/v1/admin/ola-maps-settings` endpoints. The dashboard is the only
 * place this key is ever entered; the mobile app fetches a ready-to-use
 * style URL from a separate, non-admin endpoint and never sees this one.
 */
export const olaMapsSettingsService = {
  /** Fetch the current settings (masked key, last test result). */
  async get(): Promise<OlaMapsSettings> {
    const { data } = await api.get<ApiResponse<OlaMapsSettings>>("/admin/ola-maps-settings")
    return data.data
  },

  /** Test a key live without saving it. */
  async test(apiKey: string): Promise<OlaMapsTestResult> {
    const { data } = await api.post<ApiResponse<OlaMapsTestResult>>(
      "/admin/ola-maps-settings/test",
      { apiKey },
    )
    return data.data
  },

  /** Save settings — a changed key is re-tested live before it's enabled. */
  async save(payload: SaveOlaMapsSettingsPayload): Promise<OlaMapsSaveResult> {
    const { data } = await api.put<ApiResponse<OlaMapsSaveResult>>(
      "/admin/ola-maps-settings",
      payload,
    )
    return data.data
  },
}
