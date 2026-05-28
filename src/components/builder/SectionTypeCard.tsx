"use client"

import { useDraggable } from "@dnd-kit/core"
import { Check, GripVertical, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SectionType } from "@/types/theme.types"
import { DRAG_KIND, libraryDraggableId } from "./dndTypes"
import {
  cloneSectionDefaultConfig,
  type SectionTypeMeta,
} from "./sectionTypesMeta"

interface SectionTypeCardProps {
  meta: SectionTypeMeta
  currentCount: number
  isDisabled: boolean
  onAdd: (sectionType: SectionType, defaultConfig: Record<string, unknown>) => void
  disabledReason?: string
}

function CardBody({
  meta,
  currentCount,
  isDisabled,
  onAdd,
}: Omit<SectionTypeCardProps, "disabledReason">) {
  const Icon = meta.icon
  const isAdded = currentCount > 0

  // Library cards are draggable when not disabled.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: libraryDraggableId(meta.type),
    disabled: isDisabled,
    data: {
      kind: DRAG_KIND.LIBRARY_SECTION,
      sectionType: meta.type,
      defaultConfig: cloneSectionDefaultConfig(meta),
      source: "library" as const,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`library-card-${meta.type}`}
      className={cn(
        "relative rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-200",
        isDisabled
          ? "cursor-not-allowed border-slate-200 opacity-50"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        isAdded && !isDisabled && "border-emerald-200/80 bg-emerald-50/30",
        isDragging && "opacity-40"
      )}
    >
      {/* Added indicator — top-right corner */}
      {isAdded ? (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        {/* Drag handle — only visible when not disabled */}
        {!isDisabled ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${meta.label} into preview`}
            className="flex h-10 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-300 hover:bg-slate-50 hover:text-slate-500 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}

        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            meta.accentClassName
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {meta.label}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                isAdded
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {currentCount}/{meta.maxPerTab}
            </Badge>
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {meta.description}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5">
          {isAdded ? (
            <span className="text-[11px] font-medium text-emerald-600">
              ✓ In stack
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              Drag onto preview or click Add
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isDisabled}
          data-testid={`add-section-${meta.type}`}
          className="h-8 rounded-lg px-3 text-xs"
          onClick={() => onAdd(meta.type, cloneSectionDefaultConfig(meta))}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  )
}

export default function SectionTypeCard({
  meta,
  currentCount,
  isDisabled,
  onAdd,
  disabledReason = "Maximum reached",
}: SectionTypeCardProps) {
  if (!isDisabled) {
    return (
      <CardBody
        meta={meta}
        currentCount={currentCount}
        isDisabled={false}
        onAdd={onAdd}
      />
    )
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <CardBody
              meta={meta}
              currentCount={currentCount}
              isDisabled
              onAdd={onAdd}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
