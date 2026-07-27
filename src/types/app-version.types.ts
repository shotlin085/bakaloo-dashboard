export type AppPlatform = "android" | "ios"

export interface AppVersionConfig {
  platform: AppPlatform
  minSupportedBuild: number
  latestBuild: number
  latestVersionName: string
  updateMessage: string | null
  storeUrl: string | null
  updatedAt: string
}

export interface UpdateAppVersionPayload {
  minSupportedBuild: number
  latestBuild: number
  latestVersionName: string
  updateMessage?: string | null
  storeUrl?: string | null
}
