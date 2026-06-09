"use client"

import { useMemo, useState } from "react"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { SectionManifest } from "@/types/theme.types"
import SortableSectionItem from "./SortableSectionItem"
import { getSectionTypeMeta } from "./sectionTypesMeta"

interface SortableSectionListProps {
  sections: SectionManifest[]
  selectedSectionId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onDuplicate: (id: string) => void
  onHoverPreview?: (sectionId: string | null) => void
}

/**
 * Section Stack V2 — uses the shared parent DndContext (no nested context).
 * Adds in-place search filter to quickly locate sections in long stacks.
 */
export default function SortableSectionList({
  sections,
  selectedSectionId,
  onSelect,
  onRemove,
  onToggleVisibility,
  onDuplicate,
  onHoverPreview,
}: SortableSectionListProps) {
  const [query, setQuery] = useState("")

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections]
  )

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orderedSections
    return orderedSections.filter((section) => {
      const meta = getSectionTypeMeta(section.section_type)
      const haystack = `${meta.label} ${section.section_type} ${
        (section.config?.title as string) ?? ""
      } ${(section.config?.text as string) ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [orderedSections, query])

  const hiddenCount = useMemo(
    () => sections.filter((s) => !s.visible).length,
    [sections]
  )

  return (
    <div className="space-y-2">
      {/* Search — only shown when there are enough sections to warrant it */}
      {sections.length >= 4 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections…"
            className="h-8 rounded-lg border-slate-200 bg-slate-50 pl-8 pr-8 text-xs"
            aria-label="Filter sections"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Visibility summary — shown when there are hidden sections */}
      {hiddenCount > 0 && !query && (
        <p className="text-center text-[10px] text-slate-400">
          {hiddenCount} hidden section{hiddenCount !== 1 ? "s" : ""} not shown in preview
        </p>
      )}

      {/* Section list */}
      <SortableContext
        items={orderedSections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {filteredSections.map((section) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              isSelected={selectedSectionId === section.id}
              onSelect={() => onSelect(section.id)}
              onRemove={() => onRemove(section.id)}
              onToggleVisibility={() =>
                onToggleVisibility(section.id, !section.visible)
              }
              onDuplicate={() => onDuplicate(section.id)}
              onHoverPreview={onHoverPreview}
            />
          ))}
        </div>
      </SortableContext>

      {/* Empty states */}
      {filteredSections.length === 0 && query && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
          <p className="text-xs text-slate-500">
            No sections matched &ldquo;{query}&rdquo;
          </p>
          <button
            type="button"
            className="mt-1 text-xs text-violet-600 hover:underline"
            onClick={() => setQuery("")}
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  )
}
