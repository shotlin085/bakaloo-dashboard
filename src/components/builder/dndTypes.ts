import type { SectionManifest, SectionType } from "@/types/theme.types"

/**
 * Builder-level DnD identifiers and payloads.
 *
 * The builder uses ONE shared @dnd-kit DndContext at the page level (see page.tsx).
 * Every draggable / droppable carries `data.current` matching the discriminated
 * union below so the page-level onDragEnd can route by `kind`.
 *
 * Source zones:
 *   - "library" — section type cards in the right-panel SectionLibrary
 *   - "stack"   — items in the left-aside SortableSectionList
 *   - "preview" — sections rendered inside the MobilePreviewFrame canvas
 */

export const DRAG_KIND = {
  LIBRARY_SECTION: "library_section",
  EXISTING_SECTION_STACK: "existing_section_stack",
  EXISTING_SECTION_PREVIEW: "existing_section_preview",
  PREVIEW_INSERT_SLOT: "preview_insert_slot",
} as const

export type DragKind = (typeof DRAG_KIND)[keyof typeof DRAG_KIND]

export type DragSourceZone = "library" | "stack" | "preview"

export interface LibrarySectionDragData {
  kind: typeof DRAG_KIND.LIBRARY_SECTION
  sectionType: SectionType
  defaultConfig: Record<string, unknown>
  source: "library"
}

export interface ExistingSectionDragData {
  kind:
    | typeof DRAG_KIND.EXISTING_SECTION_STACK
    | typeof DRAG_KIND.EXISTING_SECTION_PREVIEW
  sectionId: string
  sectionType: SectionType
  source: DragSourceZone
}

export interface PreviewInsertSlotData {
  kind: typeof DRAG_KIND.PREVIEW_INSERT_SLOT
  /** Insertion index relative to the visible (sorted) localSections array. */
  index: number
}

export type BuilderDragData =
  | LibrarySectionDragData
  | ExistingSectionDragData
  | PreviewInsertSlotData

/**
 * Stable DnD ids — keep them prefixed so we can route by string check too.
 * Takes the library card's unique `id` (not `type` — several cards can
 * share a `type`, see sectionTypesMeta.ts) so every card gets its own
 * draggable id.
 */
export const libraryDraggableId = (cardId: string) => `library:${cardId}`

export const stackDraggableId = (sectionId: string) => `stack:${sectionId}`

export const previewSectionDraggableId = (sectionId: string) =>
  `preview-section:${sectionId}`

export const previewInsertSlotId = (index: number) => `preview-slot:${index}`

/** Type guards (cheap; no schema validation). */
export function isLibrarySectionDrag(
  data: unknown
): data is LibrarySectionDragData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { kind?: unknown }).kind === DRAG_KIND.LIBRARY_SECTION
  )
}

export function isExistingSectionDrag(
  data: unknown
): data is ExistingSectionDragData {
  if (typeof data !== "object" || data === null) return false
  const k = (data as { kind?: unknown }).kind
  return (
    k === DRAG_KIND.EXISTING_SECTION_STACK ||
    k === DRAG_KIND.EXISTING_SECTION_PREVIEW
  )
}

export function isInsertSlotDrop(data: unknown): data is PreviewInsertSlotData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { kind?: unknown }).kind === DRAG_KIND.PREVIEW_INSERT_SLOT
  )
}

/**
 * Pure helper: insert an item at `index` of `arr`, returning a new array.
 */
export function insertAt<T>(arr: T[], index: number, item: T): T[] {
  const safeIndex = Math.max(0, Math.min(index, arr.length))
  const next = arr.slice()
  next.splice(safeIndex, 0, item)
  return next
}

/**
 * Pure helper: move item from `from` to `to`, returning a new array.
 * Mirrors @dnd-kit/sortable arrayMove behavior but kept local for testability.
 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return arr.slice()
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  const safeTo = Math.max(0, Math.min(to, next.length))
  next.splice(safeTo, 0, moved)
  return next
}

/**
 * Pure helper: whether a section_type can still be added to the current list.
 */
export function canAcceptSectionType(
  sections: SectionManifest[],
  sectionType: SectionType,
  options: { maxPerTab: number; globalLimit: number }
): { allowed: boolean; reason?: string } {
  if (sections.length >= options.globalLimit) {
    return { allowed: false, reason: "Tab section limit reached" }
  }

  const currentCount = sections.reduce(
    (acc, s) => (s.section_type === sectionType ? acc + 1 : acc),
    0
  )
  if (currentCount >= options.maxPerTab) {
    return { allowed: false, reason: "Maximum for this section type reached" }
  }

  return { allowed: true }
}
