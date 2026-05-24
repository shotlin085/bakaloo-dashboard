"use client"

import { Suspense, useState, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Percent,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CouponDialog } from "@/components/coupons/CouponDialog"
import { CouponAnalyticsDrawer } from "@/components/coupons/CouponAnalyticsDrawer"
import { useCoupons, useDeleteCoupon } from "@/hooks/useCoupons"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR } from "@/lib/utils"
import type { Coupon } from "@/types/coupon.types"
import { usePermissions } from "@/hooks/usePermissions"
import { useShopContext, useIsSuperAdmin } from "@/hooks/useShopContext"
import { EmptyShopState } from "@/components/shared/empty-shop-state"

type StatusTab = "all" | "active" | "expired" | "upcoming"

function getCouponStatus(c: Coupon): "active" | "expired" | "upcoming" | "inactive" {
  if (!c.isActive) return "inactive"
  const now = new Date()
  if (c.validUntil && new Date(c.validUntil) < now) return "expired"
  if (c.validFrom && new Date(c.validFrom) > now) return "upcoming"
  return "active"
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "destructive" },
  upcoming: { label: "Upcoming", variant: "secondary" },
  inactive: { label: "Inactive", variant: "outline" },
}

function CouponsContent() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<StatusTab>("all")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [analyticsCoupon, setAnalyticsCoupon] = useState<Coupon | null>(null)

  // ─── Shop context gating (Req 10.5) ──────────────────────────────────────
  // Coupons are a per-shop surface. Outside SINGLE_SHOP mode the page
  // renders `<EmptyShopState />` and the underlying list query is gated
  // off via `useCoupons()`'s `enabled` flag, so no request is fired.
  const { mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  const debouncedSearch = useDebounce(search, 400)
  const { data, isLoading } = useCoupons({ page, limit: 20 })
  const deleteMutation = useDeleteCoupon()
  const { can } = usePermissions()
  const canManage = can("coupons.manage")

  // Client-side filter by status tab & search
  const filtered = useMemo(() => {
    if (!data?.data) return []
    let list = data.data
    if (tab !== "all") {
      list = list.filter((c) => getCouponStatus(c) === tab)
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [data?.data, tab, debouncedSearch])

  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  const openCreate = () => {
    setEditingCoupon(null)
    setDialogOpen(true)
  }

  const openEdit = (c: Coupon) => {
    setEditingCoupon(c)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this coupon?")) deleteMutation.mutate(id)
  }

  // Req 10.5: outside SINGLE_SHOP mode the coupons surface short-circuits
  // with `<EmptyShopState />`. The list query is also gated off in this
  // branch (see `useCoupons()`), so no request is fired.
  if (mode !== "SINGLE_SHOP") {
    return (
      <div className="space-y-6">
        <PageHeader title="Coupons" subtitle="Create and manage discount coupons" />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" subtitle="Create and manage discount coupons">
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Coupon
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search coupons"
            placeholder="Search by code..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => { setTab(v as StatusTab); setPage(1) }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="hidden md:table-cell">Min Order</TableHead>
              <TableHead className="hidden lg:table-cell">Usage</TableHead>
              <TableHead className="hidden md:table-cell">Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Percent className="h-6 w-6 text-muted-foreground" />}
                    title="No coupons found"
                    description={search ? "Try a different search" : "Create your first coupon"}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((coupon) => {
                const status = getCouponStatus(coupon)
                const badge = STATUS_BADGE[status]
                return (
                  <TableRow
                    key={coupon.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(coupon)}
                  >
                    <TableCell className="font-mono font-semibold">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discountType === "PERCENTAGE" ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                            {coupon.discountValue}%
                          </>
                        ) : coupon.discountType === "FREE_DELIVERY" ? (
                          <Badge variant="secondary" className="text-[10px]">Free Delivery</Badge>
                        ) : coupon.discountType === "BOGO" ? (
                          <Badge className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">BOGO</Badge>
                        ) : coupon.discountType === "CASHBACK" ? (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {coupon.discountValue}% Cashback
                          </Badge>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatINR(coupon.discountValue)}
                          </>
                        )}
                      </div>
                      {coupon.maxDiscount && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Max: {formatINR(coupon.maxDiscount)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {coupon.minOrderAmount > 0
                        ? formatINR(coupon.minOrderAmount)
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">
                        {coupon.usedCount}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {coupon.validFrom || coupon.validUntil ? (
                        <div className="text-xs space-y-0.5">
                          {coupon.validFrom && (
                            <p>From: {new Date(coupon.validFrom).toLocaleDateString()}</p>
                          )}
                          {coupon.validUntil && (
                            <p>Until: {new Date(coupon.validUntil).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Always</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
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
                              openEdit(coupon)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setAnalyticsCoupon(coupon)
                            }}
                          >
                            <BarChart3 className="h-3.5 w-3.5 mr-2" /> Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(coupon.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total ?? 0} coupons)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <CouponDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        coupon={editingCoupon}
      />

      {/* Analytics Drawer */}
      <CouponAnalyticsDrawer
        coupon={analyticsCoupon}
        open={!!analyticsCoupon}
        onOpenChange={(open) => { if (!open) setAnalyticsCoupon(null) }}
      />
    </div>
  )
}

export default function CouponsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <CouponsContent />
    </Suspense>
  )
}
