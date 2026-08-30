"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { Search, X, Filter, Check, Ban } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useRefundRequests,
  useApproveRefundRequest,
  useRejectRefundRequest,
} from "@/hooks/useRefundRequests"
import { formatINR, formatRelativeTime, cn } from "@/lib/utils"
import type { RefundRequest, RefundRequestFilters, RefundRequestStatus } from "@/types/refund-request.types"

const STATUS_TABS: Array<{ value: RefundRequestStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

const STATUS_BADGE: Record<RefundRequestStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "#FFF8E1", text: "#F59E0B" },
  APPROVED: { label: "Approved", bg: "#ECFDF5", text: "#10B981" },
  REJECTED: { label: "Rejected", bg: "#FEF2F2", text: "#EF4444" },
}

const DEFAULT_LIMIT = 20
const VALID_LIMITS = [20, 50, 100]

/**
 * Mirrors the backend's own refund-amount calculation (see
 * `AdminRefundRequestsService.approve`) so the confirm dialog can show the
 * admin a preview before they commit — this is display-only, the actual
 * amount is always computed server-side at approval time, never sent from
 * here.
 */
function estimateRefundAmount(request: RefundRequest): number {
  const paidAmount = Number(request.total_amount) - Number(request.wallet_amount_used || 0)
  if (request.item_scope === "ALL") {
    return paidAmount
  }
  const itemsTotal = (request.items ?? []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  return Math.min(itemsTotal, paidAmount)
}

export default function RefundRequestsPage() {
  return (
    <Suspense fallback={<RefundRequestsLoadingSkeleton />}>
      <RefundRequestsContent />
    </Suspense>
  )
}

function RefundRequestsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")
  const [statusFilter, setStatusFilter] = useState<RefundRequestStatus | "">(() => {
    const v = searchParams.get("status")
    return v === "PENDING" || v === "APPROVED" || v === "REJECTED" ? v : ""
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
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const start = searchParams.get("startDate")
    const end = searchParams.get("endDate")
    return {
      from: start ? new Date(start) : undefined,
      to: end ? new Date(end) : undefined,
    }
  })

  const [approveTarget, setApproveTarget] = useState<RefundRequest | null>(null)
  const [refundTo, setRefundTo] = useState<"wallet" | "original">("wallet")
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<RefundRequest | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [confirmReject, setConfirmReject] = useState(false)

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

  const handleStatusTab = useCallback(
    (value: string) => {
      const next = value === "ALL" ? "" : (value as RefundRequestStatus)
      setStatusFilter(next)
      setPageState(1)
      updateQuery({ status: next, page: undefined })
    },
    [updateQuery],
  )

  const handleDateRangeChange = useCallback(
    (r: { from?: Date; to?: Date }) => {
      setDateRange(r)
      setPageState(1)
      updateQuery({
        startDate: r.from ? format(r.from, "yyyy-MM-dd") : undefined,
        endDate: r.to ? format(r.to, "yyyy-MM-dd") : undefined,
        page: undefined,
      })
    },
    [updateQuery],
  )

  const handleLimitChange = useCallback(
    (v: string) => {
      const next = Number(v)
      setLimit(next)
      setPageState(1)
      updateQuery({ limit: next === DEFAULT_LIMIT ? undefined : next, page: undefined })
    },
    [updateQuery],
  )

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

  const filters: RefundRequestFilters = {
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(dateRange.from && { startDate: format(dateRange.from, "yyyy-MM-dd") }),
    ...(dateRange.to && { endDate: format(dateRange.to, "yyyy-MM-dd") }),
  }

  const { data, isLoading } = useRefundRequests(filters)
  const approveRequest = useApproveRefundRequest()
  const rejectRequest = useRejectRefundRequest()

  const requests = data?.requests ?? []
  const pagination = data?.pagination

  const hasActiveFilters = Boolean(search || statusFilter || dateRange.from)

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
    setDateRange({})
    setPageState(1)
    updateQuery({ search: undefined, status: undefined, startDate: undefined, endDate: undefined, page: undefined })
  }

  const openApprove = (request: RefundRequest) => {
    setApproveTarget(request)
    setRefundTo("wallet")
  }

  const openReject = (request: RefundRequest) => {
    setRejectTarget(request)
    setAdminNote("")
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Refund Requests" subtitle="Review and process customer-submitted refund requests" />

      <Tabs value={statusFilter || "ALL"} onValueChange={handleStatusTab} className="w-full">
        <TabsList className="h-9 w-full justify-start overflow-x-auto flex-nowrap">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search refund requests"
            placeholder="Search order number, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border animate-fade-in">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} className="w-[220px]" />
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[140px]">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-60">
                  <EmptyState
                    title="No refund requests found"
                    description={
                      hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Customer refund requests will appear here"
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                    onAction={hasActiveFilters ? clearFilters : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const badge = STATUS_BADGE[request.status]
                return (
                  <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">#{request.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {request.customer_name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.customer_phone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.item_scope === "ALL" ? (
                        <span className="text-sm text-foreground">All items</span>
                      ) : (
                        <span className="text-sm text-foreground">
                          {request.items?.length ?? 0} item{(request.items?.length ?? 0) === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[240px]" title={request.description}>
                        {request.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </Badge>
                      {request.status !== "PENDING" && request.refund_amount != null && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {request.status === "APPROVED"
                            ? `${formatINR(request.refund_amount)} via ${request.refund_to === "original" ? "original method" : "wallet"}`
                            : null}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(request.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openReject(request)}>
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => openApprove(request)}>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {request.admin_note ? request.admin_note : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} requests
              </p>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger className="h-7 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
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

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Refund Request</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Refund Amount</Label>
                <p className="text-lg font-semibold mt-1">{formatINR(estimateRefundAmount(approveTarget))}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {approveTarget.item_scope === "ALL"
                    ? "Full amount the customer paid for this order — not editable."
                    : "Sum of the selected item(s) only, capped at what the customer paid — not editable."}
                </p>
              </div>
              <div>
                <Label>Refund To</Label>
                <Select value={refundTo} onValueChange={(v) => setRefundTo(v as "wallet" | "original")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet Balance</SelectItem>
                    <SelectItem value="original">Original Payment Method</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button disabled={approveRequest.isPending} onClick={() => setConfirmApprove(true)}>
              {approveRequest.isPending ? "Processing..." : "Approve Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refund {approveTarget ? formatINR(estimateRefundAmount(approveTarget)) : ""} to the customer?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This immediately moves money to order #{approveTarget?.order_number}&apos;s customer via{" "}
              {refundTo === "original" ? "their original payment method" : "wallet credit"}. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!approveTarget) return
                approveRequest.mutate(
                  { id: approveTarget.id, payload: { refundTo } },
                  { onSuccess: () => { setApproveTarget(null); setConfirmApprove(false) } }
                )
              }}
            >
              Yes, approve refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Note to customer (optional)</Label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Explain why this request isn't being approved..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectRequest.isPending}
              onClick={() => setConfirmReject(true)}
            >
              {rejectRequest.isPending ? "Processing..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this refund request?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be notified that order #{rejectTarget?.order_number}&apos;s refund request was not approved
              {adminNote ? ", along with your note" : ""}. No money moves. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!rejectTarget) return
                rejectRequest.mutate(
                  { id: rejectTarget.id, payload: { adminNote: adminNote || undefined } },
                  { onSuccess: () => { setRejectTarget(null); setConfirmReject(false) } }
                )
              }}
            >
              Yes, reject request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RefundRequestsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
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
