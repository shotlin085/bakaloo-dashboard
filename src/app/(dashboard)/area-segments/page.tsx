"use client"

import { Suspense, useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, MapPinned, Truck } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AreaSegmentDialog } from "@/components/area-segments/AreaSegmentDialog"
import { AreaSegmentAddressesDrawer } from "@/components/area-segments/AreaSegmentAddressesDrawer"
import { useAreaSegments, useDeleteAreaSegment } from "@/hooks/useAreaSegments"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDate } from "@/lib/utils"
import type { AreaSegment } from "@/types/area-segment.types"

function AreaSegmentsContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AreaSegment | null>(null)
  const [addressesSegment, setAddressesSegment] = useState<AreaSegment | null>(null)

  const { data: segments, isLoading } = useAreaSegments()
  const deleteMutation = useDeleteAreaSegment()
  const { can } = usePermissions()
  const canManage = can("riders.manage")

  const openCreate = () => {
    setEditingSegment(null)
    setDialogOpen(true)
  }

  const openEdit = (segment: AreaSegment) => {
    setEditingSegment(segment)
    setDialogOpen(true)
  }

  const handleDelete = (segment: AreaSegment) => {
    if (confirm(`Delete area segment "${segment.name}"? Orders already assigned via this segment are unaffected.`)) {
      deleteMutation.mutate(segment.id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Area Segments"
        subtitle="Assign a dedicated rider to specific customer addresses — the exact saved address must match to apply"
      >
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Segment
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Addresses</TableHead>
              <TableHead className="hidden md:table-cell">Priority</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !segments || segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={<MapPinned className="h-6 w-6 text-muted-foreground" />}
                    title="No area segments yet"
                    description="Create a segment to auto-assign a dedicated rider to a customer's exact saved address"
                  />
                </TableCell>
              </TableRow>
            ) : (
              segments.map((segment) => (
                <TableRow
                  key={segment.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setAddressesSegment(segment)}
                >
                  <TableCell className="font-medium">{segment.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {segment.description || "—"}
                  </TableCell>
                  <TableCell>
                    {segment.rider_name ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        {segment.rider_name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
                      {segment.address_count}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {segment.priority}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(segment.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={segment.is_active ? "default" : "outline"}>
                      {segment.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(segment)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(segment)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AreaSegmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        segment={editingSegment}
      />

      <AreaSegmentAddressesDrawer
        segment={addressesSegment}
        open={!!addressesSegment}
        onOpenChange={(open) => { if (!open) setAddressesSegment(null) }}
      />
    </div>
  )
}

export default function AreaSegmentsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <AreaSegmentsContent />
    </Suspense>
  )
}
