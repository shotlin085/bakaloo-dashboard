/* ── Settings Types ─────────────────────────────── */

export interface SettingValue {
  value: string | number | boolean
  description: string
  updatedAt: string
}

export type AppSettings = Record<string, SettingValue>

export type UpdateSettingsPayload = Record<string, string | number | boolean>

/** Pre-defined settings keys with groupings for UI */
export interface SettingsGroup {
  label: string
  icon: string
  keys: SettingKey[]
}

export interface SettingKey {
  key: string
  label: string
  type: "number" | "text" | "boolean"
  suffix?: string
}
