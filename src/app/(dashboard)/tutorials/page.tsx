"use client"

import { Suspense, useMemo, useState, useCallback } from "react"
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
  PlayCircle,
  Youtube,
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
import { TutorialDialog } from "@/components/tutorials/TutorialDialog"
import {
  useTutorials,
  useDeleteTutorial,
  useUpdateTutorial,
  useReorderTutorials,
} from "@/hooks/useTutorials"
import type { TutorialVideo } from "@/types/tutorial.types"

function SortableTutorialCard({
  tutorial,
  onEdit,
  onDelete,
  onToggle,
}: {
  tutorial: TutorialVideo
  onEdit: (t: TutorialVideo) => void
  onDelete: (id: string) => void
  onToggle: (t: TutorialVideo) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tutorial.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
      onClick={() => onEdit(tutorial)}
    >
      <CardContent className="p-0">
        <div className="relative h-36 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${tutorial.video_id}/mqdefault.jpg`}
            alt={tutorial.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
            <PlayCircle className="h-10 w-10 text-white/90 drop-shadow" />
          </div>

          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge variant={tutorial.is_active ? "default" : "outline"} className="text-[10px]">
              {tutorial.is_active ? "Active" : "Inactive"}
            </Badge>
            {tutorial.language && (
              <Badge variant="outline" className="text-[10px] bg-background/80">
                {tutorial.language}
              </Badge>
            )}
          </div>

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
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(tutorial)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(tutorial)
                  }}
                >
                  {tutorial.is_active ? (
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
                    onDelete(tutorial.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-3 space-y-0.5">
          <h3 className="font-medium text-sm truncate">{tutorial.title}</h3>
          <p className="text-xs text-muted-foreground">#{tutorial.sort_order}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TutorialsContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TutorialVideo | null>(null)

  const { data: tutorials, isLoading } = useTutorials()
  const deleteMutation = useDeleteTutorial()
  const updateMutation = useUpdateTutorial()
  const reorderMutation = useReorderTutorials()

  const sorted = useMemo(() => {
    if (!tutorials) return []
    return [...tutorials].sort((a, b) => a.sort_order - b.sort_order)
  }, [tutorials])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (t: TutorialVideo) => {
    setEditing(t)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this tutorial video?")) deleteMutation.mutate(id)
  }

  const toggleActive = (t: TutorialVideo) => {
    updateMutation.mutate({ id: t.id, payload: { isActive: !t.is_active } })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sorted.findIndex((t) => t.id === active.id)
      const newIndex = sorted.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(sorted.map((t) => t.id), oldIndex, newIndex)
      reorderMutation.mutate(newOrder)
    },
    [sorted, reorderMutation]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials"
        subtitle="YouTube walkthrough videos customers can watch inside the app"
      >
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Tutorial
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="h-36 bg-muted animate-pulse rounded-t-lg" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Youtube className="h-6 w-6 text-muted-foreground" />}
          title="No tutorials yet"
          description="Add your first tutorial video by pasting a YouTube link"
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((tutorial) => (
                <SortableTutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TutorialDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tutorial={editing} />
    </div>
  )
}

export default function TutorialsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <TutorialsContent />
    </Suspense>
  )
}
