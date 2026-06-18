"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import CardShapePicker, { type CardShapeOption } from "./CardShapePicker"

interface ArchedShowcaseEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const DEFAULT_CONTAINER_COLOR = "#FDE7C4"

const ARCHED_SHAPES: readonly CardShapeOption[] = [
  {
    value: "arch",
    label: "Arch",
    description: "Puffy curved top",
    preview: (
      <div
        className="relative h-10 w-16 overflow-hidden border border-slate-300 bg-[#FDE7C4] shadow-sm"
        style={{ borderRadius: 18 }}
      >
        <svg
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-4 w-full"
        >
          <path d="M0 28 Q50 -10 100 28 L100 28 L0 28 Z" fill="#F8C988" />
        </svg>
      </div>
    ),
  },
  {
    value: "wave",
    label: "Wave",
    description: "Simple rounded rectangle",
    preview: (
      <div
        className="h-10 w-16 border border-slate-300 bg-[#FDE7C4] shadow-sm"
        style={{ borderRadius: 18 }}
      />
    ),
  },
] as const

function getGradient(
  value: unknown,
  fallback: [string, string]
): [string, string] {
  const gradient = Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0
      )
    : []

  return [gradient[0] ?? fallback[0], gradient[1] ?? fallback[1]]
}

function GradientControl({
  title,
  description,
  enabled,
  onToggle,
  gradient,
  onChange,
  startLabel,
  endLabel,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: (checked: boolean) => void
  gradient: [string, string]
  onChange: (gradient: [string, string]) => void
  startLabel: string
  endLabel: string
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled ? (
        <div className="space-y-4">
          <div
            className="h-12 rounded-xl border border-slate-200"
            style={{
              background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
            }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <ThemeColorPicker
              label={startLabel}
              value={gradient[0]}
              onChange={(start) => onChange([start, gradient[1]])}
            />
            <ThemeColorPicker
              label={endLabel}
              value={gradient[1]}
              onChange={(end) => onChange([gradient[0], end])}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-medium text-slate-600">
          {value}
          {unit}
        </span>
      </div>
      <Input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          onChange(Number.isFinite(nextValue) ? nextValue : value)
        }}
        className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
      />
    </div>
  )
}

function CollapsibleZone({
  title,
  description,
  icon,
  enabled,
  onToggle,
  defaultOpen = false,
  children,
}: {
  title: string
  description: string
  icon: string
  enabled?: boolean
  onToggle?: (checked: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 text-left transition-colors hover:text-slate-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <div>
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="text-xs text-slate-500">{description}</div>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {onToggle != null && (
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              onToggle(checked)
            }}
          />
        )}
      </div>
      {isOpen && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

const PRODUCT_LAYOUTS = [
  {
    value: "horizontal_scroll",
    label: "Scroll",
    render: () => (
      <div className="flex h-[48px] w-[60px] gap-1">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-full w-5 flex-shrink-0 rounded-md bg-slate-800/80"
          />
        ))}
      </div>
    ),
  },
  {
    value: "grid_2col",
    label: "2 Column",
    render: () => (
      <div className="grid h-[48px] w-[60px] grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-md bg-slate-800/80" />
        ))}
      </div>
    ),
  },
  {
    value: "grid_3col",
    label: "3 Column",
    render: () => (
      <div className="grid h-[48px] w-[60px] grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="rounded-md bg-slate-300" />
        ))}
      </div>
    ),
  },
  {
    value: "hero_plus_grid",
    label: "Hero+Grid",
    render: () => (
      <div className="grid h-[48px] w-[60px] grid-cols-2 grid-rows-2 gap-1">
        <div className="col-span-1 row-span-2 rounded-md bg-slate-800/80" />
        <div className="rounded-md bg-slate-300" />
        <div className="rounded-md bg-slate-300" />
      </div>
    ),
  },
  {
    value: "stacked_cards",
    label: "Stacked",
    render: () => (
      <div className="grid h-[48px] w-[60px] grid-rows-3 gap-1">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-md bg-slate-800/80" />
        ))}
      </div>
    ),
  },
] as const

function ProductLayoutPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (variant: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-900">Product Layout</div>
      <div className="grid grid-cols-5 gap-2">
        {PRODUCT_LAYOUTS.map((variant) => {
          const isActive = value === variant.value
          return (
            <button
              key={variant.value}
              type="button"
              onClick={() => onChange(variant.value)}
              className={`rounded-2xl border bg-white p-2 text-center transition-all duration-200 ${
                isActive
                  ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-center">
                {variant.render()}
              </div>
              <div className="mt-2 text-[10px] font-medium leading-tight text-slate-600">
                {variant.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CategoryStripItem {
  label?: string
  image_url?: string
  link?: string
}

function normalizeCategoryStripItems(value: unknown): CategoryStripItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    )
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : undefined,
      image_url:
        typeof item.image_url === "string" ? item.image_url : undefined,
      link: typeof item.link === "string" ? item.link : undefined,
    }))
}

export default function ArchedShowcaseEditor({
  config,
  onChange,
}: ArchedShowcaseEditorProps) {
  // ── Top-level config ──
  const title = typeof config.title === "string" ? config.title : "Top Picks"
  const showTitle =
    typeof config.show_title === "boolean" ? config.show_title : true
  const titleColor =
    typeof config.title_color === "string" ? config.title_color : "#1A1A1A"
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR
  const cardShape = config.card_shape === "wave" ? "wave" : "arch"
  const productLayout =
    typeof config.product_layout === "string"
      ? config.product_layout
      : "horizontal_scroll"
  const backgroundGradient = getGradient(config.bg_gradient, [
    containerColor,
    "#FFF6E7",
  ])
  const boxGradient = getGradient(config.box_gradient, [
    containerColor,
    "#F8CB96",
  ])
  const useBackgroundGradient = Array.isArray(config.bg_gradient)
  const useBoxGradient = Array.isArray(config.box_gradient)
  const archHeight =
    typeof config.arch_height === "number" ? config.arch_height : 14
  const cornerRadius =
    typeof config.corner_radius === "number" ? config.corner_radius : 24

  // ── Banner sub-config ──
  const bannerConfig = (
    typeof config.banner === "object" && config.banner !== null ? config.banner : {}
  ) as Record<string, unknown>
  const bannerEnabled =
    typeof bannerConfig.enabled === "boolean" ? bannerConfig.enabled : false
  const bannerContentSource =
    bannerConfig.content_source === "image" ? "image" : "lottie"
  const bannerLottieUrl =
    typeof bannerConfig.lottie_url === "string" ? bannerConfig.lottie_url : null
  const bannerImageUrl =
    typeof bannerConfig.image_url === "string" ? bannerConfig.image_url : null
  const bannerHeight =
    typeof bannerConfig.height === "number" ? bannerConfig.height : 120
  const bannerGradient = getGradient(bannerConfig.gradient, [
    "#E8F5E9",
    "#C8E6C9",
  ])

  // ── Category strip sub-config ──
  const catConfig = (
    typeof config.category_strip === "object" && config.category_strip !== null
      ? config.category_strip
      : {}
  ) as Record<string, unknown>
  const catEnabled =
    typeof catConfig.enabled === "boolean" ? catConfig.enabled : false
  const catItems = normalizeCategoryStripItems(catConfig.items)
  const catIconSize =
    typeof catConfig.icon_size === "number" ? catConfig.icon_size : 56
  const catShowLabels =
    typeof catConfig.show_labels === "boolean" ? catConfig.show_labels : true

  // ── Helpers ──
  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patch })
  }

  const patchBanner = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...config, banner: { ...bannerConfig, ...patch } })
  }

  const patchCategoryStrip = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...config, category_strip: { ...catConfig, ...patch } })
  }

  const updateCatItem = (
    index: number,
    itemPatch: Partial<CategoryStripItem>
  ) => {
    const nextItems = catItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...itemPatch } : item
    )
    patchCategoryStrip({ items: nextItems })
  }

  return (
    <div className="space-y-4">
      <CollapsibleZone
        title="Section Title"
        description="Name shown above the showcase"
        icon="✏️"
        enabled={showTitle}
        onToggle={(checked) => patchConfig({ show_title: checked })}
        defaultOpen
      >
        <Input
          id="arched-showcase-title"
          value={title}
          onChange={(event) => patchConfig({ title: event.target.value })}
          placeholder="Top Picks"
        />
        <ThemeColorPicker
          label="Title Color"
          value={titleColor}
          onChange={(value) => patchConfig({ title_color: value })}
        />
      </CollapsibleZone>

      <CollapsibleZone
        title="Banner Animation"
        description="Lottie or image banner above the products"
        icon="🎬"
        enabled={bannerEnabled}
        onToggle={(checked) => patchBanner({ enabled: checked })}
      >
        <div className="space-y-3">
          <Label>Content Source</Label>
          <RadioGroup
            value={bannerContentSource}
            onValueChange={(value) =>
              patchBanner({
                content_source: value,
                image_url: value === "image" ? bannerImageUrl : null,
                lottie_url: value === "lottie" ? bannerLottieUrl : null,
              })
            }
            className="grid grid-cols-2 gap-3"
          >
            {[
              { value: "lottie", label: "Lottie Animation" },
              { value: "image", label: "Static Image" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </div>

        {bannerContentSource === "lottie" ? (
          <ThemeImageUploader
            label="Lottie File"
            value={bannerLottieUrl}
            onChange={(value) => patchBanner({ lottie_url: value })}
            accept=".lottie,.json"
          />
        ) : (
          <ThemeImageUploader
            label="Banner Image"
            value={bannerImageUrl}
            onChange={(value) => patchBanner({ image_url: value })}
          />
        )}

        <RangeControl
          id="banner-height"
          label="Banner Height"
          value={bannerHeight}
          min={60}
          max={200}
          step={10}
          unit="px"
          onChange={(value) => patchBanner({ height: value })}
        />

        <GradientControl
          title="Banner Gradient"
          description="Gradient behind the banner content"
          enabled
          onToggle={() => {}}
          gradient={bannerGradient}
          onChange={(gradient) => patchBanner({ gradient })}
          startLabel="Start"
          endLabel="End"
        />
      </CollapsibleZone>

      <CollapsibleZone
        title="Category Strip"
        description="Quick-access category icons below the banner"
        icon="🔘"
        enabled={catEnabled}
        onToggle={(checked) => patchCategoryStrip({ enabled: checked })}
      >
        <RangeControl
          id="cat-icon-size"
          label="Icon Size"
          value={catIconSize}
          min={40}
          max={80}
          step={4}
          unit="px"
          onChange={(value) => patchCategoryStrip({ icon_size: value })}
        />

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-900">Show Labels</div>
            <div className="text-xs text-slate-500">Display names under icons</div>
          </div>
          <Switch
            checked={catShowLabels}
            onCheckedChange={(checked) =>
              patchCategoryStrip({ show_labels: checked })
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              Category Items
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patchCategoryStrip({
                  items: [
                    ...catItems,
                    { label: "", image_url: "", link: "" },
                  ],
                })
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </div>

          {catItems.length > 0 ? (
            <div className="space-y-3">
              {catItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-700">
                      Item {index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        patchCategoryStrip({
                          items: catItems.filter(
                            (_, itemIndex) => itemIndex !== index
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                  <Input
                    value={item.label ?? ""}
                    placeholder="Category label"
                    onChange={(event) =>
                      updateCatItem(index, { label: event.target.value })
                    }
                  />
                  <Input
                    value={item.link ?? ""}
                    placeholder="Link (e.g. /categories/fruits)"
                    onChange={(event) =>
                      updateCatItem(index, { link: event.target.value })
                    }
                  />
                  <ThemeImageUploader
                    label="Icon"
                    value={item.image_url ?? null}
                    onChange={(value) =>
                      updateCatItem(index, { image_url: value ?? "" })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              No category items yet. Click &quot;Add&quot; to create one.
            </div>
          )}
        </div>
      </CollapsibleZone>

      <CollapsibleZone
        title="Product Display"
        description="Layout, card shape, and styling"
        icon="🛒"
        defaultOpen
      >
        <ProductLayoutPicker
          value={productLayout}
          onChange={(value) => patchConfig({ product_layout: value })}
        />

        <CardShapePicker
          label="Card Shape"
          value={cardShape}
          onChange={(value) => patchConfig({ card_shape: value })}
          options={ARCHED_SHAPES}
        />

        <GradientControl
          title="Card Gradient"
          description="Vertical gradient per card"
          enabled={useBoxGradient}
          onToggle={(checked) =>
            patchConfig({ box_gradient: checked ? boxGradient : null })
          }
          gradient={boxGradient}
          onChange={(gradient) => patchConfig({ box_gradient: gradient })}
          startLabel="Card Start"
          endLabel="Card End"
        />

        {cardShape === "arch" && (
          <RangeControl
            id="arch-height"
            label="Arch Height"
            value={archHeight}
            min={0}
            max={30}
            step={2}
            unit="px"
            onChange={(value) => patchConfig({ arch_height: value })}
          />
        )}

        <RangeControl
          id="corner-radius"
          label="Corner Radius"
          value={cornerRadius}
          min={8}
          max={40}
          step={2}
          unit="px"
          onChange={(value) => patchConfig({ corner_radius: value })}
        />
      </CollapsibleZone>

      <CollapsibleZone
        title="Section Background"
        description="Container color and gradient"
        icon="🎨"
      >
        <ThemeColorPicker
          label="Background Color"
          value={containerColor}
          onChange={(value) => patchConfig({ container_color: value })}
        />
        <GradientControl
          title="Background Gradient"
          description="Blend two colors behind the entire section"
          enabled={useBackgroundGradient}
          onToggle={(checked) =>
            patchConfig({ bg_gradient: checked ? backgroundGradient : null })
          }
          gradient={backgroundGradient}
          onChange={(gradient) => patchConfig({ bg_gradient: gradient })}
          startLabel="Start"
          endLabel="End"
        />
      </CollapsibleZone>
    </div>
  )
}
