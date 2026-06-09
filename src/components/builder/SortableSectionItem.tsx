"use client"

import { memo, useState, type MouseEvent } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Copy, Eye, EyeOff, GripVertical, MoreHorizontal, Trash2 } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  return input.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getConfigSummary(section: SectionManifest): string {
  const { config, merch_binding } = section
  const parts: string[] = []
  if (typeof config.columns === "number") parts.push(`${config.columns} col`)
  if (typeof config.layout_variant === "string")
    parts.push(titleCase(config.layout_variant))
  if (typeof config.height === "number") parts.push(`${config.height}px`)
  if (typeof config.card_shape === "string" && config.card_shape !== "rounded")
    parts.push(titleCase(config.card_shape))
  if (merch_binding?.category_ids?.length)
    parts.push(`${merch_binding.category_ids.length} cat`)
  if (merch_binding?.product_ids?.length)
    parts.push(`${merch_binding.product_ids.length} prod`)
  if (merch_binding?.tags?.length)
    parts.push(`${merch_binding.tags.length} tag`)
  return parts.slice(0, 4).join(" · ")
}

const SortableSectionItem = memo(function SortableSectionItem({
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
    useSortable({ id: section.id })
  const meta = getSectionTypeMeta(section.section_type)
  const Icon = meta.icon
  const summary = getConfigSummary(section)
  const stopPropagation = (e: MouseEvent<HTMLElement>) => e.stopPropagation()

  return (
    <>
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${meta.label}. Position ${section.sort_order + 1}. ${section.visible ? "Visible" : "Hidden"}`}
        data-sortable-id={section.id}
        data-section-type={section.section_type}
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition
            ? `${transition}, border-color 150ms ease`
            : "border-color 150ms ease",
          borderLeftWidth: isSelected ? 3 : 1,
          borderLeftColor: isSelected ? "var(--store-accent)" : undefined,
        }}
        onMouseEnter={() => { if (!isDragging) onHoverPreview?.(section.id) }}
        onMouseLeave={() => onHoverPreview?.(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect() }
        }}
        className={cn(
          "group relative rounded-xl border bg-white transition-all duration-150",
          isSelected
            ? "border-violet-400 shadow-[0_0_0_2px_rgba(139,92,246,0.12)]"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
          !section.visible && "opacity-50 saturate-0",
          isDragging && "scale-[0.97] opacity-40 shadow-xl"
        )}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Drag handle */}
          <button
            type="button"
            data-drag-handle
            aria-label={`Drag ${meta.label}`}
            className="flex h-7 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing"
            onClick={stopPropagation}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Section icon */}
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
              meta.accentClassName
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-slate-900">
                {meta.label}
              </span>
              {!section.visible && (
                <EyeOff className="h-3 w-3 shrink-0 text-slate-400" aria-label="Hidden" />
              )}
            </div>
            {summary && (
              <p className="truncate text-[10px] text-slate-400">{summary}</p>
            )}
          </div>

          {/* Position number + visibility dot */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-medium tabular-nums text-slate-400">
              #{section.sort_order + 1}
            </span>
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                section.visible ? "bg-emerald-400" : "bg-slate-300"
              )}
              title={section.visible ? "Visible" : "Hidden"}
              aria-hidden="true"
            />
          </div>

          {/* Overflow actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label="Section actions"
                onClick={stopPropagation}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
              >
                {section.visible ? (
                  <><EyeOff className="mr-2 h-3.5 w-3.5" />Hide section</>
                ) : (
                  <><Eye className="mr-2 h-3.5 w-3.5" />Show section</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove section?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-slate-900">{meta.label}</span>{" "}
              from the layout. You can re-add it from the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmOpen(false); onRemove() }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

export default SortableSectionItem
