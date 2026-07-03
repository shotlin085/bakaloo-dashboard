"use client"

import { Suspense, useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp } from "lucide-react"
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
import { CartMilestoneDialog } from "@/components/cart-milestones/CartMilestoneDialog"
import { useCartMilestones, useDeleteCartMilestone } from "@/hooks/useCartMilestones"
import { usePermissions } from "@/hooks/usePermissions"
import { formatINR } from "@/lib/utils"
import type { CartMilestone } from "@/types/cart-milestone.types"

const REWARD_SUMMARY: Record<string, (m: CartMilestone) => string> = {
  CASHBACK: (m) => `${formatINR(m.rewardValue ?? 0)} cashback${m.maxDiscount ? ` (max ${formatINR(m.maxDiscount)})` : ""}`,
  FLAT_DISCOUNT: (m) => `${formatINR(m.rewardValue ?? 0)} off`,
  COUPON_UNLOCK: () => "Unlocks a coupon",
}

function CartMilestonesContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<CartMilestone | null>(null)

  const { data: milestones, isLoading } = useCartMilestones()
  const deleteMutation = useDeleteCartMilestone()
  const { can } = usePermissions()
  const canManage = can("coupons.manage")

  const openCreate = () => {
    setEditingMilestone(null)
    setDialogOpen(true)
  }

  const openEdit = (milestone: CartMilestone) => {
    setEditingMilestone(milestone)
    setDialogOpen(true)
  }

  const handleDelete = (milestone: CartMilestone) => {
    if (confirm(`Delete "${milestone.name}"?`)) deleteMutation.mutate(milestone.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cart Milestones"
        subtitle="A graduated ladder of rewards unlocked by cart value — shown live in the app's Smart Bottom Bar"
      >
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Milestone
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Min Cart</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead className="hidden md:table-cell">Applies To</TableHead>
              <TableHead className="hidden md:table-cell">Stackable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !milestones || milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
                    title="No cart milestones yet"
                    description="Create a ladder like ₹500 = ₹20 cashback, ₹999 = ₹100 cashback"
                  />
                </TableCell>
              </TableRow>
            ) : (
              [...milestones]
                .sort((a, b) => a.minCartAmount - b.minCartAmount)
                .map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell className="font-medium">{milestone.name}</TableCell>
                    <TableCell>{formatINR(milestone.minCartAmount)}</TableCell>
                    <TableCell className="text-sm">
                      {(REWARD_SUMMARY[milestone.rewardType] ?? (() => milestone.rewardType))(milestone)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {milestone.applicableUserType === "ALL"
                        ? "All users"
                        : milestone.applicableUserType === "FIRST_TIME"
                          ? "First-time users"
                          : "Segment"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={milestone.stackableWithCoupon ? "secondary" : "outline"} className="text-[10px]">
                        {milestone.stackableWithCoupon ? "Stackable" : "Exclusive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={milestone.isActive ? "default" : "outline"}>
                        {milestone.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(milestone)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(milestone)}
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

      <CartMilestoneDialog open={dialogOpen} onClose={() => setDialogOpen(false)} milestone={editingMilestone} />
    </div>
  )
}

export default function CartMilestonesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <CartMilestonesContent />
    </Suspense>
  )
}
