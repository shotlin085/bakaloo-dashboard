"use client"

import { useDroppable } from "@dnd-kit/core"
import { previewInsertSlotId, DRAG_KIND } from "./dndTypes"

interface PreviewInsertionLineProps {
  /** Insertion index relative to the visible (sorted) localSections array. */
  index: number
  /** Reduce visual weight when a drag is not active. */
  active: boolean
}

/**
 * Thin droppable strip rendered between every two preview sections (and at
 * the top + bottom). Becomes a colored 2px insertion line while a draggable
 * is over it.
 */
export default function PreviewInsertionLine({
  index,
  active,
}: PreviewInsertionLineProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: previewInsertSlotId(index),
    data: { kind: DRAG_KIND.PREVIEW_INSERT_SLOT, index },
  })

  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      style={{
        height: active ? 16 : 2,
        margin: "0 8px",
        borderRadius: 999,
        background: isOver
          ? "var(--store-accent, #3B82F6)"
          : active
          ? "rgba(59, 130, 246, 0.18)"
          : "transparent",
        transition:
          "background 120ms ease, height 140ms ease, box-shadow 120ms ease",
        boxShadow: isOver ? "0 0 0 4px rgba(59, 130, 246, 0.15)" : "none",
        position: "relative",
        zIndex: 5,
      }}
    />
  )
}
