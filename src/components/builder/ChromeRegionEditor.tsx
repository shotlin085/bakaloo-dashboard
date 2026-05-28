"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { useUpdateTheme } from "@/hooks/useThemes"
import type {
  Theme,
  ThemeData,
  ThemeSections,
  UpdateThemePayload,
} from "@/types/theme.types"
import {
  CHROME_REGION_META,
  getChromeRegionMeta,
  type ChromeRegion,
} from "./chromeRegions"

interface ChromeRegionEditorProps {
  region: ChromeRegion
  theme: Theme | null
  onClose: () => void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultThemeSections(): ThemeSections {
  // Mirror server-side defaults; safe additive shape so missing fields fall back.
  return {
    topBar: { backgroundColor: "#88D4FE", textColor: "#111827" },
    storeSelector: { backgroundColor: "#88D4FE", activeChipColor: "#B1EAFF" },
    categoryTabs: {
      visible: true,
      textColor: "#111827",
      indicatorColor: "#111827",
    },
    searchZone: {
      backgroundColor: "#FFFFFF",
      waveColor: "#88D4FE",
      searchHints: [],
      promoBoxImageUrl: null,
    },
    bannerAnimation: {
      lottieUrl: null,
      backgroundGradient: ["#E8F5E9", "#C8E6C9"],
      containerColor: "#FFFFFF",
    },
    feeStrip: { imageUrl: null, visible: true },
    seasonalMosaic: {
      containerColor: "#FFF8E1",
      heroTile: {
        title: "Hero",
        gradient: ["#FFF8E1", "#FFE082"],
        badgeText: "",
        badgeGradient: ["#FFB300", "#F57C00"],
      },
      miniTiles: [],
    },
    bankOffers: { visible: true, bannerImageUrls: [] },
  }
}

export default function ChromeRegionEditor({
  region,
  theme,
  onClose,
}: ChromeRegionEditorProps) {
  const meta = getChromeRegionMeta(region)
  const updateThemeMutation = useUpdateTheme()

  // Local theme_data draft (mirrors the server theme until Apply).
  const [draft, setDraft] = useState<ThemeData>(() => {
    if (theme?.theme_data) return deepClone(theme.theme_data)
    return {
      sections: defaultThemeSections(),
      meta: { seasonLabel: "default", statusBarBrightness: "dark" },
    }
  })

  useEffect(() => {
    if (theme?.theme_data) {
      setDraft(deepClone(theme.theme_data))
    }
  }, [theme?.id, theme?.updated_at, theme?.theme_data])

  const isDirty = useMemo(() => {
    if (!theme?.theme_data) return false
    return JSON.stringify(theme.theme_data) !== JSON.stringify(draft)
  }, [theme?.theme_data, draft])

  const patchSections = (patch: Partial<ThemeSections>) => {
    setDraft((prev) => ({
      ...prev,
      sections: { ...prev.sections, ...patch },
    }))
  }

  const handleApply = async () => {
    if (!theme || !isDirty) return
    const payload: UpdateThemePayload = { theme_data: draft }
    await updateThemeMutation.mutateAsync({ id: theme.id, payload })
  }

  const handleReset = () => {
    if (!theme?.theme_data) return
    setDraft(deepClone(theme.theme_data))
  }

  const isBusy = updateThemeMutation.isPending

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-[28px]">
      <div
        className="border-b border-slate-200/80 px-4 py-4"
        style={{
          borderBottomColor: "var(--store-accent, inherit)",
          borderBottomWidth: 2,
          transition: "border-bottom-color 200ms ease",
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close chrome editor"
          >
            <RotateCcw className="h-4 w-4 rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Editing Theme Region
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {meta.label}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {meta.description}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700"
          >
            Theme
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {!theme ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No active theme is bound to this tab yet. Create or assign a theme
            to this tab from the Themes page first.
          </div>
        ) : (
          <RegionFields
            region={region}
            sections={draft.sections}
            patchSections={patchSections}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-3 py-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          disabled={!isDirty || isBusy || !theme}
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          type="button"
          disabled={!isDirty || isBusy || !theme}
          onClick={handleApply}
        >
          {isBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Apply Theme Changes
        </Button>
      </div>
    </div>
  )
}

function RegionFields({
  region,
  sections,
  patchSections,
}: {
  region: ChromeRegion
  sections: ThemeSections
  patchSections: (patch: Partial<ThemeSections>) => void
}) {
  switch (region) {
    case "top_bar":
      return (
        <div className="space-y-4">
          <ThemeColorPicker
            label="Top bar background"
            value={sections.topBar.backgroundColor}
            onChange={(hex) =>
              patchSections({
                topBar: { ...sections.topBar, backgroundColor: hex },
              })
            }
          />
          <ThemeColorPicker
            label="Top bar text color"
            value={sections.topBar.textColor}
            onChange={(hex) =>
              patchSections({
                topBar: { ...sections.topBar, textColor: hex },
              })
            }
          />
        </div>
      )
    case "search_bar":
      return (
        <div className="space-y-4">
          <ThemeColorPicker
            label="Search zone background"
            value={sections.searchZone.backgroundColor}
            onChange={(hex) =>
              patchSections({
                searchZone: {
                  ...sections.searchZone,
                  backgroundColor: hex,
                },
              })
            }
          />
          <ThemeColorPicker
            label="Wave divider color"
            value={sections.searchZone.waveColor}
            onChange={(hex) =>
              patchSections({
                searchZone: { ...sections.searchZone, waveColor: hex },
              })
            }
          />
        </div>
      )
    case "category_tabs":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Label className="text-sm font-medium text-slate-900">
              Show category tabs
            </Label>
            <Switch
              checked={sections.categoryTabs.visible}
              onCheckedChange={(visible) =>
                patchSections({
                  categoryTabs: { ...sections.categoryTabs, visible },
                })
              }
            />
          </div>
          <ThemeColorPicker
            label="Tab text color"
            value={sections.categoryTabs.textColor}
            onChange={(hex) =>
              patchSections({
                categoryTabs: { ...sections.categoryTabs, textColor: hex },
              })
            }
          />
          <ThemeColorPicker
            label="Active indicator color"
            value={sections.categoryTabs.indicatorColor}
            onChange={(hex) =>
              patchSections({
                categoryTabs: {
                  ...sections.categoryTabs,
                  indicatorColor: hex,
                },
              })
            }
          />
        </div>
      )
    case "store_chips":
      return (
        <div className="space-y-4">
          <ThemeColorPicker
            label="Store strip background"
            value={sections.storeSelector.backgroundColor}
            onChange={(hex) =>
              patchSections({
                storeSelector: {
                  ...sections.storeSelector,
                  backgroundColor: hex,
                },
              })
            }
          />
          <ThemeColorPicker
            label="Active chip background"
            value={sections.storeSelector.activeChipColor}
            onChange={(hex) =>
              patchSections({
                storeSelector: {
                  ...sections.storeSelector,
                  activeChipColor: hex,
                },
              })
            }
          />
          <p className="text-xs text-slate-500">
            The store strip is hidden in the current mobile experience but its
            colors still apply to the preview chrome.
          </p>
        </div>
      )
    case "bottom_nav":
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Bottom nav style is currently driven by the active store config and
            is not yet stored in <code>theme_data</code>. Editing here is
            disabled until the dedicated <code>bottomNav</code> theme field is
            added.
          </p>
          <p className="text-xs text-slate-500">
            For now, change bottom-nav colors by switching the active store via
            tabs or contact the design system owner to extend{" "}
            <code>ThemeSections</code>.
          </p>
        </div>
      )
    default:
      return null
  }
}

export { CHROME_REGION_META }
