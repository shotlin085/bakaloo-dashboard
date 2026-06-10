"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { ThemeGradientPicker } from "@/components/themes/ThemeGradientPicker"
import TileActionEditor from "./TileActionEditor"
import type { MosaicTile } from "./mosaic-model"

interface TileEditorProps {
  label: string
  tile: MosaicTile
  isHero?: boolean
  defaultOpen?: boolean
  onChange: (tile: MosaicTile) => void
}

export default function TileEditor({
  label,
  tile,
  isHero = false,
  defaultOpen = false,
  onChange,
}: TileEditorProps) {
  const [open, setOpen] = useState(defaultOpen)

  const patch = (next: Partial<MosaicTile>) => onChange({ ...tile, ...next })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <span
          className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-slate-200"
          style={{
            background: tile.imageUrl
              ? undefined
              : `linear-gradient(135deg, ${tile.gradient[0]}, ${tile.gradient[1]})`,
          }}
        >
          {tile.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tile.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{label}</span>
          <span className="block truncate text-xs text-slate-500">
            {tile.title || "Untitled tile"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 p-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">Title</Label>
            <Input
              value={tile.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Tile title"
            />
          </div>

          <ThemeImageUploader
            label="Tile image"
            value={tile.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
          />

          <ThemeGradientPicker
            label="Background gradient (fallback / overlay)"
            value={tile.gradient}
            onChange={(gradient) => patch({ gradient })}
          />

          {isHero && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                Badge text
              </Label>
              <Input
                value={tile.badgeText ?? ""}
                onChange={(e) => patch({ badgeText: e.target.value })}
                placeholder="BUY 2 GET 1"
              />
            </div>
          )}

          <TileActionEditor
            value={tile.action}
            onChange={(action) => patch({ action })}
          />
        </div>
      )}
    </div>
  )
}
