"use client"

import type { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { DRAG_KIND } from "./dndTypes"
import type { SectionType } from "@/types/theme.types"

interface PreviewSortableSectionProps {
  sectionId: string
  sectionType: SectionType
  isSelected: boolean
  onClick: () => void
  children: ReactNode
}

/**
 * Wraps a single preview section so it can be sorted directly inside the
 * mobile preview canvas. Uses the shared page-level DndContext.
 *
 * Renders a small grip handle (top-right corner) when selected to surface
 * drag affordance without competing with click-to-select.
 */
export default function PreviewSortableSection({
  sectionId,
  sectionType,
  isSelected,
  onClick,
  children,
}: PreviewSortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionId,
    data: {
      kind: DRAG_KIND.EXISTING_SECTION_PREVIEW,
      sectionId,
      sectionType,
      source: "preview" as const,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    contain: "content",
    border: isSelected
      ? "2px solid var(--store-accent, #3B82F6)"
      : "2px solid transparent",
    borderRadius: 8,
    cursor: "pointer",
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
  }

  return (
    <div
      ref={setNodeRef}
      data-preview-section-id={sectionId}
      data-section-id={sectionId}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Drag handle pinned to top-right; only visible when section is selected. */}
      {isSelected ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder section"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 6,
            top: 6,
            zIndex: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 6px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(15,23,42,0.12)",
            color: "#475569",
            fontSize: 10,
            fontWeight: 600,
            cursor: "grab",
            boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
          }}
        >
          <GripVertical size={12} />
          Drag
        </button>
      ) : null}

      {children}
    </div>
  )
}
