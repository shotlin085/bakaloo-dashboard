/**
 * Seasonal Mosaic V2 — shared model + slot registry.
 *
 * The mosaic section stores its content in the (untyped) section `config` jsonb.
 * We keep snake_case keys to match the rest of the section-config convention
 * (`layout_variant`, `container_color`, `hero_title`, ...).
 *
 * Backward compatibility:
 *  - Legacy themes only have `hero_title` / `hero_gradient` / `hero_badge_text`
 *    and read their mini tiles from the global theme preset.
 *  - On read we synthesise `hero_tile` from the legacy keys when `hero_tile`
 *    is absent, and we keep writing the legacy keys so older Flutter builds
 *    keep rendering.
 */

export type MosaicLayout =
  | "hero_plus_four"
  | "two_by_three"
  | "single_hero"
  | "two_by_two"
  | "stacked_banners"

export type TileActionType =
  | "none"
  | "product"
  | "category"
  | "tab"
  | "app_page"
  | "external_url"

export interface TileAction {
  type: TileActionType
  /** productId | categoryId | tab key | app page key | https url */
  value: string | null
}

export interface MosaicTile {
  title: string
  gradient: [string, string]
  imageUrl: string | null
  imageFit: "cover" | "contain"
  /** Hero tiles only */
  badgeText?: string
  badgeGradient?: [string, string]
  action: TileAction
}

export interface MosaicSlots {
  hero: number
  mini: number
}

export const MOSAIC_SLOTS: Record<MosaicLayout, MosaicSlots> = {
  hero_plus_four: { hero: 1, mini: 4 },
  single_hero: { hero: 1, mini: 0 },
  two_by_two: { hero: 0, mini: 4 },
  two_by_three: { hero: 0, mini: 6 },
  stacked_banners: { hero: 0, mini: 3 },
}

export const TAB_PAGE_OPTIONS = [
  { value: "home", label: "Home tab" },
  { value: "off_zone", label: "Off Zone tab" },
  { value: "super_mall", label: "Super Mall tab" },
  { value: "cafe", label: "Cafe tab" },
] as const

export const APP_PAGE_OPTIONS = [
  { value: "/search", label: "Search" },
  { value: "/cart", label: "Cart" },
  { value: "/categories", label: "Categories" },
  { value: "/orders", label: "Orders" },
  { value: "/profile/wishlist", label: "Wishlist" },
  { value: "/profile", label: "Profile" },
] as const

const DEFAULT_HERO_GRADIENT: [string, string] = ["#3F99FE", "#55C5FD"]
const DEFAULT_MINI_GRADIENT: [string, string] = ["#4F97FF", "#397BF1"]
const DEFAULT_BADGE_GRADIENT: [string, string] = ["#FF4CB7", "#D91B83"]

const DEFAULT_MINI_TITLES = ["Frozen Fizz", "Scoop Magic", "Crunch Break", "Dairy Daily"]

export const DEFAULT_CONTAINER_COLOR = "#D8F4FF"

export function normalizeLayout(value: unknown): MosaicLayout {
  if (
    value === "hero_plus_four" ||
    value === "two_by_three" ||
    value === "single_hero" ||
    value === "two_by_two" ||
    value === "stacked_banners"
  ) {
    return value
  }
  return "hero_plus_four"
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function asGradient(value: unknown, fallback: [string, string]): [string, string] {
  if (Array.isArray(value)) {
    const start = typeof value[0] === "string" ? value[0] : fallback[0]
    const end = typeof value[1] === "string" ? value[1] : fallback[1]
    return [start, end]
  }
  return fallback
}

function asAction(value: unknown): TileAction {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const type = asString(record.type)
    if (
      type === "product" ||
      type === "category" ||
      type === "tab" ||
      type === "app_page" ||
      type === "external_url"
    ) {
      return { type, value: asString(record.value) ?? null }
    }
  }
  return { type: "none", value: null }
}

function readTile(value: unknown, fallback: MosaicTile): MosaicTile {
  if (!value || typeof value !== "object") return fallback
  const record = value as Record<string, unknown>
  const fit = asString(record.image_fit ?? record.imageFit)
  return {
    title: asString(record.title) ?? fallback.title,
    gradient: asGradient(record.gradient, fallback.gradient),
    imageUrl: asString(record.image_url ?? record.imageUrl) ?? null,
    imageFit: fit === "contain" ? "contain" : "cover",
    badgeText: asString(record.badge_text ?? record.badgeText) ?? fallback.badgeText,
    badgeGradient: asGradient(
      record.badge_gradient ?? record.badgeGradient,
      fallback.badgeGradient ?? DEFAULT_BADGE_GRADIENT
    ),
    action: asAction(record.action),
  }
}

export function defaultHeroTile(config: Record<string, unknown>): MosaicTile {
  return {
    title: asString(config.hero_title) ?? "Summer Cool Deals",
    gradient: asGradient(config.hero_gradient, DEFAULT_HERO_GRADIENT),
    imageUrl: null,
    imageFit: "cover",
    badgeText: asString(config.hero_badge_text) ?? "BUY 2 GET 1",
    badgeGradient: DEFAULT_BADGE_GRADIENT,
    action: { type: "none", value: null },
  }
}

export function defaultMiniTile(index: number): MosaicTile {
  return {
    title: DEFAULT_MINI_TITLES[index % DEFAULT_MINI_TITLES.length],
    gradient: DEFAULT_MINI_GRADIENT,
    imageUrl: null,
    imageFit: "cover",
    action: { type: "none", value: null },
  }
}

export interface MosaicTiles {
  hero: MosaicTile | null
  mini: MosaicTile[]
}

/** Read hero + mini tiles from section config, padded/truncated to the variant. */
export function readMosaicTiles(
  config: Record<string, unknown>,
  layout: MosaicLayout
): MosaicTiles {
  const slots = MOSAIC_SLOTS[layout]

  const hero =
    slots.hero > 0 ? readTile(config.hero_tile, defaultHeroTile(config)) : null

  const storedMini = Array.isArray(config.mini_tiles) ? config.mini_tiles : []
  const mini: MosaicTile[] = Array.from({ length: slots.mini }, (_, i) =>
    readTile(storedMini[i], defaultMiniTile(i))
  )

  return { hero, mini }
}

function tileToConfig(tile: MosaicTile, includeBadge: boolean): Record<string, unknown> {
  const base: Record<string, unknown> = {
    title: tile.title,
    gradient: tile.gradient,
    image_url: tile.imageUrl,
    image_fit: tile.imageFit,
    action: tile.action.type === "none" ? { type: "none", value: null } : tile.action,
  }
  if (includeBadge) {
    base.badge_text = tile.badgeText ?? ""
    base.badge_gradient = tile.badgeGradient ?? DEFAULT_BADGE_GRADIENT
  }
  return base
}

/** Write hero + mini tiles back to config, preserving legacy keys for old builds. */
export function writeMosaicTiles(
  config: Record<string, unknown>,
  tiles: MosaicTiles
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config }

  if (tiles.hero) {
    next.hero_tile = tileToConfig(tiles.hero, true)
    // Keep legacy keys in sync so older Flutter builds keep rendering.
    next.hero_title = tiles.hero.title
    next.hero_gradient = tiles.hero.gradient
    next.hero_badge_text = tiles.hero.badgeText ?? ""
  }

  next.mini_tiles = tiles.mini.map((tile) => tileToConfig(tile, false))

  return next
}
