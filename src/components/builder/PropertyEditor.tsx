"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { useCategories } from "@/hooks/useCategories"
import type {
  SectionManifest,
  UpdateSectionMerchPayload,
} from "@/types/theme.types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CategoryBinder from "./CategoryBinder"
import { getSectionTypeMeta } from "./sectionTypesMeta"
import StylePresetPicker from "./StylePresetPicker"
import BannerEditor from "./editors/BannerEditor"
import MosaicEditor from "./editors/MosaicEditor"
import ProductConfigEditor from "./editors/ProductConfigEditor"
import AnimationPicker from "./editors/AnimationPicker"
import ArchedShowcaseEditor from "./editors/ArchedShowcaseEditor"

interface PropertyEditorProps {
  section: SectionManifest
  onConfigChange: (config: Record<string, unknown>) => void
  onMerchBindingChange?: (binding: UpdateSectionMerchPayload) => void
}

function normalizeConfig(config: Record<string, unknown> | null | undefined) {
  return { ...(config ?? {}) }
}

const MERCH_BINDING_SECTION_TYPES = new Set([
  "seasonal_mosaic",
  "category_product_grid",
  "product_carousel",
  "trending_products",
  "promo_carousel",
  "arched_product_showcase",
])

export default function PropertyEditor({
  section,
  onConfigChange,
  onMerchBindingChange,
}: PropertyEditorProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(
    normalizeConfig(section.config)
  )
  const meta = useMemo(
    () => getSectionTypeMeta(section.section_type),
    [section.section_type]
  )
  const supportsMerchBinding = MERCH_BINDING_SECTION_TYPES.has(
    section.section_type
  )

  useEffect(() => {
    setLocalConfig(normalizeConfig(section.config))
  }, [section.id, section.updated_at, section.config])

  const handleConfigChange = (nextConfig: Record<string, unknown>) => {
    setLocalConfig(nextConfig)
    onConfigChange(nextConfig)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
        <div className="mt-1 text-sm text-slate-500">{meta.description}</div>
      </div>

      <Tabs
        key={`${section.id}-${supportsMerchBinding ? "with-data" : "style-only"}`}
        defaultValue="style"
        className="w-full"
      >
        <TabsList
          className={`grid h-auto min-h-11 w-full rounded-2xl bg-slate-100 p-1 ${
            supportsMerchBinding ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          <TabsTrigger value="style" className="min-h-[40px] rounded-xl px-3 text-sm">
            🎨 Style
          </TabsTrigger>
          {supportsMerchBinding ? (
            <TabsTrigger value="data" className="min-h-[40px] rounded-xl px-3 text-sm">
              📁 Data
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="style" className="mt-5 space-y-4">
          <StylePresetPicker
            sectionType={section.section_type}
            config={localConfig}
            onChange={handleConfigChange}
          />
          <StyleEditorRouter
            section={section}
            config={localConfig}
            onChange={handleConfigChange}
          />
        </TabsContent>

        {supportsMerchBinding ? (
          <TabsContent value="data" className="mt-5">
            <CategoryBinder
              section={section}
              onMerchBindingChange={onMerchBindingChange ?? (() => {})}
              persistOnChange={false}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function StyleEditorRouter({
  section,
  config,
  onChange,
}: {
  section: SectionManifest
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  switch (section.section_type) {
    case "animated_banner":
      return <BannerEditor config={config} onChange={onChange} />
    case "seasonal_mosaic":
      return <MosaicEditor config={config} onChange={onChange} />
    case "category_product_grid":
    case "product_carousel":
    case "trending_products":
      return (
        <ProductConfigEditor
          config={config}
          onChange={onChange}
          sectionType={section.section_type}
        />
      )
    case "round_category_icons":
      return <CategoryIconsEditor config={config} onChange={onChange} />
    case "fee_strip":
      return (
        <StripEditor
          config={config}
          onChange={onChange}
          title="Fee Strip"
        />
      )
    case "bank_offers":
      return <BankOffersEditor config={config} onChange={onChange} />
    case "promo_carousel":
      return <PromoCarouselEditor config={config} onChange={onChange} />
    case "arched_product_showcase":
      return <ArchedShowcaseEditor config={config} onChange={onChange} />
    case "custom_banner":
      return <CustomBannerEditor config={config} onChange={onChange} />
    case "text_header":
      return <TextHeaderEditor config={config} onChange={onChange} />
    case "spacer":
      return <SpacerEditor config={config} onChange={onChange} />
    default:
      return null
  }
}

interface CategoryIconConfigItem {
  category_id?: string
  label?: string
  image_url?: string
}

function normalizeCategoryIconItems(value: unknown): CategoryIconConfigItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      category_id:
        typeof item.category_id === "string" ? item.category_id : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      image_url:
        typeof item.image_url === "string" ? item.image_url : undefined,
    }))
}

function CategoryIconsEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const { data: categories } = useCategories()
  const iconSize = typeof config.icon_size === "number" ? config.icon_size : 64
  const gap = typeof config.gap === "number" ? config.gap : 12
  const showLabels =
    typeof config.show_labels === "boolean" ? config.show_labels : true
  const items = normalizeCategoryIconItems(config.items)
  const availableCategories = (categories ?? [])
    .filter((category) => category.is_active)
    .sort((left, right) => left.sort_order - right.sort_order)

  const categoryMap = new Map(
    availableCategories.map((category) => [category.id, category])
  )

  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  const patchItems = (nextItems: CategoryIconConfigItem[]) => {
    patch({ items: nextItems })
  }

  const updateItem = (
    index: number,
    patchItem: Partial<CategoryIconConfigItem>
  ) => {
    const nextItems = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patchItem } : item
    )
    patchItems(nextItems)
  }

  const addItem = () => {
    patchItems([...items, {}])
  }

  return (
    <div className="space-y-6">
      <RangeControl
        id="category-icon-size"
        label="Icon Size"
        value={iconSize}
        min={40}
        max={96}
        step={4}
        unit="px"
        onChange={(value) => patch({ icon_size: value })}
      />

      <RangeControl
        id="category-icon-gap"
        label="Gap"
        value={gap}
        min={4}
        max={24}
        step={2}
        unit="px"
        onChange={(value) => patch({ gap: value })}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-900">Show Labels</div>
          <div className="text-xs text-slate-500">
            Display category names under the icon rail.
          </div>
        </div>
        <Switch checked={showLabels} onCheckedChange={(checked) => patch({ show_labels: checked })} />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Icon Items
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Add custom category icons here. If empty, the app keeps using the
              bound catalog categories.
            </div>
          </div>
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Icon
          </Button>
        </div>

        {items.length ? (
          <div className="space-y-4">
            {items.map((item, index) => {
              const linkedCategory =
                item.category_id != null
                  ? categoryMap.get(item.category_id)
                  : undefined

              return (
                <div
                  key={`${item.category_id ?? "custom"}-${index}`}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">
                      Icon {index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        patchItems(items.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Linked Category</Label>
                    <Select
                      value={item.category_id && item.category_id.length > 0
                        ? item.category_id
                        : "__none__"}
                      onValueChange={(value) =>
                        updateItem(index, {
                          category_id: value === "__none__" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No linked category</SelectItem>
                        {availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`category-icon-label-${index}`}>
                      Label Override
                    </Label>
                    <Input
                      id={`category-icon-label-${index}`}
                      value={item.label ?? ""}
                      placeholder={linkedCategory?.name ?? "Use category name"}
                      onChange={(event) =>
                        updateItem(index, { label: event.target.value })
                      }
                    />
                  </div>

                  <ThemeImageUploader
                    label="Icon Image Override"
                    value={item.image_url ?? null}
                    onChange={(value) =>
                      updateItem(index, { image_url: value ?? "" })
                    }
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            No custom icon items yet.
          </div>
        )}
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function StripEditor({
  config,
  onChange,
  title,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  title: string
}) {
  const visible = typeof config.visible === "boolean" ? config.visible : true
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : "#BFEFFF"
  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  return (
    <div className="space-y-6">
      <ThemeImageUploader
        label={`${title} Image`}
        value={typeof config.image_url === "string" ? config.image_url : null}
        onChange={(value) => patch({ image_url: value })}
      />

      <ThemeColorPicker
        label="Container Color"
        value={containerColor}
        onChange={(value) => patch({ container_color: value })}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-900">Visible</div>
          <div className="text-xs text-slate-500">
            Toggle fallback strip content when no image is present.
          </div>
        </div>
        <Switch checked={visible} onCheckedChange={(checked) => patch({ visible: checked })} />
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function BankOffersEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const visible = typeof config.visible === "boolean" ? config.visible : true
  const imageUrls = Array.isArray(config.image_urls)
    ? (config.image_urls as string[]).filter(
        (value): value is string => typeof value === "string"
      )
    : typeof config.image_url === "string" && config.image_url.trim()
      ? [config.image_url]
      : []

  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  const patchImageUrls = (nextUrls: string[]) => {
    patch({
      image_urls: nextUrls,
      image_url: nextUrls[0] ?? null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-900">Offer Banners</div>
          <div className="text-xs text-slate-500">
            Add up to 10 bank offer images. The app shows them side by side.
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {imageUrls.length}/10
        </div>
      </div>

      <div className="space-y-4">
        {imageUrls.map((imageUrl, index) => (
          <div
            key={`bank-offer-image-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Banner {index + 1}
                </div>
                <div className="text-xs text-slate-500">
                  Horizontal bank offer card shown in the app row.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchImageUrls(
                    imageUrls.filter((_, imageIndex) => imageIndex !== index)
                  )
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>

            <ThemeImageUploader
              label={`Bank Offer Image ${index + 1}`}
              value={imageUrl || null}
              onChange={(value) =>
                patchImageUrls(
                  imageUrls.map((item, imageIndex) =>
                    imageIndex === index ? value ?? "" : item
                  )
                )
              }
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-2xl border-dashed"
          onClick={() => patchImageUrls([...imageUrls, ""])}
          disabled={imageUrls.length >= 10}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Bank Offer Image
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-900">Visible</div>
          <div className="text-xs text-slate-500">
            Show this bank-offer row in the phone feed.
          </div>
        </div>
        <Switch checked={visible} onCheckedChange={(checked) => patch({ visible: checked })} />
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function PromoCarouselEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const aspectRatio =
    typeof config.aspect_ratio === "string" ? config.aspect_ratio : "16:9"
  const borderRadius =
    typeof config.border_radius === "number" ? config.border_radius : 12
  const autoScrollSpeed =
    typeof config.auto_scroll_speed === "number" ? config.auto_scroll_speed : 3000

  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  return (
    <div className="space-y-6">
      <ThemeImageUploader
        label="Promo Banner"
        value={typeof config.image_url === "string" ? config.image_url : null}
        onChange={(value) => patch({ image_url: value })}
      />

      <div className="space-y-2">
        <Label htmlFor="promo-aspect-ratio">Aspect Ratio</Label>
        <Input
          id="promo-aspect-ratio"
          value={aspectRatio}
          onChange={(event) => patch({ aspect_ratio: event.target.value })}
          placeholder="16:9"
        />
      </div>

      <RangeControl
        id="promo-border-radius"
        label="Border Radius"
        value={borderRadius}
        min={0}
        max={32}
        step={2}
        unit="px"
        onChange={(value) => patch({ border_radius: value })}
      />

      <RangeControl
        id="promo-auto-scroll-speed"
        label="Auto Scroll Speed"
        value={autoScrollSpeed}
        min={1000}
        max={8000}
        step={250}
        unit="ms"
        onChange={(value) => patch({ auto_scroll_speed: value })}
      />

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function CustomBannerEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const borderRadius =
    typeof config.border_radius === "number" ? config.border_radius : 12
  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  return (
    <div className="space-y-6">
      <ThemeImageUploader
        label="Custom Banner"
        value={typeof config.image_url === "string" ? config.image_url : null}
        onChange={(value) => patch({ image_url: value })}
      />

      <RangeControl
        id="custom-banner-radius"
        label="Border Radius"
        value={borderRadius}
        min={0}
        max={32}
        step={2}
        unit="px"
        onChange={(value) => patch({ border_radius: value })}
      />

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function TextHeaderEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const text = typeof config.text === "string" ? config.text : "Section Title"
  const fontSize = typeof config.font_size === "number" ? config.font_size : 18
  const color = typeof config.color === "string" ? config.color : "#000000"
  const alignment =
    typeof config.alignment === "string" ? config.alignment : "left"

  const patch = (patchConfig: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patchConfig })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text-header-text">Text</Label>
        <Input
          id="text-header-text"
          value={text}
          onChange={(event) => patch({ text: event.target.value })}
          placeholder="Section Title"
        />
      </div>

      <RangeControl
        id="text-header-font-size"
        label="Font Size"
        value={fontSize}
        min={12}
        max={40}
        step={1}
        unit="px"
        onChange={(value) => patch({ font_size: value })}
      />

      <ThemeColorPicker
        label="Text Color"
        value={color}
        onChange={(value) => patch({ color: value })}
      />

      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-900">Alignment</div>
        <div className="grid grid-cols-3 gap-3">
          {["left", "center", "right"].map((option) => {
            const isActive = alignment === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => patch({ alignment: option })}
                className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                aria-pressed={isActive}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patch({ animation: value })}
      />
    </div>
  )
}

function SpacerEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const height = typeof config.height === "number" ? config.height : 16

  return (
    <RangeControl
      id="spacer-height"
      label="Spacer Height"
      value={height}
      min={4}
      max={80}
      step={2}
      unit="px"
      onChange={(value) => onChange({ ...config, height: value })}
    />
  )
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
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
        onChange={(event) => onChange(Number(event.target.value) || value)}
        className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
      />
    </div>
  )
}
