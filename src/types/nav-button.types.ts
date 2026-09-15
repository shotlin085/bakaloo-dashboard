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
export type NavButtonIconType = "PRESET" | "CUSTOM"
/** BOTTOM_NAV: the single 5th bottom-nav slot — at most one row resolves
 * per viewer. PROFILE_MENU: an unbounded list of buttons on the Profile
 * screen — every matching active row renders. */
export type NavButtonPlacement = "BOTTOM_NAV" | "PROFILE_MENU"

export interface NavButton {
  id: string
  label: string
  icon_type: NavButtonIconType
  icon_key: NavButtonIconKey | null
  accent_color: string | null
  /** Required when icon_type is CUSTOM — rendered as-is with no colored
   * badge behind it, unlike a PRESET icon. */
  custom_icon_active_url: string | null
  /** Optional CUSTOM counterpart; falls back to custom_icon_active_url. */
  custom_icon_inactive_url: string | null
  destination_type: NavButtonDestinationType
  destination_value: string
  pass_identity: boolean
  audience: NavButtonAudience
  target_segment_id: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  sort_order: number
  placement: NavButtonPlacement
  created_at: string
  updated_at: string
}

export interface CreateNavButtonPayload {
  label: string
  iconType?: NavButtonIconType
  iconKey?: NavButtonIconKey | null
  accentColor?: string | null
  customIconActiveUrl?: string | null
  customIconInactiveUrl?: string | null
  destinationType: NavButtonDestinationType
  destinationValue: string
  passIdentity?: boolean
  audience?: NavButtonAudience
  targetSegmentId?: string | null
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
  placement?: NavButtonPlacement
}

export type UpdateNavButtonPayload = Partial<CreateNavButtonPayload>
