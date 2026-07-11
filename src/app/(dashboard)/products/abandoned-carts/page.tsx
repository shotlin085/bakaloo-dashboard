"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  Filter,
  X,
  CheckSquare,
  Bell,
  Ticket,
  ShoppingCart,
  IndianRupee,
  RotateCcw,
  TrendingUp,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatCard } from "@/components/dashboard/StatCard"
import { useAbandonedCarts, useAbandonedCartsSummary } from "@/hooks/useAbandonedCarts"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR, formatNumberShort, cn } from "@/lib/utils"
import type { AbandonedCartFilters, AbandonedCartStatus } from "@/types/abandoned-cart.types"
import { STATUS_CONFIG, priorityBand } from "@/components/abandoned-carts/constants"
import { AbandonedTimer } from "@/components/abandoned-carts/AbandonedTimer"
import { AbandonedCartDetailDrawer } from "@/components/abandoned-carts/AbandonedCartDetailDrawer"
import { SendReminderDialog } from "@/components/abandoned-carts/SendReminderDialog"
import { SendCouponDialog } from "@/components/abandoned-carts/SendCouponDialog"

export default function AbandonedCartsPage() {
  return (
    <Suspense fallback={<AbandonedCartsLoadingSkeleton />}>
      <AbandonedCartsContent />
    </Suspense>
  )
}

const DEFAULT_LIMIT = 25
const VALID_LIMITS = [25, 50, 100, 200]
const STATUS_OPTIONS: (AbandonedCartStatus | "ALL")[] = ["OPEN", "RECOVERED", "CONVERTED", "EXPIRED", "ALL"]
const SORT_OPTIONS: { value: AbandonedCartFilters["sortBy"]; label: string }[] = [
  { value: "priority_score", label: "Priority Score" },
  { value: "cart_value", label: "Cart Value" },
  { value: "abandoned_at", label: "Abandoned At" },
  { value: "item_count", label: "Item Count" },
]

function AbandonedCartsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")
  const [statusFilter, setStatusFilter] = useState<AbandonedCartStatus | "ALL">(() => {
    const v = searchParams.get("status")
    return v && STATUS_OPTIONS.includes(v as AbandonedCartStatus) ? (v as AbandonedCartStatus) : "OPEN"
  })
  const [minValue, setMinValue] = useState(() => searchParams.get("minValue") ?? "")
  const [maxValue, setMaxValue] = useState(() => searchParams.get("maxValue") ?? "")
  const [sortBy, setSortBy] = useState<AbandonedCartFilters["sortBy"]>(() => {
    const v = searchParams.get("sortBy")
    return (SORT_OPTIONS.find((s) => s.value === v)?.value ?? "priority_score")
  })
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(() => {
    return searchParams.get("sortOrder") === "ASC" ? "ASC" : "DESC"
  })
  const [page, setPageState] = useState(() => {
    const fromUrl = Number(searchParams.get("page"))
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : 1
  })
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get("limit"))
    return VALID_LIMITS.includes(fromUrl) ? fromUrl : DEFAULT_LIMIT
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCartId, setSelectedCartId] = useState<string | null>(() => searchParams.get("cart"))
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false)
  const [bulkCouponOpen, setBulkCouponOpen] = useState(false)

  const updateQuery = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") params.delete(key)
        else params.set(key, String(value))
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setPage = useCallback(
    (next: number | ((prev: number) => number)) => {
      setPageState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next
        updateQuery({ page: resolved > 1 ? resolved : undefined })
        return resolved
      })
    },
    [updateQuery],
  )

  const openCart = useCallback(
    (id: string) => {
      setSelectedCartId(id)
      updateQuery({ cart: id })
    },
    [updateQuery],
  )

  const closeCart = useCallback(() => {
    setSelectedCartId(null)
    updateQuery({ cart: undefined })
  }, [updateQuery])

  const handleStatusChange = (v: string) => {
    const next = v as AbandonedCartStatus | "ALL"
    setStatusFilter(next)
    setPageState(1)
    updateQuery({ status: next === "OPEN" ? undefined : next, page: undefined })
  }

  const handleSortByChange = (v: string) => {
    setSortBy(v as AbandonedCartFilters["sortBy"])
    setPageState(1)
    updateQuery({ sortBy: v, page: undefined })
  }

  const handleSortOrderToggle = () => {
    const next = sortOrder === "DESC" ? "ASC" : "DESC"
    setSortOrder(next)
    updateQuery({ sortOrder: next })
  }

  const handleMinValueChange = (v: string) => {
    setMinValue(v)
    setPageState(1)
    updateQuery({ minValue: v, page: undefined })
  }

  const handleMaxValueChange = (v: string) => {
    setMaxValue(v)
    setPageState(1)
    updateQuery({ maxValue: v, page: undefined })
  }

  const handleLimitChange = (v: string) => {
    const next = Number(v)
    setLimit(next)
    setPageState(1)
    updateQuery({ limit: next === DEFAULT_LIMIT ? undefined : next, page: undefined })
  }

  const debouncedSearch = useDebounce(search, 400)
  const isFirstSearchSync = useRef(true)
  useEffect(() => {
    if (isFirstSearchSync.current) {
      isFirstSearchSync.current = false
      return
    }
    setPageState(1)
    updateQuery({ search: debouncedSearch, page: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const filters: AbandonedCartFilters = {
    page,
    limit,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(minValue && { minValue: Number(minValue) }),
    ...(maxValue && { maxValue: Number(maxValue) }),
    sortBy,
    sortOrder,
  }

  const { data, isLoading } = useAbandonedCarts(filters)
  const { data: summary } = useAbandonedCartsSummary()

  const carts = data?.carts ?? []
  const pagination = data?.pagination

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("OPEN")
    setMinValue("")
    setMaxValue("")
    setSortBy("priority_score")
    setSortOrder("DESC")
    setPageState(1)
    setSelectedIds(new Set())
    updateQuery({
      search: undefined,
      status: undefined,
      minValue: undefined,
      maxValue: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      page: undefined,
    })
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
    if (selectedIds.size === carts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(carts.map((c) => c.id)))
    }
  }

  const hasActiveFilters = search || statusFilter !== "OPEN" || minValue || maxValue

  return (
    <div className="space-y-4">
      <PageHeader title="Abandoned Carts" subtitle="Recover revenue from carts customers left behind" />

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Open Carts"
            value={formatNumberShort(summary.openCount)}
            icon={<ShoppingCart className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Value at Risk"
            value={formatINR(summary.openValue)}
            icon={<IndianRupee className="h-4 w-4 text-amber-500" />}
          />
          <StatCard
            label="Recovered Today"
            value={formatNumberShort(summary.recoveredToday)}
            icon={<RotateCcw className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            label="7-Day Recovery Rate"
            value={`${(summary.recoveryRate7d * 100).toFixed(0)}%`}
            icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
          />
        </div>
      )}

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search abandoned carts"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Statuses" : STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value!}>
                Sort: {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9" onClick={handleSortOrderToggle}>
          {sortOrder === "DESC" ? "↓ Desc" : "↑ Asc"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("h-9", showFilters && "bg-accent")}
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border animate-fade-in">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min ₹"
              value={minValue}
              onChange={(e) => handleMinValueChange(e.target.value)}
              className="h-9 w-[90px] text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max ₹"
              value={maxValue}
              onChange={(e) => handleMaxValueChange(e.target.value)}
              className="h-9 w-[90px] text-xs"
            />
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg animate-fade-in">
          <CheckSquare className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium">{selectedIds.size} cart(s) selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkReminderOpen(true)}>
              <Bell className="h-3.5 w-3.5 mr-1" />
              Send Reminder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkCouponOpen(true)}>
              <Ticket className="h-3.5 w-3.5 mr-1" />
              Send Coupon
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={carts.length > 0 && selectedIds.size === carts.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Cart Value</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Idle For</TableHead>
              <TableHead className="text-center">Reminders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : carts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-60">
                  <EmptyState
                    icon={<ShoppingCart className="h-6 w-6 text-muted-foreground" />}
                    title="No abandoned carts found"
                    description={
                      hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Carts idle for 10+ minutes will appear here automatically"
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                    onAction={hasActiveFilters ? clearFilters : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              carts.map((cart) => {
                const status = STATUS_CONFIG[cart.status]
                const band = priorityBand(cart.priorityScore)
                return (
                  <TableRow
                    key={cart.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => openCart(cart.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(cart.id)}
                        onCheckedChange={() => toggleSelect(cart.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {cart.userName || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{cart.userPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatINR(cart.cartValue)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {cart.itemCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: band.bg, color: band.text }}
                      >
                        {band.label} · {cart.priorityScore.toFixed(0)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cart.status === "OPEN" ? (
                        <AbandonedTimer abandonedAt={cart.abandonedAt} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {cart.reminderCount}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} carts
              </p>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger className="h-7 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_LIMITS.map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {l} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pagination.totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      <AbandonedCartDetailDrawer cartId={selectedCartId} open={!!selectedCartId} onClose={closeCart} />

      <SendReminderDialog
        open={bulkReminderOpen}
        onOpenChange={(v) => {
          setBulkReminderOpen(v)
          if (!v) setSelectedIds(new Set())
        }}
        cartIds={Array.from(selectedIds)}
      />
      <SendCouponDialog
        open={bulkCouponOpen}
        onOpenChange={(v) => {
          setBulkCouponOpen(v)
          if (!v) setSelectedIds(new Set())
        }}
        cartIds={Array.from(selectedIds)}
      />
    </div>
  )
}

function AbandonedCartsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
