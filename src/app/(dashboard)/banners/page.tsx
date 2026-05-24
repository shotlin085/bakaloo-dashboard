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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ImageIcon,
  ExternalLink,
} from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BannerDialog } from "@/components/banners/BannerDialog"
import {
  useBanners,
  useDeleteBanner,
  useUpdateBanner,
  useReorderBanners,
} from "@/hooks/useBanners"
import type { Banner } from "@/types/banner.types"
import { usePermissions } from "@/hooks/usePermissions"
import { useShopContext, useIsSuperAdmin } from "@/hooks/useShopContext"
import { EmptyShopState } from "@/components/shared/empty-shop-state"

type FilterTab = "all" | "active" | "inactive" | "scheduled"

function getBannerStatus(
  b: Banner
): "active" | "inactive" | "scheduled" | "expired" {
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

/* ---------- Sortable Banner Card ---------- */
function SortableBannerCard({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner
  onEdit: (b: Banner) => void
  onDelete: (id: string) => void
  onToggle: (b: Banner) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const status = getBannerStatus(banner)
  const badge = STATUS_BADGE[status]

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
      onClick={() => onEdit(banner)}
    >
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-40 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-background/80 capitalize">
              {banner.banner_type ?? "carousel"}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-background/80">
              #{banner.sort_order}
            </Badge>
          </div>
          {/* Drag handle + Actions overlay */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(banner)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(banner)
                  }}
                >
                  {banner.is_active ? (
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
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(banner.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <h3 className="font-medium text-sm truncate">{banner.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {banner.link_type !== "none" && (
              <span className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {banner.link_type}
              </span>
            )}
            {banner.start_date && (
              <span>
                From: {new Date(banner.start_date).toLocaleDateString()}
              </span>
            )}
            {banner.end_date && (
              <span>
                Until: {new Date(banner.end_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BannersContent() {
  const [tab, setTab] = useState<FilterTab>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)

  // ─── Shop context gating (Req 10.5) ──────────────────────────────────────
  // Banners are a per-shop surface. Outside SINGLE_SHOP mode the page
  // renders `<EmptyShopState />` and the underlying list query is gated
  // off via `useBanners()`'s `enabled` flag, so no request is fired.
  const { mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  const { data: banners, isLoading } = useBanners()
  const deleteMutation = useDeleteBanner()
  const updateMutation = useUpdateBanner()
  const reorderMutation = useReorderBanners()
  const { can } = usePermissions()
  const canManage = can("banners.manage")

  const sorted = useMemo(() => {
    if (!banners) return []
    return [...banners].sort((a, b) => a.sort_order - b.sort_order)
  }, [banners])

  const filtered = useMemo(() => {
    if (tab === "all") return sorted
    return sorted.filter((b) => getBannerStatus(b) === tab)
  }, [sorted, tab])

  const openCreate = () => {
    setEditingBanner(null)
    setDialogOpen(true)
  }

  const openEdit = (b: Banner) => {
    setEditingBanner(b)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this banner?")) deleteMutation.mutate(id)
  }

  const toggleActive = (b: Banner) => {
    updateMutation.mutate({
      id: b.id,
      payload: { isActive: !b.is_active },
    })
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

  // Req 10.5: outside SINGLE_SHOP mode the banners surface short-circuits
  // with `<EmptyShopState />`. The list query is also gated off in this
  // branch (see `useBanners()`), so no request is fired against the
  // backend. Mirrors the pattern used by `/shop-products`, `/shop-financials`,
  // and `/shop-transactions`.
  if (mode !== "SINGLE_SHOP") {
    return (
      <div className="space-y-6">
        <PageHeader title="Banners" subtitle="Manage promotional banners" />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Banners" subtitle="Manage promotional banners">
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Banner
          </Button>
        )}
      </PageHeader>

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({sorted.length})</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Banner grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="h-40 bg-muted animate-pulse rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6 text-muted-foreground" />}
          title="No banners found"
          description={
            tab !== "all"
              ? "No banners match this filter"
              : "Create your first promotional banner"
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((banner) => (
                <SortableBannerCard
                  key={banner.id}
                  banner={banner}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Dialog */}
      <BannerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        banner={editingBanner}
      />
    </div>
  )
}

export default function BannersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <BannersContent />
    </Suspense>
  )
}
