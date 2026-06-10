"use client"

import { ArrowLeft, Layers, Paintbrush } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  SectionManifest,
  SectionType,
  Theme,
  ThemeData,
  UpdateSectionMerchPayload,
} from "@/types/theme.types"
import ChromeRegionEditor from "./ChromeRegionEditor"
import type { ChromeRegion } from "./chromeRegions"
import PropertyEditor from "./PropertyEditor"
import SectionLibrary from "./SectionLibrary"
import { getSectionTypeMeta } from "./sectionTypesMeta"

interface RightPanelProps {
  sections: SectionManifest[]
  selectedSection: SectionManifest | null
  onAdd: (sectionType: SectionType, defaultConfig: Record<string, unknown>) => void
  onConfigChange: (config: Record<string, unknown>) => void
  onMerchBindingChange: (binding: UpdateSectionMerchPayload) => void
  onBack?: () => void
  /** Currently selected chrome region (top bar, search, etc.) for theme-level editing. */
  selectedChromeRegion?: ChromeRegion | null
  /** Active theme bound to the current tab (for chrome editor). */
  activeTheme?: Theme | null
  /** Close the chrome editor and return to library/property editor. */
  onCloseChromeEditor?: () => void
  /** Live callback from ChromeRegionEditor whenever the draft changes — enables immediate preview */
  onChromeRegionDraftChange?: (draft: ThemeData) => void
}

export default function RightPanel({
  sections,
  selectedSection,
  onAdd,
  onConfigChange,
  onMerchBindingChange,
  onBack,
  selectedChromeRegion,
  activeTheme,
  onCloseChromeEditor,
  onChromeRegionDraftChange,
}: RightPanelProps) {
  if (selectedChromeRegion) {
    return (
      <ChromeRegionEditor
        region={selectedChromeRegion}
        theme={activeTheme ?? null}
        onClose={() => onCloseChromeEditor?.()}
        onDraftChange={onChromeRegionDraftChange}
      />
    )
  }

  if (selectedSection) {
    const meta = getSectionTypeMeta(selectedSection.section_type)
    const Icon = meta.icon

    return (
      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-[28px]">
        {/* Editor Header — shows which section you're editing */}
        <div
          className="border-b border-slate-200/80 px-4 py-4"
          style={{ borderBottomColor: "var(--store-accent, inherit)", borderBottomWidth: 2, transition: "border-bottom-color 200ms ease" }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onBack}
              aria-label="Back to library"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                meta.accentClassName
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Editing Section
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {meta.label}
              </div>
            </div>

            <Badge
              variant="secondary"
              className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700"
            >
              <Paintbrush className="mr-1 h-3 w-3" />
              Editor
            </Badge>
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: "var(--store-accent)" }}
            />
          </div>
        </div>

        {/* Scrollable editor content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <PropertyEditor
            section={selectedSection}
            onConfigChange={onConfigChange}
            onMerchBindingChange={onMerchBindingChange}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-[28px]">
      {/* Library Header */}
      <div className="border-b border-slate-200/80 px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600"
          >
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Component Library
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Add Sections
            </div>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
          >
            {sections.filter((s) => s.visible).length} visible
          </Badge>
        </div>
      </div>

      {/* Scrollable library content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <SectionLibrary sections={sections} onAdd={onAdd} />
      </div>
    </div>
  )
}
