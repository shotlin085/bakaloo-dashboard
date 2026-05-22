"use client"

import { cn } from "@/lib/utils"

interface LayoutVariantPickerProps {
  value: string
  onChange: (variant: string) => void
}

const VARIANTS = [
  {
    value: "hero_plus_four",
    label: "Hero + Four",
    render: () => (
      <div className="grid h-[60px] w-[60px] grid-cols-3 grid-rows-3 gap-1">
        <div className="col-span-2 row-span-2 rounded-md bg-slate-900/85" />
        <div className="rounded-md bg-slate-400" />
        <div className="rounded-md bg-slate-400" />
        <div className="col-span-1 rounded-md bg-slate-300" />
        <div className="rounded-md bg-slate-300" />
      </div>
    ),
  },
  {
    value: "two_by_three",
    label: "2 × 3",
    render: () => (
      <div className="grid h-[60px] w-[60px] grid-cols-3 grid-rows-2 gap-1">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-md",
              index % 2 === 0 ? "bg-slate-800/80" : "bg-slate-300"
            )}
          />
        ))}
      </div>
    ),
  },
  {
    value: "single_hero",
    label: "Single Hero",
    render: () => (
      <div className="flex h-[60px] w-[60px] items-stretch">
        <div className="w-full rounded-xl bg-slate-900/85" />
      </div>
    ),
  },
  {
    value: "two_by_two",
    label: "2 × 2",
    render: () => (
      <div className="grid h-[60px] w-[60px] grid-cols-2 grid-rows-2 gap-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-md",
              index < 2 ? "bg-slate-800/80" : "bg-slate-300"
            )}
          />
        ))}
      </div>
    ),
  },
  {
    value: "stacked_banners",
    label: "Stacked",
    render: () => (
      <div className="grid h-[60px] w-[60px] grid-rows-3 gap-1">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-md",
              index === 0 ? "bg-slate-800/80" : "bg-slate-300"
            )}
          />
        ))}
      </div>
    ),
  },
] as const

export default function LayoutVariantPicker({
  value,
  onChange,
}: LayoutVariantPickerProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-900">Layout Variant</div>
      <div className="grid grid-cols-5 gap-2">
        {VARIANTS.map((variant) => {
          const isActive = value === variant.value
          return (
            <button
              key={variant.value}
              type="button"
              onClick={() => onChange(variant.value)}
              className={cn(
                "rounded-2xl border bg-white p-2 text-center transition-all duration-200",
                isActive
                  ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-center">
                {variant.render()}
              </div>
              <div className="mt-2 text-[11px] font-medium leading-tight text-slate-600">
                {variant.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
