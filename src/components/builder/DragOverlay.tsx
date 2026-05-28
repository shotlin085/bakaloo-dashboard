"use client"

import { GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SectionManifest, SectionType } from "@/types/theme.types"
import { getSectionTypeMeta } from "./sectionTypesMeta"

interface ExistingDragOverlayProps {
  kind: "existing"
  section: SectionManifest
}

interface LibraryDragOverlayProps {
  kind: "library"
  sectionType: SectionType
}

type DragOverlayProps = ExistingDragOverlayProps | LibraryDragOverlayProps

export default function DragOverlay(props: DragOverlayProps) {
  if (props.kind === "library") {
    return <LibraryOverlay sectionType={props.sectionType} />
  }
  return <ExistingOverlay section={props.section} />
}

function ExistingOverlay({ section }: { section: SectionManifest }) {
  const meta = getSectionTypeMeta(section.section_type)
  const Icon = meta.icon

  return (
    <div
      className={cn(
        "w-[260px] rounded-2xl border border-blue-400 bg-white/90 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm",
        "rotate-[1.5deg]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-500">
          <GripVertical className="h-4 w-4" />
        </div>
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
        </div>
        <Badge
          variant="secondary"
          className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600"
        >
          Moving
        </Badge>
      </div>
    </div>
  )
}

function LibraryOverlay({ sectionType }: { sectionType: SectionType }) {
  const meta = getSectionTypeMeta(sectionType)
  const Icon = meta.icon

  return (
    <div
      className={cn(
        "w-[240px] rounded-2xl border-2 border-emerald-400 bg-white/95 p-3 shadow-[0_12px_32px_rgba(16,185,129,0.25)] backdrop-blur-sm",
        "rotate-[-1.5deg]"
      )}
    >
      <div className="flex items-center gap-2.5">
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
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-600">
            New section
          </div>
        </div>
        <Badge
          variant="secondary"
          className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600"
        >
          + Add
        </Badge>
      </div>
    </div>
  )
}
