/** Must exactly mirror NAV_BUTTON_ICON_KEYS in bakaloo-backend's
 * src/modules/admin/nav-buttons/nav-buttons.schema.js — the backend
 * rejects anything outside this list, so keep both in sync by hand. */
export const NAV_BUTTON_ICON_KEYS = [
  "gift", "gameController", "crown", "crownSimple", "star", "starFour",
  "sparkle", "fire", "rocket", "rocketLaunch", "trophy", "medal", "target",
  "ticket", "confetti", "diamond", "shieldStar", "moonStars",
  "house", "basket", "bag", "handbag", "storefront", "tag", "percent",
  "lightning", "megaphone", "bell", "heart", "shoppingBag", "shoppingCart",
  "coin", "wallet", "image", "globe", "browser", "deviceMobile",
] as const

export type NavButtonIconKey = (typeof NAV_BUTTON_ICON_KEYS)[number]

export type NavButtonDestinationType = "APP_ROUTE" | "CATEGORY" | "PRODUCT" | "WEBVIEW"
export type NavButtonAudience = "B2C" | "B2B" | "ALL"

export interface NavButton {
  id: string
  label: string
  icon_key: NavButtonIconKey
  accent_color: string | null
  destination_type: NavButtonDestinationType
  destination_value: string
  pass_identity: boolean
  audience: NavButtonAudience
  target_segment_id: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateNavButtonPayload {
  label: string
  iconKey: NavButtonIconKey
  accentColor?: string | null
  destinationType: NavButtonDestinationType
  destinationValue: string
  passIdentity?: boolean
  audience?: NavButtonAudience
  targetSegmentId?: string | null
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
}

export type UpdateNavButtonPayload = Partial<CreateNavButtonPayload>
