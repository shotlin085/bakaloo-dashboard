"use client"

import { useMemo, useState } from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay as DndDragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { SectionManifest } from "@/types/theme.types"
import DragOverlay from "./DragOverlay"
import SortableSectionItem from "./SortableSectionItem"

interface SortableSectionListProps {
  sections: SectionManifest[]
  selectedSectionId: string | null
  onSelect: (id: string) => void
  onReorder: (newOrder: string[]) => void
  onRemove: (id: string) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onDuplicate: (id: string) => void
  onHoverPreview?: (sectionId: string | null) => void
}

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

export default function SortableSectionList({
  sections,
  selectedSectionId,
  onSelect,
  onReorder,
  onRemove,
  onToggleVisibility,
  onDuplicate,
  onHoverPreview,
}: SortableSectionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections]
  )

  const activeSection =
    orderedSections.find((section) => section.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    onSelect(id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = orderedSections.findIndex(
      (section) => section.id === String(active.id)
    )
    const newIndex = orderedSections.findIndex(
      (section) => section.id === String(over.id)
    )

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const nextOrder = arrayMove(orderedSections, oldIndex, newIndex).map(
      (section) => section.id
    )
    onReorder(nextOrder)
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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

      <DndDragOverlay adjustScale={false}>
        {activeSection ? <DragOverlay section={activeSection} /> : null}
      </DndDragOverlay>
    </DndContext>
  )
}
