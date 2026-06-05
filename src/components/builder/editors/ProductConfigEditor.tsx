"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { SectionType } from "@/types/theme.types"
import AnimationPicker from "./AnimationPicker"
import CardShapePicker from "./CardShapePicker"

interface ProductConfigEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  sectionType?: SectionType
}

// PHASE 5D: Section-level product count cap for manifest sections.
// ProductCarousel and CategoryProductGrid sections show at most 12 cards on
// the home screen; the backend now enforces HOME_MANIFEST_SECTION_CAP=12.
const SECTION_LIMIT_MAX = 12
const SECTION_LIMIT_WARN = 10 // show advisory above this

const COLUMN_OPTIONS = [2, 3, 4] as const

/**
 * Product card visual styles offered to admins. Values are the canonical
 * UPPER_SNAKE tokens persisted into `section.config.product_card_style` and
 * read verbatim by the Flutter app (`productCardVariantFromString`). Keep these
 * in lock-step with the Flutter `ProductCardVariant` enum.
 *
 * Default is QUICK_COMMERCE_COMPACT — sections saved without this key (older
 * themes) fall back to it on the app side too.
 */
const PRODUCT_CARD_STYLES = [
  {
    value: "QUICK_COMMERCE_COMPACT",
    label: "Quick Commerce (Compact)",
    description: "Premium reference card — price sticker, discount line, rating & delivery.",
  },
  {
    value: "BAKALOO_LEGACY_CLEAN",
    label: "Bakaloo Legacy (Clean)",
    description: "Classic simpler card — plain price, minimal chrome.",
  },
] as const

const DEFAULT_PRODUCT_CARD_STYLE = "QUICK_COMMERCE_COMPACT"

export default function ProductConfigEditor({
  config,
  onChange,
  sectionType,
}: ProductConfigEditorProps) {
  const title = typeof config.title === "string" ? config.title : "Products"
  const columns = typeof config.columns === "number" ? config.columns : 3
  const cardShape =
    typeof config.card_shape === "string" ? config.card_shape : "rounded"
  const autoScroll = Boolean(config.auto_scroll)
  const limit = typeof config.limit === "number" ? config.limit : 6
  const productCardStyle =
    typeof config.product_card_style === "string"
      ? config.product_card_style
      : DEFAULT_PRODUCT_CARD_STYLE
  const showColumns = sectionType === "category_product_grid"
  const showAutoScroll = sectionType === "product_carousel"

  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({
      ...config,
      ...patch,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="product-editor-title">Title</Label>
        <Input
          id="product-editor-title"
          value={title}
          onChange={(event) => patchConfig({ title: event.target.value })}
          placeholder="Products"
        />
      </div>

      {showColumns ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-900">Columns</div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {COLUMN_OPTIONS.map((option) => {
              const isActive = option === columns
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => patchConfig({ columns: option })}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:py-3",
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                  aria-pressed={isActive}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <CardShapePicker
        value={cardShape}
        onChange={(value) => patchConfig({ card_shape: value })}
      />

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-slate-900">
            Product Card Style
          </div>
          <p className="text-xs text-slate-500">
            Controls how product cards look in the mobile app for this section.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRODUCT_CARD_STYLES.map((option) => {
            const isActive = option.value === productCardStyle
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  patchConfig({ product_card_style: option.value })
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  isActive
                    ? "border-blue-500 bg-blue-50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
                aria-pressed={isActive}
              >
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-blue-700" : "text-slate-800"
                  )}
                >
                  {option.label}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          Default is Quick Commerce (Compact). Existing sections without a style
          keep this default.
        </p>
      </div>

      {showAutoScroll ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-900">Auto Scroll</div>
            <div className="text-xs text-slate-500">
              Keep the carousel moving automatically in preview.
            </div>
          </div>
          <Switch
            checked={autoScroll}
            onCheckedChange={(checked) => patchConfig({ auto_scroll: checked })}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="product-limit">Product Limit</Label>
          <span className="text-sm font-medium text-slate-600">{limit}</span>
        </div>
        <Input
          id="product-limit"
          type="range"
          min={4}
          max={SECTION_LIMIT_MAX}
          step={1}
          value={Math.min(limit, SECTION_LIMIT_MAX)}
          onChange={(event) =>
            patchConfig({ limit: Number(event.target.value) || 6 })
          }
          className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
        />
        {/* PHASE 5D: Advisory when limit is near the cap */}
        {limit > SECTION_LIMIT_WARN ? (
          <p className="flex items-center gap-1 text-xs text-amber-700">
            <span>⚠️</span>
            <span>
              Mobile API caps this section at {SECTION_LIMIT_MAX} items.
            </span>
          </p>
        ) : null}
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patchConfig({ animation: value })}
      />
    </div>
  )
}
