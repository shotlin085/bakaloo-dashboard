"use client"

import { useState, type MouseEvent } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { SectionManifest } from "@/types/theme.types"
import { getSectionTypeMeta } from "./sectionTypesMeta"

interface SortableSectionItemProps {
  section: SectionManifest
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onToggleVisibility: () => void
  onDuplicate: () => void
  onHoverPreview?: (sectionId: string | null) => void
}

function titleCase(input: string) {
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getConfigHighlights(section: SectionManifest) {
  const { config } = section
  const highlights: string[] = []

  if (typeof config.title === "string" && config.title.trim()) {
    highlights.push(config.title.trim())
  }
  if (typeof config.text === "string" && config.text.trim()) {
    highlights.push(config.text.trim())
  }
  if (typeof config.layout_variant === "string" && config.layout_variant.trim()) {
    highlights.push(titleCase(config.layout_variant))
  }
  if (typeof config.columns === "number") {
    highlights.push(`${config.columns}col`)
  }
  if (typeof config.height === "number") {
    highlights.push(`${config.height}px`)
  }
  if (typeof config.card_shape === "string" && config.card_shape.trim()) {
    highlights.push(titleCase(config.card_shape))
  }

  return Array.from(new Set(highlights)).slice(0, 3)
}

function getDataHighlights(section: SectionManifest) {
  const binding = section.merch_binding
  if (!binding) return []
  const highlights: string[] = []
  if (binding.category_ids?.length) highlights.push(`${binding.category_ids.length} cat`)
  if (binding.product_ids?.length) highlights.push(`${binding.product_ids.length} prod`)
  return highlights
}

export default function SortableSectionItem({
  section,
  isSelected,
  onSelect,
  onRemove,
  onToggleVisibility,
  onDuplicate,
  onHoverPreview,
}: SortableSectionItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: section.id,
    })

  const meta = getSectionTypeMeta(section.section_type)
  const Icon = meta.icon
  const configHighlights = getConfigHighlights(section)
  const dataHighlights = getDataHighlights(section)

  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <>
      <div
        ref={setNodeRef}
        data-sortable-id={section.id}
        data-section-type={section.section_type}
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition ? `${transition}, border-left 150ms ease` : "border-left 150ms ease",
          borderLeft: isSelected ? `4px solid var(--store-accent)` : "4px solid transparent",
        }}
        onMouseEnter={() => { if (!isDragging) onHoverPreview?.(section.id) }}
        onMouseLeave={() => onHoverPreview?.(null)}
        className={cn(
          "rounded-2xl border bg-white shadow-sm transition-all duration-200",
          isSelected
            ? "border-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.12)]"
            : "border-slate-200 hover:border-slate-300 hover:shadow-md",
          !section.visible && "opacity-55 saturate-50",
          isDragging && "scale-[0.98] opacity-40 shadow-lg"
        )}
        onClick={onSelect}
      >
        <div className="p-3">
          {/* Top row: drag + icon + info + slot badge */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-drag-handle
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 touch-none cursor-grab active:cursor-grabbing"
              aria-label={`Drag ${meta.label}`}
              onClick={stopPropagation}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                meta.accentClassName
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">
                {meta.label}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {configHighlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                  >
                    {h}
                  </span>
                ))}
                {dataHighlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
              >
                #{section.sort_order + 1}
              </Badge>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  section.visible ? "bg-emerald-400" : "bg-slate-300"
                )}
                title={section.visible ? "Visible" : "Hidden"}
              />
            </div>
          </div>

          {/* Action row */}
          <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              aria-label={section.visible ? "Hide section" : "Show section"}
              onClick={(event) => {
                stopPropagation(event)
                onToggleVisibility()
              }}
            >
              {section.visible ? (
                <Eye className="mr-1 h-3.5 w-3.5" />
              ) : (
                <EyeOff className="mr-1 h-3.5 w-3.5" />
              )}
              {section.visible ? "Hide" : "Show"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              aria-label="Duplicate section"
              onClick={(event) => {
                stopPropagation(event)
                onDuplicate()
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove section"
              onClick={(event) => {
                stopPropagation(event)
                setConfirmOpen(true)
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove section?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium text-slate-900">{meta.label}</span>{" "}
              from the tab layout. You can re-add it later from the section library.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
