/**
 * Ola Maps settings types — mirror bakaloo-backend's
 * `ola_maps_settings` table (migration 115) and
 * src/modules/ola-maps-settings admin API.
 */

export type OlaMapsTestStatus = "SUCCESS" | "FAILED"

/** Admin-safe view — the raw key is never returned, only a masked tail. */
export interface OlaMapsSettings {
  configured: boolean
  isEnabled: boolean
  maskedKey: string | null
  lastTestedAt: string | null
  lastTestStatus: OlaMapsTestStatus | null
  lastTestMessage: string | null
  updatedAt: string | null
}

/** Result of a live "Test Connection" check (standalone or as part of Save). */
export interface OlaMapsTestResult {
  success: boolean
  statusCode: number | null
  message: string
}

export interface OlaMapsSaveResult {
  settings: OlaMapsSettings
  test: OlaMapsTestResult | null
}

/** `apiKey` omitted leaves the stored key untouched; empty string clears it. */
export interface SaveOlaMapsSettingsPayload {
  apiKey?: string
  isEnabled?: boolean
}
