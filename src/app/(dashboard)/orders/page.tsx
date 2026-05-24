"use client"

import { Suspense, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  Search,
  Download,
  Filter,
  X,
  Plus,
  CheckSquare,
  Truck,
  RefreshCw,
  Printer,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { useOrders, useOrderStatusCounts, useExportOrders, useBulkUpdateStatus, useBulkAssignRiders } from "@/hooks/useOrders"
import { useRiders } from "@/hooks/useRiders"
import { useShopContext } from "@/hooks/useShopContext"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useDebounce } from "@/hooks/useDebounce"
import {
  ORDER_STATUSES,
  STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/constants"
import { formatINR, formatRelativeTime, cn } from "@/lib/utils"
import type { OrderFilters } from "@/types"
import { Checkbox } from "@/components/ui/checkbox"
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer"
import { useConnectionStatus } from "@/hooks/useSocket"
import { usePermissions } from "@/hooks/usePermissions"

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingSkeleton />}>
      <OrdersContent />
    </Suspense>
  )
}

function OrdersContent() {
  const searchParams = useSearchParams()

  // State
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">(
    (searchParams.get("status") as OrderStatus) || ""
  )
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "">("")
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [deliveryType, setDeliveryType] = useState("")
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<OrderStatus | "">("")
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkRiderId, setBulkRiderId] = useState("")
  const [riderFilter, setRiderFilter] = useState("")
  const [areaFilter, setAreaFilter] = useState("")

  const debouncedSearch = useDebounce(search, 400)

  const filters: OrderFilters = {
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
    ...(paymentFilter && { paymentMethod: paymentFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(dateRange.from && { startDate: format(dateRange.from, "yyyy-MM-dd") }),
    ...(dateRange.to && { endDate: format(dateRange.to, "yyyy-MM-dd") }),
    ...(minAmount && { minAmount: Number(minAmount) }),
    ...(maxAmount && { maxAmount: Number(maxAmount) }),
    ...(deliveryType && { deliveryType }),
    ...(riderFilter && { riderId: riderFilter }),
    ...(areaFilter && { area: areaFilter }),
  }

  const { data, isLoading } = useOrders(filters)
  const { data: statusCounts } = useOrderStatusCounts()
  const exportOrders = useExportOrders()
  const bulkUpdateStatus = useBulkUpdateStatus()
  const bulkAssignRiders = useBulkAssignRiders()
  const { data: ridersData } = useRiders()
  const connStatus = useConnectionStatus()
  const { can } = usePermissions()
  const canManage = can("orders.manage")
  const { mode } = useShopContext()
  /**
   * In ALL_SHOPS mode (Super_Admin viewing every shop), the orders list
   * surfaces a `Shop` column so each row's attribution is visible at a
   * glance (Req 10.6). In SINGLE_SHOP mode the column is redundant — the
   * `<ShopScopeBadge />` in the page header already pins the visible scope —
   * so we hide it to keep the table dense on small viewports.
   */
  const showShopColumn = mode === "ALL_SHOPS"

  const orders = data?.orders ?? []
  const pagination = data?.pagination

  const handleStatusTab = useCallback(
    (status: string) => {
      setStatusFilter(status === "ALL" ? "" : (status as OrderStatus))
      setPage(1)
    },
    []
  )

  const handleExport = () => {
    exportOrders.mutate({
      status: statusFilter || undefined,
    })
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
    setPaymentFilter("")
    setDateRange({})
    setMinAmount("")
    setMaxAmount("")
    setDeliveryType("")
    setRiderFilter("")
    setAreaFilter("")
    setPage(1)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)))
    }
  }

  const hasActiveFilters = search || statusFilter || paymentFilter || dateRange.from || minAmount || maxAmount || deliveryType || riderFilter || areaFilter

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader title="Orders" subtitle="Manage and track customer orders">
        <div className="flex items-center gap-2">
          {connStatus === "connected" && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Live
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportOrders.isPending}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          {canManage && (
            <Link href="/orders/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Order
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter || "ALL"}
        onValueChange={handleStatusTab}
        className="w-full"
      >
        <TabsList className="h-9 w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="ALL" className="text-xs px-3">
            All {statusCounts && `(${Object.values(statusCounts).reduce((s: number, c: number) => s + c, 0)})`}
          </TabsTrigger>
          {ORDER_STATUSES.map((s) => {
            const config = STATUS_CONFIG[s]
            const count = statusCounts?.[s] ?? 0
            return (
              <TabsTrigger key={s} value={s} className="text-xs px-3 whitespace-nowrap">
                {config.label}
                {count > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px] border-0"
                    style={{ backgroundColor: config.bg, color: config.text }}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search orders"
            placeholder="Search order ID, customer name, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && "bg-accent")}
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border animate-fade-in">
          <Select
            value={paymentFilter}
            onValueChange={(v) => {
              setPaymentFilter(v as PaymentMethod | "")
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_methods">All Methods</SelectItem>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            value={dateRange}
            onChange={(r) => {
              setDateRange(r)
              setPage(1)
            }}
            className="w-[220px]"
          />

          <Select
            value={deliveryType}
            onValueChange={(v) => {
              setDeliveryType(v === "all_types" ? "" : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Delivery Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_types">All Types</SelectItem>
              <SelectItem value="express">Express</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min ₹"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[90px] text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[90px] text-xs"
            />
          </div>

          {/* Rider Filter */}
          <Select
            value={riderFilter || "all_riders"}
            onValueChange={(v) => {
              setRiderFilter(v === "all_riders" ? "" : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Assigned Rider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_riders">All Riders</SelectItem>
              {(ridersData?.riders ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Area / Pincode Filter */}
          <Input
            placeholder="Area / Pincode"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value)
              setPage(1)
            }}
            className="h-9 w-[140px] text-xs"
          />
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg animate-fade-in">
          <CheckSquare className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium">{selectedIds.size} order(s) selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkStatusOpen(true)}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Update Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAssignOpen(true)}
            >
              <Truck className="h-3.5 w-3.5 mr-1" />
              Assign Rider
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ids = Array.from(selectedIds)
                ids.forEach((id) => {
                  window.open(`/orders/${id}/packing-slip`, "_blank")
                })
              }}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print Slips
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportOrders.mutate({
                  status: statusFilter || undefined,
                })
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={orders.length > 0 && selectedIds.size === orders.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[140px]">Order ID</TableHead>
              <TableHead>Customer</TableHead>
              {showShopColumn && <TableHead>Shop</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  {showShopColumn && (
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  )}
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showShopColumn ? 9 : 8} className="h-60">
                  <EmptyState
                    title="No orders found"
                    description={
                      hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Orders will appear here when customers place them"
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                    onAction={hasActiveFilters ? clearFilters : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const status = STATUS_CONFIG[order.status] ?? {
                  label: order.status,
                  bg: "#F3F4F6",
                  text: "#6B7280",
                  icon: "●",
                }
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {order.customer_name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer_phone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    {showShopColumn && (
                      <TableCell>
                        <span className="text-sm text-foreground truncate block max-w-[160px]">
                          {order.shop_name ?? order.shop?.name ?? "—"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-semibold text-sm">
                      {formatINR(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.icon} {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {order.rider_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(order.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} orders
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="h-8 w-8 text-xs p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />

      {/* Bulk Status Update Dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status for {selectedIds.size} Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>New Status</Label>
            <Select value={bulkStatusValue} onValueChange={(v) => setBulkStatusValue(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)}>Cancel</Button>
            <Button
              disabled={!bulkStatusValue || bulkUpdateStatus.isPending}
              onClick={() => {
                bulkUpdateStatus.mutate({
                  orderIds: Array.from(selectedIds),
                  status: bulkStatusValue as OrderStatus,
                }, {
                  onSuccess: () => {
                    setBulkStatusOpen(false)
                    setBulkStatusValue("")
                    setSelectedIds(new Set())
                  },
                })
              }}
            >
              {bulkUpdateStatus.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Rider Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Rider to {selectedIds.size} Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Select Rider</Label>
            <Select value={bulkRiderId} onValueChange={setBulkRiderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a rider..." />
              </SelectTrigger>
              <SelectContent>
                {(ridersData?.riders ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {r.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!bulkRiderId || bulkAssignRiders.isPending}
              onClick={() => {
                bulkAssignRiders.mutate(
                  Array.from(selectedIds).map((orderId) => ({ orderId, riderId: bulkRiderId })),
                  {
                    onSuccess: () => {
                      setBulkAssignOpen(false)
                      setBulkRiderId("")
                      setSelectedIds(new Set())
                    },
                  }
                )
              }}
            >
              {bulkAssignRiders.isPending ? "Assigning..." : "Assign Rider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
