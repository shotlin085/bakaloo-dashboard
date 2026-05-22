"use client"

import { useEffect, useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ThemeColorPickerProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

function expandHex(value: string): string {
  const normalized = value.startsWith("#") ? value : `#${value}`
  return normalized.toUpperCase()
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function ThemeColorPicker({
  label,
  value,
  onChange,
}: ThemeColorPickerProps) {
  const normalizedValue = useMemo(
    () => (isValidHex(value) ? expandHex(value) : "#000000"),
    [value]
  )
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const isInvalid = inputValue.length > 0 && !isValidHex(inputValue)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-md border shadow-sm"
          style={{ backgroundColor: normalizedValue }}
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            #
          </span>
          <Input
            value={inputValue.replace(/^#/, "")}
            onChange={(event) => {
              const next = `#${event.target.value
                .replace(/[^0-9a-fA-F]/g, "")
                .slice(0, 6)}`
              setInputValue(next)
              if (isValidHex(next)) {
                onChange(expandHex(next))
              }
            }}
            className={cn("pl-7 font-mono uppercase", isInvalid && "border-destructive")}
            placeholder="88D4FE"
          />
        </div>
        <input
          type="color"
          value={normalizedValue}
          onChange={(event) => {
            const next = event.target.value.toUpperCase()
            setInputValue(next)
            onChange(next)
          }}
          className="h-10 w-14 cursor-pointer rounded-md border bg-background p-1"
          aria-label={`${label} color picker`}
        />
      </div>
      {isInvalid && (
        <p className="text-xs text-destructive">
          Enter a valid 6-digit hex color.
        </p>
      )}
    </div>
  )
}
