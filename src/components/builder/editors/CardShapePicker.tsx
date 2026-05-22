"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CardShapePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options?: readonly CardShapeOption[]
}

export interface CardShapeOption {
  value: string
  label: string
  description?: string
  radius?: number
  preview?: ReactNode
}

const CARD_SHAPES = [
  { value: "rounded", label: "Rounded", radius: 8 },
  { value: "square", label: "Square", radius: 0 },
  { value: "pill", label: "Pill", radius: 20 },
] as const

export default function CardShapePicker({
  label = "Card Shape",
  value,
  onChange,
  options = CARD_SHAPES,
}: CardShapePickerProps) {
  const gridClassName =
    options.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className={cn("grid gap-2 sm:gap-3", gridClassName)}>
        {options.map((shape) => {
          const isActive = shape.value === value
          return (
            <button
              key={shape.value}
              type="button"
              onClick={() => onChange(shape.value)}
              className={cn(
                "rounded-2xl border bg-white p-3 text-left transition-all duration-200",
                isActive
                  ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              )}
              aria-pressed={isActive}
            >
              <div className="flex h-14 items-center justify-center rounded-xl bg-slate-50 sm:h-16">
                {shape.preview ?? (
                  <div
                    className="h-10 w-16 border border-slate-400 bg-white shadow-sm"
                    style={{ borderRadius: shape.radius }}
                  />
                )}
              </div>
              <div className="mt-3 text-sm font-medium text-slate-800">
                {shape.label}
              </div>
              {shape.description ? (
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {shape.description}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
