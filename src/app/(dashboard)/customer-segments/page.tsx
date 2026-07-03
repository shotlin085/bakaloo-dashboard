"use client"

import { Suspense, useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, Users2, UsersRound } from "lucide-react"
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
import { CustomerSegmentDialog } from "@/components/customer-segments/CustomerSegmentDialog"
import { CustomerSegmentMembersDrawer } from "@/components/customer-segments/CustomerSegmentMembersDrawer"
import { useCustomerSegments, useDeleteSegment } from "@/hooks/useCustomerSegments"
import { usePermissions } from "@/hooks/usePermissions"
import { formatDate } from "@/lib/utils"
import type { CustomerSegment } from "@/types/customer-segment.types"

function CustomerSegmentsContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null)
  const [membersSegment, setMembersSegment] = useState<CustomerSegment | null>(null)

  const { data: segments, isLoading } = useCustomerSegments()
  const deleteMutation = useDeleteSegment()
  const { can } = usePermissions()
  const canManage = can("customers.manage")

  const openCreate = () => {
    setEditingSegment(null)
    setDialogOpen(true)
  }

  const openEdit = (segment: CustomerSegment) => {
    setEditingSegment(segment)
    setDialogOpen(true)
  }

  const handleDelete = (segment: CustomerSegment) => {
    if (confirm(`Delete segment "${segment.name}"? This removes it from any coupons/notifications using it.`)) {
      deleteMutation.mutate(segment.id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Segments"
        subtitle="Group customers to target with coupons and notifications"
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
              <TableHead>Members</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !segments || segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<Users2 className="h-6 w-6 text-muted-foreground" />}
                    title="No customer segments yet"
                    description='Create a segment like "VIP Grocery Customers" to target with coupons and notifications'
                  />
                </TableCell>
              </TableRow>
            ) : (
              segments.map((segment) => (
                <TableRow
                  key={segment.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setMembersSegment(segment)}
                >
                  <TableCell className="font-medium">{segment.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {segment.description || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
                      {segment.member_count}
                    </span>
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

      <CustomerSegmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        segment={editingSegment}
      />

      <CustomerSegmentMembersDrawer
        segment={membersSegment}
        open={!!membersSegment}
        onOpenChange={(open) => { if (!open) setMembersSegment(null) }}
      />
    </div>
  )
}

export default function CustomerSegmentsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <CustomerSegmentsContent />
    </Suspense>
  )
}
