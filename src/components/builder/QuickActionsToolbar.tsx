"use client"

import { memo } from "react"
import { ArrowUp, ArrowDown, Eye, EyeOff, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuickActionsToolbarProps {
  sectionId: string
  sectionIndex: number
  totalSections: number
  isVisible: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleVisibility: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export const QuickActionsToolbar = memo(function QuickActionsToolbar({
  sectionIndex,
  totalSections,
  isVisible,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: QuickActionsToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 px-1 py-1 shadow-lg backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onMoveUp}
        disabled={sectionIndex === 0}
        title="Move up"
        aria-label="Move section up"
      >
        <ArrowUp size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onMoveDown}
        disabled={sectionIndex === totalSections - 1}
        title="Move down"
        aria-label="Move section down"
      >
        <ArrowDown size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onToggleVisibility}
        title={isVisible ? "Hide" : "Show"}
        aria-label={isVisible ? "Hide section" : "Show section"}
      >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onDuplicate}
        title="Duplicate"
        aria-label="Duplicate section"
      >
        <Copy size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={onDelete}
        title="Delete"
        aria-label="Delete section"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
})
