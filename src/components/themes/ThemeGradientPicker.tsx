"use client"

import { Label } from "@/components/ui/label"
import { ThemeColorPicker } from "./ThemeColorPicker"

interface ThemeGradientPickerProps {
  label: string
  value: [string, string]
  onChange: (gradient: [string, string]) => void
}

export function ThemeGradientPicker({
  label,
  value,
  onChange,
}: ThemeGradientPickerProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <div
          className="h-12 rounded-md border"
          style={{
            background: `linear-gradient(135deg, ${value[0]}, ${value[1]})`,
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ThemeColorPicker
          label="Start Color"
          value={value[0]}
          onChange={(start) => onChange([start, value[1]])}
        />
        <ThemeColorPicker
          label="End Color"
          value={value[1]}
          onChange={(end) => onChange([value[0], end])}
        />
      </div>
    </div>
  )
}
