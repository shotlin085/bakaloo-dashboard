"use client"

import { GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SectionManifest } from "@/types/theme.types"
import { getSectionTypeMeta } from "./sectionTypesMeta"

interface DragOverlayProps {
  section: SectionManifest
}

export default function DragOverlay({ section }: DragOverlayProps) {
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
