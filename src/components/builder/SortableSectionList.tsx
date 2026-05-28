"use client"

import { useMemo } from "react"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { SectionManifest } from "@/types/theme.types"
import SortableSectionItem from "./SortableSectionItem"

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
 * Phase 2: this component no longer hosts its own DndContext.
 * The builder page wraps the whole UI in a single shared DndContext so
 * library cards, preview sortables, and stack sortables all participate
 * in the same drag system. This component now only registers a
 * SortableContext for its own ordered ids — the parent handles drag events.
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
  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections]
  )

  return (
    <SortableContext
      items={orderedSections.map((section) => section.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-4">
        {orderedSections.map((section) => (
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
  )
}
