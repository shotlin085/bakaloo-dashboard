/* ── App Branding Types ──────────────────────── */

export interface BrandingConfig {
  splashImageUrl: string | null
  logoImageUrl: string | null
}

export type UpdateBrandingPayload = BrandingConfig
