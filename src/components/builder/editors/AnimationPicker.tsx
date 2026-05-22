"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface AnimationPickerProps {
  value: string
  onChange: (value: string) => void
}

const ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade_in", label: "Fade In" },
  { value: "slide_up", label: "Slide Up" },
  { value: "scale", label: "Scale" },
  { value: "bounce", label: "Bounce" },
] as const

function getPreviewClass(value: string) {
  switch (value) {
    case "fade_in":
      return "group-hover:opacity-50"
    case "slide_up":
      return "group-hover:-translate-y-1"
    case "scale":
      return "group-hover:scale-105"
    case "bounce":
      return "group-hover:animate-bounce"
    default:
      return ""
  }
}

export default function AnimationPicker({
  value,
  onChange,
}: AnimationPickerProps) {
  const normalizedValue = value || "none"

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-900">Animation</div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
        <Select value={normalizedValue} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select animation" />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="group flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div
            className={cn(
              "h-10 w-20 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all duration-200",
              getPreviewClass(normalizedValue)
            )}
          />
        </div>
      </div>
    </div>
  )
}
