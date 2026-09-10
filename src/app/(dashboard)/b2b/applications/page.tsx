"use client"

import { Suspense, useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, Ban, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { EmptyState } from "@/components/shared/EmptyState"
import {
  useBusinessAccounts,
  useApproveBusinessAccount,
  useRejectBusinessAccount,
} from "@/hooks/useB2B"
import { formatRelativeTime } from "@/lib/utils"
import type { BusinessAccount, BusinessAccountFilters, BusinessAccountStatus } from "@/types/b2b.types"

const STATUS_TABS: Array<{ value: BusinessAccountStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
]

const STATUS_BADGE: Record<BusinessAccountStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "#FFF8E1", text: "#F59E0B" },
  APPROVED: { label: "Approved", bg: "#ECFDF5", text: "#10B981" },
  REJECTED: { label: "Rejected", bg: "#FEF2F2", text: "#EF4444" },
  SUSPENDED: { label: "Suspended", bg: "#F3F4F6", text: "#6B7280" },
}

const DEFAULT_LIMIT = 20

export default function BusinessAccountApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsLoadingSkeleton />}>
      <ApplicationsContent />
    </Suspense>
  )
}

function ApplicationsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [statusFilter, setStatusFilter] = useState<BusinessAccountStatus | "">(() => {
    const v = searchParams.get("status")
    return v === "PENDING" || v === "APPROVED" || v === "REJECTED" || v === "SUSPENDED" ? v : ""
  })
  const [page, setPageState] = useState(() => {
    const fromUrl = Number(searchParams.get("page"))
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : 1
  })

  const [approveTarget, setApproveTarget] = useState<BusinessAccount | null>(null)
  const [approveComments, setApproveComments] = useState("")
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<BusinessAccount | null>(null)
  const [rejectReason, setRejectReason] = useState("")
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
      const next = value === "ALL" ? "" : (value as BusinessAccountStatus)
      setStatusFilter(next)
      setPageState(1)
      updateQuery({ status: next, page: undefined })
    },
    [updateQuery],
  )

  const filters: BusinessAccountFilters = {
    page,
    limit: DEFAULT_LIMIT,
    ...(statusFilter && { status: statusFilter }),
  }

  const { data, isLoading } = useBusinessAccounts(filters)
  const approveRequest = useApproveBusinessAccount()
  const rejectRequest = useRejectBusinessAccount()

  const requests = data?.requests ?? []
  const pagination = data?.pagination

  const openApprove = (request: BusinessAccount) => {
    setApproveTarget(request)
    setApproveComments("")
  }

  const openReject = (request: BusinessAccount) => {
    setRejectTarget(request)
    setRejectReason("")
  }

  return (
    <div className="space-y-4">
      <PageHeader title="B2B Applications" subtitle="Review and approve business (wholesale) account applications" />

      <Tabs value={statusFilter || "ALL"} onValueChange={handleStatusTab} className="w-full">
        <TabsList className="h-9 w-full justify-start overflow-x-auto flex-nowrap">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Company</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-60">
                  <EmptyState
                    icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
                    title="No B2B applications found"
                    description={
                      statusFilter
                        ? "Try a different status filter"
                        : "Customer business-account applications will appear here"
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const badge = STATUS_BADGE[request.status]
                return (
                  <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{request.company_name}</TableCell>
                    <TableCell className="font-mono text-xs">{request.gst_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {request.customer_name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.customer_phone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </Badge>
                      {request.status === "APPROVED" && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          B2B pricing {request.b2b_enabled ? "enabled" : "disabled"} by customer
                        </p>
                      )}
                      {request.status === "REJECTED" && request.rejection_reason && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]" title={request.rejection_reason}>
                          {request.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(request.submitted_at)}
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
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} applications
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

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve B2B Application</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium">{approveTarget.company_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{approveTarget.gst_number}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="approve-comments">Internal note (optional)</Label>
                <Textarea
                  id="approve-comments"
                  value={approveComments}
                  onChange={(e) => setApproveComments(e.target.value)}
                  placeholder="Not visible to the customer..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button disabled={approveRequest.isPending} onClick={() => setConfirmApprove(true)}>
              {approveRequest.isPending ? "Processing..." : "Approve Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {approveTarget?.company_name}&apos;s B2B application?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be able to enable B2B (wholesale) pricing on their account. You can set up a
              credit ledger for them afterward from the Financial page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!approveTarget) return
                approveRequest.mutate(
                  { id: approveTarget.id, payload: { comments: approveComments || undefined } },
                  { onSuccess: () => { setApproveTarget(null); setConfirmApprove(false) } }
                )
              }}
            >
              Yes, approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject B2B Application</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium">{rejectTarget.company_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{rejectTarget.gst_number}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Reason *</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Shown to the customer — explain why this application isn't being approved..."
                  rows={3}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectRequest.isPending || rejectReason.trim().length < 3}
              onClick={() => setConfirmReject(true)}
            >
              {rejectRequest.isPending ? "Processing..." : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejectTarget?.company_name}&apos;s B2B application?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be notified with your reason and can resubmit a corrected application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!rejectTarget) return
                rejectRequest.mutate(
                  { id: rejectTarget.id, payload: { reason: rejectReason } },
                  { onSuccess: () => { setRejectTarget(null); setConfirmReject(false) } }
                )
              }}
            >
              Yes, reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ApplicationsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
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
