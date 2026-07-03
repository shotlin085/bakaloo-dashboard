"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { LinkPicker } from "../LinkPicker"
import AnimationPicker from "./AnimationPicker"

interface BannerEditorProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

function getGradient(config: Record<string, unknown>): [string, string] {
  const gradient = Array.isArray(config.gradient)
    ? config.gradient.filter((entry): entry is string => typeof entry === "string")
    : []

  return [gradient[0] ?? "#E8F5E9", gradient[1] ?? "#C8E6C9"]
}

export default function BannerEditor({ config, onChange }: BannerEditorProps) {
  const [gradientStart, gradientEnd] = getGradient(config)
  const containerColor =
    typeof config.container_color === "string" ? config.container_color : "#E8F5E9"
  const contentSource =
    typeof config.content_source === "string"
      ? config.content_source
      : typeof config.lottie_url === "string" && config.lottie_url
        ? "lottie"
        : "image"
  const lottieUrl = typeof config.lottie_url === "string" ? config.lottie_url : ""
  const height = typeof config.height === "number" ? config.height : 220

  const patchConfig = (patch: Partial<Record<string, unknown>>) => {
    onChange({
      ...config,
      ...patch,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Content Source</Label>
        <RadioGroup
          value={contentSource}
          onValueChange={(value) =>
            patchConfig({
              content_source: value,
              image_url: value === "image" ? config.image_url ?? null : null,
              lottie_url: value === "lottie" ? config.lottie_url ?? "" : null,
            })
          }
          className="grid grid-cols-2 gap-3"
        >
          {[
            { value: "image", label: "Image" },
            { value: "lottie", label: "Lottie" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
            >
              <RadioGroupItem value={option.value} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {contentSource === "image" ? (
        <ThemeImageUploader
          label="Banner Image"
          value={typeof config.image_url === "string" ? config.image_url : null}
          onChange={(value) => patchConfig({ image_url: value, lottie_url: null })}
        />
      ) : (
        <ThemeImageUploader
          label="Lottie Animation"
          value={lottieUrl || null}
          accept=".lottie,.json"
          onChange={(value) => patchConfig({ lottie_url: value ?? "" })}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ThemeColorPicker
          label="Gradient Start"
          value={gradientStart}
          onChange={(value) => patchConfig({ gradient: [value, gradientEnd] })}
        />
        <ThemeColorPicker
          label="Gradient End"
          value={gradientEnd}
          onChange={(value) => patchConfig({ gradient: [gradientStart, value] })}
        />
      </div>

      <ThemeColorPicker
        label="Container Color"
        value={containerColor}
        onChange={(value) => patchConfig({ container_color: value })}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="banner-height">Height</Label>
          <span className="text-sm font-medium text-slate-600">{height}px</span>
        </div>
        <Input
          id="banner-height"
          type="range"
          min={100}
          max={400}
          step={10}
          value={height}
          onChange={(event) =>
            patchConfig({ height: Number(event.target.value) || 220 })
          }
          className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
        />
      </div>

      <AnimationPicker
        value={typeof config.animation === "string" ? config.animation : "none"}
        onChange={(value) => patchConfig({ animation: value })}
      />

      <div className="space-y-2">
        <Label>On tap</Label>
        <LinkPicker
          value={typeof config.link_url === "string" ? config.link_url : ""}
          onChange={(value) => patchConfig({ link_url: value || null })}
        />
      </div>
    </div>
  )
}
