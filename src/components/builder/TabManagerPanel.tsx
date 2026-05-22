"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Archive, Check, GripVertical, Pencil, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ThemeTab } from "@/types/theme.types"

// ——— Types ———————————————————————————————————————————————————————

interface TabManagerPanelProps {
  tabs: ThemeTab[]
  activeTabId: string | null
  isOpen: boolean
  onClose: () => void
  onTabSelect: (tabId: string) => void
  onTabCreate: () => void
  onTabReorder?: (reorderedIds: string[]) => void
  onTabUpdate?: (tabId: string, label: string) => void
  onTabArchive?: (tabId: string) => void
}

interface SortableTabItemProps {
  tab: ThemeTab
  isActive: boolean
  onSelect: (tabId: string) => void
  onUpdate?: (tabId: string, label: string) => void
  onArchive?: (tabId: string) => void
}

// ——— Modifier ————————————————————————————————————————————————————

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

// ——— SortableTabItem —————————————————————————————————————————————

function SortableTabItem({ tab, isActive, onSelect, onUpdate, onArchive }: SortableTabItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(tab.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleEditStart = useCallback(() => {
    setEditValue(tab.label)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [tab.label])

  const handleEditCommit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== tab.label) {
      onUpdate?.(tab.id, trimmed)
    }
    setIsEditing(false)
  }, [editValue, tab.id, tab.label, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleEditCommit()
      } else if (e.key === "Escape") {
        setEditValue(tab.label)
        setIsEditing(false)
      }
    },
    [handleEditCommit, tab.label]
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        isActive
          ? "border-slate-200 bg-slate-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: isActive ? "var(--store-accent)" : "#CBD5E1" }}
      />

      {isEditing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditCommit}
            onKeyDown={handleKeyDown}
            className="h-7 flex-1 rounded-lg border-slate-200 px-2 text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={handleEditCommit}
            aria-label="Save label"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-900"
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      )}

      {!isEditing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={handleEditStart}
            aria-label="Edit label"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {onArchive && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-500"
              onClick={() => onArchive(tab.id)}
              aria-label="Archive tab"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ——— TabManagerPanel —————————————————————————————————————————————

function TabManagerPanel({
  tabs,
  activeTabId,
  isOpen,
  onClose,
  onTabSelect,
  onTabCreate,
  onTabReorder,
  onTabUpdate,
  onTabArchive,
}: TabManagerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap: keep focus inside panel when open
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    // Auto-focus first focusable element when panel opens
    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return }
      if (e.key !== "Tab") return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const [localTabIds, setLocalTabIds] = useState<string[]>(() =>
    [...tabs].sort((a, b) => a.sort_order - b.sort_order).map((t) => t.id)
  )

  // Preserve drag order; add new tabs at end; drop removed tabs
  useEffect(() => {
    setLocalTabIds((prev) => {
      const tabIdSet = new Set(tabs.map((t) => t.id))
      const preserved = prev.filter((id) => tabIdSet.has(id))
      const added = tabs
        .filter((t) => !preserved.includes(t.id))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => t.id)
      return [...preserved, ...added]
    })
  }, [tabs])

  const orderedTabs = useMemo(
    () =>
      localTabIds
        .map((id) => tabs.find((t) => t.id === id))
        .filter((t): t is ThemeTab => Boolean(t)),
    [localTabIds, tabs]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = localTabIds.indexOf(String(active.id))
      const newIndex = localTabIds.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(localTabIds, oldIndex, newIndex)
      setLocalTabIds(newOrder)
      onTabReorder?.(newOrder)
    },
    [localTabIds, onTabReorder]
  )

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[50] bg-black/20 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Manage Tabs"
        aria-modal="true"
        className="absolute bottom-0 left-0 top-0 z-[60] flex w-[300px] flex-col border-r border-slate-200 bg-white shadow-2xl"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms ease-in-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold text-slate-900">Manage Tabs</div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {tabs.length} tab{tabs.length !== 1 ? "s" : ""}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tabs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No tabs yet. Create one below.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedTabs.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {orderedTabs.map((tab) => (
                    <SortableTabItem
                      key={tab.id}
                      tab={tab}
                      isActive={tab.id === activeTabId}
                      onSelect={(tabId) => {
                        onTabSelect(tabId)
                        onClose()
                      }}
                      onUpdate={onTabUpdate}
                      onArchive={onTabArchive}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onTabCreate}
          >
            <Plus className="h-4 w-4" />
            New Tab
          </Button>
        </div>
      </div>
    </>
  )
}

export default memo(TabManagerPanel)
