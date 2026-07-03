"use client"

import { Suspense, useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, Gift } from "lucide-react"
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
import { FirstTimeOfferDialog } from "@/components/first-time-offers/FirstTimeOfferDialog"
import { useFirstTimeOffers, useDeleteFirstTimeOffer } from "@/hooks/useFirstTimeOffers"
import { usePermissions } from "@/hooks/usePermissions"
import { formatINR } from "@/lib/utils"
import type { FirstTimeOffer } from "@/types/first-time-offer.types"

const REWARD_SUMMARY: Record<string, (o: FirstTimeOffer) => string> = {
  FREE_DELIVERY: () => "Free delivery",
  FLAT_DISCOUNT: (o) => `${formatINR(o.rewardValue ?? 0)} off`,
  PERCENTAGE_DISCOUNT: (o) => `${o.rewardValue ?? 0}% off${o.maxDiscount ? ` (max ${formatINR(o.maxDiscount)})` : ""}`,
  WALLET_CASHBACK: (o) => `${formatINR(o.rewardValue ?? 0)} cashback`,
  COUPON_UNLOCK: () => "Unlocks a coupon",
}

function FirstTimeOffersContent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<FirstTimeOffer | null>(null)

  const { data: offers, isLoading } = useFirstTimeOffers()
  const deleteMutation = useDeleteFirstTimeOffer()
  const { can } = usePermissions()
  const canManage = can("coupons.manage")

  const openCreate = () => {
    setEditingOffer(null)
    setDialogOpen(true)
  }

  const openEdit = (offer: FirstTimeOffer) => {
    setEditingOffer(offer)
    setDialogOpen(true)
  }

  const handleDelete = (offer: FirstTimeOffer) => {
    if (confirm(`Delete "${offer.name}"?`)) deleteMutation.mutate(offer.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="First-Time Offers"
        subtitle="Graduated rewards for a customer's first order — the bigger the cart, the better the reward"
      >
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Offer
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="hidden md:table-cell">Auto-apply</TableHead>
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
            ) : !offers || offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Gift className="h-6 w-6 text-muted-foreground" />}
                    title="No first-time offers yet"
                    description="Create a graduated ladder like ₹299 → free delivery, ₹999 → ₹100 cashback"
                  />
                </TableCell>
              </TableRow>
            ) : (
              [...offers]
                .sort((a, b) => a.minOrderAmount - b.minOrderAmount)
                .map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">{offer.name}</TableCell>
                    <TableCell>{formatINR(offer.minOrderAmount)}</TableCell>
                    <TableCell className="text-sm">
                      {(REWARD_SUMMARY[offer.rewardType] ?? (() => offer.rewardType))(offer)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {offer.paymentMethodScope === "ONLINE_ONLY" ? "Online only" : "All methods"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={offer.autoApply ? "secondary" : "outline"} className="text-[10px]">
                        {offer.autoApply ? "Auto" : "Claim required"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.isActive ? "default" : "outline"}>
                        {offer.isActive ? "Active" : "Inactive"}
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
                            <DropdownMenuItem onClick={() => openEdit(offer)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(offer)}
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

      <FirstTimeOfferDialog open={dialogOpen} onClose={() => setDialogOpen(false)} offer={editingOffer} />
    </div>
  )
}

export default function FirstTimeOffersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <FirstTimeOffersContent />
    </Suspense>
  )
}
