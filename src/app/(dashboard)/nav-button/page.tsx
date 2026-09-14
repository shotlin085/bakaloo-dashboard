"use client"

import { Suspense, useState, useMemo, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavButtonDialog } from "@/components/nav-buttons/NavButtonDialog"
import { NavButtonIconPreview } from "@/components/nav-buttons/IconPicker"
import {
  useNavButtons,
  useDeleteNavButton,
  useUpdateNavButton,
  useReorderNavButtons,
} from "@/hooks/useNavButtons"
import type { NavButton, NavButtonDestinationType } from "@/types/nav-button.types"
import { usePermissions } from "@/hooks/usePermissions"
import { useShopContext, useIsSuperAdmin } from "@/hooks/useShopContext"
import { EmptyShopState } from "@/components/shared/empty-shop-state"

/**
 * The app's bottom nav is hardcoded to 4 tabs (Home/Orders/Categories/
 * Profile) — this manages the one admin-configurable 5th slot. Several
 * rows can exist and even be Active at once: each customer resolves to at
 * most one (by audience + optional segment), so a B2B segment and a B2C
 * segment can each see a different 5th button simultaneously — this page
 * intentionally allows preparing/scheduling several without them fighting
 * over "the" one slot.
 */

const DESTINATION_LABEL: Record<NavButtonDestinationType, string> = {
  APP_ROUTE: "App screen",
  CATEGORY: "Category",
  PRODUCT: "Product",
  WEBVIEW: "Website / game",
}

function getStatus(b: NavButton): "active" | "inactive" | "scheduled" | "expired" {
  if (!b.is_active) return "inactive"
  const now = new Date()
  if (b.end_date && new Date(b.end_date) < now) return "expired"
  if (b.start_date && new Date(b.start_date) > now) return "scheduled"
  return "active"
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  expired: { label: "Expired", variant: "destructive" },
}

function SortableNavButtonCard({
  navButton,
  onEdit,
  onDelete,
  onToggle,
}: {
  navButton: NavButton
  onEdit: (b: NavButton) => void
  onDelete: (id: string) => void
  onToggle: (b: NavButton) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: navButton.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const status = getStatus(navButton)
  const badge = STATUS_BADGE[status]

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <CardContent className="p-3 flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <NavButtonIconPreview iconKey={navButton.icon_key} accentColor={navButton.accent_color} size={20} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{navButton.label}</h3>
            <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{DESTINATION_LABEL[navButton.destination_type]}</span>
            {navButton.audience !== "ALL" && (
              <Badge variant="outline" className="text-[10px] bg-violet-50 border-violet-200 text-violet-700">
                {navButton.audience}
              </Badge>
            )}
            {navButton.target_segment_id && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-200 text-amber-700">
                Segment
              </Badge>
            )}
            {navButton.destination_type === "WEBVIEW" && navButton.pass_identity && (
              <Badge variant="outline" className="text-[10px] bg-sky-50 border-sky-200 text-sky-700">
                Identity passed
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="p-1.5 rounded-md hover:bg-muted shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(navButton)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggle(navButton)}>
              {navButton.is_active ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-2" /> Deactivate
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(navButton.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

function NavButtonContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NavButton | null>(null)

  const { mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  const { data: navButtons, isLoading } = useNavButtons()
  const deleteMutation = useDeleteNavButton()
  const updateMutation = useUpdateNavButton()
  const reorderMutation = useReorderNavButtons()
  const { can } = usePermissions()
  const canManage = can("banners.manage")

  const sorted = useMemo(() => {
    if (!navButtons) return []
    return [...navButtons].sort((a, b) => a.sort_order - b.sort_order)
  }, [navButtons])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (b: NavButton) => {
    setEditing(b)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this nav button?")) deleteMutation.mutate(id)
  }

  const toggleActive = (b: NavButton) => {
    updateMutation.mutate({ id: b.id, payload: { isActive: !b.is_active } })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sorted.findIndex((b) => b.id === active.id)
      const newIndex = sorted.findIndex((b) => b.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(sorted.map((b) => b.id), oldIndex, newIndex)
      reorderMutation.mutate(newOrder)
    },
    [sorted, reorderMutation]
  )

  if (mode !== "STORE_MODE") {
    return (
      <div className="space-y-6">
        <PageHeader title="Nav Button" subtitle="Configure the 5th bottom-navigation button" />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nav Button"
        subtitle="Configure the app's 5th bottom-navigation button — icon, destination, and who sees it"
      >
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Nav Button
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 h-16 bg-muted animate-pulse rounded" />
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-6 w-6 text-muted-foreground" />}
          title="No nav button configured"
          description="The app currently shows only Home, Orders, Categories, and Profile. Add one to enable the 5th slot."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorted.map((navButton) => (
                <SortableNavButtonCard
                  key={navButton.id}
                  navButton={navButton}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <NavButtonDialog open={dialogOpen} onClose={() => setDialogOpen(false)} navButton={editing} />
    </div>
  )
}

export default function NavButtonPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <NavButtonContent />
    </Suspense>
  )
}
