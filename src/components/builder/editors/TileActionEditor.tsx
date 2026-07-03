"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LinkValuePicker } from "../LinkPicker"
import {
  APP_PAGE_OPTIONS,
  TAB_PAGE_OPTIONS,
  type TileAction,
  type TileActionType,
} from "./mosaic-model"

interface TileActionEditorProps {
  value: TileAction
  onChange: (action: TileAction) => void
}

const ACTION_TYPES: { value: TileActionType; label: string }[] = [
  { value: "none", label: "No action" },
  { value: "product", label: "Open product" },
  { value: "category", label: "Open category" },
  { value: "tab", label: "Switch home tab" },
  { value: "app_page", label: "Open app page" },
  { value: "external_url", label: "Open external link" },
]

export default function TileActionEditor({ value, onChange }: TileActionEditorProps) {
  const setType = (type: TileActionType) => {
    // Reset value to a sensible default for the new type.
    let nextValue: string | null = null
    if (type === "tab") nextValue = TAB_PAGE_OPTIONS[0].value
    if (type === "app_page") nextValue = APP_PAGE_OPTIONS[0].value
    onChange({ type, value: nextValue })
  }

  const setValue = (next: string) => onChange({ ...value, value: next || null })

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">On tap</Label>
      <Select value={value.type} onValueChange={(v) => setType(v as TileActionType)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.type === "product" && (
        <LinkValuePicker
          type="product"
          value={value.value}
          onChange={(next) => onChange({ ...value, value: next })}
        />
      )}

      {value.type === "category" && (
        <LinkValuePicker
          type="category"
          value={value.value}
          onChange={(next) => onChange({ ...value, value: next })}
        />
      )}

      {value.type === "tab" && (
        <Select value={value.value ?? ""} onValueChange={setValue}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select tab" />
          </SelectTrigger>
          <SelectContent>
            {TAB_PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === "app_page" && (
        <Select value={value.value ?? ""} onValueChange={setValue}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            {APP_PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === "external_url" && (
        <Input
          value={value.value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com"
        />
      )}
    </div>
  )
}
