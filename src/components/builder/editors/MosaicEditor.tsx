"use client"

import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import AnimationPicker from "./AnimationPicker"
import LayoutVariantPicker from "./LayoutVariantPicker"
import TileEditor from "./TileEditor"
import {
  DEFAULT_CONTAINER_COLOR,
  MOSAIC_SIZE_HINTS,
  MOSAIC_SLOTS,
  normalizeLayout,
  readMosaicTiles,
  writeMosaicTiles,
  type MosaicTile,
  type MosaicTiles,
} from "./mosaic-model"

interface MosaicEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export default function MosaicEditor({ config, onChange }: MosaicEditorProps) {
  const layout = normalizeLayout(config.layout_variant)
  const slots = MOSAIC_SLOTS[layout]
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : DEFAULT_CONTAINER_COLOR

  const tiles = readMosaicTiles(config, layout)

  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...config, ...patch })
  }

  const commitTiles = (next: MosaicTiles) => {
    onChange(writeMosaicTiles({ ...config }, next))
  }

  const updateHero = (hero: MosaicTile) => commitTiles({ ...tiles, hero })

  const updateMini = (index: number, mini: MosaicTile) => {
    const nextMini = tiles.mini.slice()
    nextMini[index] = mini
    commitTiles({ ...tiles, mini: nextMini })
  }

  const changeLayout = (variant: string) => {
    const nextLayout = normalizeLayout(variant)
    // Re-read tiles against the new slot count, then persist so the new
    // variant always has a correct number of tile slots.
    const next = { ...config, layout_variant: nextLayout }
    const reTiled = readMosaicTiles(next, nextLayout)
    onChange(writeMosaicTiles(next, reTiled))
  }

  return (
    <div className="space-y-6">
      <LayoutVariantPicker value={layout} onChange={changeLayout} />

      <ThemeColorPicker
        label="Container Color"
        value={containerColor}
        onChange={(value) => patchConfig({ container_color: value })}
      />

      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-900">
          Tiles
          <span className="ml-2 text-xs font-normal text-slate-500">
            {slots.hero > 0 ? `1 hero · ` : ""}
            {slots.mini} grid
          </span>
        </div>

        <div className="space-y-2">
          {tiles.hero && (
            <TileEditor
              label="Hero tile"
              tile={tiles.hero}
              isHero
              defaultOpen
              sizeHint={MOSAIC_SIZE_HINTS[layout].hero}
              onChange={updateHero}
            />
          )}
          {tiles.mini.map((tile, index) => (
            <TileEditor
              key={`mini-${index}`}
              label={`Tile ${index + 1}`}
              tile={tile}
              sizeHint={MOSAIC_SIZE_HINTS[layout].mini}
              onChange={(next) => updateMini(index, next)}
            />
          ))}
        </div>
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patchConfig({ animation: value })}
      />
    </div>
  )
}
