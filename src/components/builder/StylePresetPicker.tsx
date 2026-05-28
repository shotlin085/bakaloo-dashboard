"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SectionType } from "@/types/theme.types"
import {
  applyStylePreset,
  getStylePresets,
  type SectionStylePreset,
} from "./sectionStylePresets"

interface StylePresetPickerProps {
  sectionType: SectionType
  config: Record<string, unknown>
  onChange: (nextConfig: Record<string, unknown>) => void
}

/**
 * Compact horizontal preset picker. Each preset deep-merges its `patch` over
 * the current config — never replaces the whole thing.
 */
export default function StylePresetPicker({
  sectionType,
  config,
  onChange,
}: StylePresetPickerProps) {
  const presets = getStylePresets(sectionType)
  if (presets.length === 0) return null

  const handleApply = (preset: SectionStylePreset) => {
    onChange(applyStylePreset(config, preset.patch))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Style presets
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleApply(preset)}
            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs"
            title={preset.description}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
