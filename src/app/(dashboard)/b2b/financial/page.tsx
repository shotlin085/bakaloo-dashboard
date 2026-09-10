"use client"

import { Suspense, useState } from "react"
import {
  Landmark,
  Plus,
  Settings2,
  RotateCcw,
  History,
  AlertTriangle,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useLedgerAccounts,
  useLedgerCycles,
  useSetupLedgerAccount,
  useUpdateLedgerLimits,
  useSetLedgerStatus,
  useRepayLedgerAccount,
  useMarkLedgerCyclePaid,
  useBusinessAccounts,
} from "@/hooks/useB2B"
import { formatINR } from "@/lib/utils"
import type { LedgerAccount, LedgerAccountStatus } from "@/types/b2b.types"

type StatusTab = "all" | LedgerAccountStatus

function FinancialContent() {
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all")
  const [page, setPage] = useState(1)

  const [setupOpen, setSetupOpen] = useState(false)
  const [setupForm, setSetupForm] = useState({ businessAccountId: "", monthlyCreditLimit: 0, hardLimit: 0, billingDay: 1 })

  const [limitsTarget, setLimitsTarget] = useState<LedgerAccount | null>(null)
  const [limitsForm, setLimitsForm] = useState({ monthlyCreditLimit: 0, hardLimit: 0, billingDay: 1 })

  const [repayTarget, setRepayTarget] = useState<LedgerAccount | null>(null)
  const [repayForm, setRepayForm] = useState({ amount: 0, description: "" })

  const [cyclesTarget, setCyclesTarget] = useState<LedgerAccount | null>(null)

  const { data, isLoading } = useLedgerAccounts({
    page,
    limit: 20,
    ...(statusFilter !== "all" && { status: statusFilter }),
  })
  // Approved accounts without a ledger yet are the eligible pool for "Set Up Ledger".
  const { data: approvedApplications } = useBusinessAccounts({ status: "APPROVED", limit: 100 })

  const accounts = data?.accounts ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  const setupMutation = useSetupLedgerAccount()
  const limitsMutation = useUpdateLedgerLimits()
  const statusMutation = useSetLedgerStatus()
  const repayMutation = useRepayLedgerAccount()

  const eligibleBusinessAccounts = (approvedApplications?.requests ?? []).filter(
    (ba) => !accounts.some((la) => la.business_account_id === ba.id)
  )

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!setupForm.businessAccountId || setupForm.monthlyCreditLimit <= 0) return
    setupMutation.mutate(
      {
        businessAccountId: setupForm.businessAccountId,
        payload: {
          monthlyCreditLimit: setupForm.monthlyCreditLimit,
          hardLimit: setupForm.hardLimit > 0 ? setupForm.hardLimit : undefined,
          billingDay: setupForm.billingDay,
        },
      },
      {
        onSuccess: () => {
          setSetupOpen(false)
          setSetupForm({ businessAccountId: "", monthlyCreditLimit: 0, hardLimit: 0, billingDay: 1 })
        },
      }
    )
  }

  const openLimits = (account: LedgerAccount) => {
    setLimitsTarget(account)
    setLimitsForm({
      monthlyCreditLimit: account.monthly_credit_limit,
      hardLimit: account.hard_limit,
      billingDay: account.billing_day,
    })
  }

  const handleLimits = (e: React.FormEvent) => {
    e.preventDefault()
    if (!limitsTarget) return
    limitsMutation.mutate(
      { id: limitsTarget.id, payload: limitsForm },
      { onSuccess: () => setLimitsTarget(null) }
    )
  }

  const openRepay = (account: LedgerAccount) => {
    setRepayTarget(account)
    setRepayForm({ amount: 0, description: "" })
  }

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!repayTarget || repayForm.amount <= 0) return
    repayMutation.mutate(
      {
        id: repayTarget.id,
        payload: { amount: repayForm.amount, description: repayForm.description || undefined },
      },
      { onSuccess: () => setRepayTarget(null) }
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="B2B Financial" subtitle="Set up credit ledgers and manage billing cycles for business accounts">
        <Button onClick={() => setSetupOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Set Up Ledger
        </Button>
      </PageHeader>

      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusTab); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
          <TabsTrigger value="CLOSED">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Credit / Hard Limit</TableHead>
              <TableHead>Billing Day</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
                    title="No ledger accounts"
                    description="Set up a credit ledger for an approved B2B application to get started"
                  />
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => {
                const overLimit = account.current_balance > account.monthly_credit_limit
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{account.company_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{account.gst_number}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{account.customer_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{account.customer_phone || "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={overLimit ? "font-semibold text-amber-600" : "font-semibold"}>
                        {formatINR(account.current_balance)}
                      </span>
                      {overLimit && (
                        <p className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5 mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> Over credit limit
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatINR(account.monthly_credit_limit)} / {formatINR(account.hard_limit)}
                    </TableCell>
                    <TableCell className="text-xs">Day {account.billing_day}</TableCell>
                    <TableCell>
                      <LedgerStatusBadge status={account.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCyclesTarget(account)}>
                          <History className="h-3.5 w-3.5 mr-1" /> Cycles
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openRepay(account)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Repay
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openLimits(account)}>
                          <Settings2 className="h-3.5 w-3.5 mr-1" /> Limits
                        </Button>
                        {account.status !== "CLOSED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: account.id,
                                status: account.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                              })
                            }
                          >
                            {account.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total ?? 0} ledger accounts)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Set Up Ledger Dialog */}
      <Dialog open={setupOpen} onOpenChange={(v) => !v && setSetupOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up B2B Ledger</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Business Account *</Label>
              <Select
                value={setupForm.businessAccountId}
                onValueChange={(v) => setSetupForm({ ...setupForm, businessAccountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an approved business account" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleBusinessAccounts.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No approved applications without a ledger yet
                    </div>
                  ) : (
                    eligibleBusinessAccounts.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.company_name} · {ba.gst_number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthlyCreditLimit">Monthly Credit Limit (₹) *</Label>
              <Input
                id="monthlyCreditLimit"
                type="number"
                min={1}
                step={0.01}
                value={setupForm.monthlyCreditLimit || ""}
                onChange={(e) => setSetupForm({ ...setupForm, monthlyCreditLimit: parseFloat(e.target.value) || 0 })}
                required
              />
              <p className="text-xs text-muted-foreground">
                The soft cap billed each cycle — draws past this are allowed and billed as overage.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hardLimit">Hard Limit (₹, optional)</Label>
              <Input
                id="hardLimit"
                type="number"
                min={setupForm.monthlyCreditLimit || 1}
                step={0.01}
                value={setupForm.hardLimit || ""}
                onChange={(e) => setSetupForm({ ...setupForm, hardLimit: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                The hard cap actually enforced — draws that would exceed it are blocked. Defaults to the credit limit.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billingDay">Billing Day of Month</Label>
              <Input
                id="billingDay"
                type="number"
                min={1}
                max={28}
                value={setupForm.billingDay}
                onChange={(e) => setSetupForm({ ...setupForm, billingDay: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={setupMutation.isPending}>
                {setupMutation.isPending ? "Setting up..." : "Set Up Ledger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Limits Dialog */}
      <Dialog open={!!limitsTarget} onOpenChange={(v) => !v && setLimitsTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Limits — {limitsTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLimits} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editMonthlyCreditLimit">Monthly Credit Limit (₹)</Label>
              <Input
                id="editMonthlyCreditLimit"
                type="number"
                min={1}
                step={0.01}
                value={limitsForm.monthlyCreditLimit || ""}
                onChange={(e) => setLimitsForm({ ...limitsForm, monthlyCreditLimit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editHardLimit">Hard Limit (₹)</Label>
              <Input
                id="editHardLimit"
                type="number"
                min={1}
                step={0.01}
                value={limitsForm.hardLimit || ""}
                onChange={(e) => setLimitsForm({ ...limitsForm, hardLimit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editBillingDay">Billing Day of Month</Label>
              <Input
                id="editBillingDay"
                type="number"
                min={1}
                max={28}
                value={limitsForm.billingDay}
                onChange={(e) => setLimitsForm({ ...limitsForm, billingDay: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLimitsTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={limitsMutation.isPending}>
                {limitsMutation.isPending ? "Saving..." : "Save Limits"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Repay Dialog */}
      <Dialog open={!!repayTarget} onOpenChange={(v) => !v && setRepayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Repayment — {repayTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRepay} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Current balance: <span className="font-semibold text-foreground">{repayTarget ? formatINR(repayTarget.current_balance) : "—"}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="repayAmount">Amount (₹) *</Label>
              <Input
                id="repayAmount"
                type="number"
                min={0.01}
                step={0.01}
                value={repayForm.amount || ""}
                onChange={(e) => setRepayForm({ ...repayForm, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repayDesc">Note (e.g. bank transfer reference)</Label>
              <Textarea
                id="repayDesc"
                value={repayForm.description}
                onChange={(e) => setRepayForm({ ...repayForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRepayTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={repayMutation.isPending}>
                {repayMutation.isPending ? "Recording..." : "Record Repayment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Billing Cycles Dialog */}
      <BillingCyclesDialog account={cyclesTarget} onClose={() => setCyclesTarget(null)} />
    </div>
  )
}

function LedgerStatusBadge({ status }: { status: LedgerAccountStatus }) {
  const map: Record<LedgerAccountStatus, { label: string; bg: string; text: string }> = {
    ACTIVE: { label: "Active", bg: "#ECFDF5", text: "#10B981" },
    SUSPENDED: { label: "Suspended", bg: "#FEF2F2", text: "#EF4444" },
    CLOSED: { label: "Closed", bg: "#F3F4F6", text: "#6B7280" },
  }
  const badge = map[status]
  return (
    <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-0 font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>
      {badge.label}
    </Badge>
  )
}

function BillingCyclesDialog({ account, onClose }: { account: LedgerAccount | null; onClose: () => void }) {
  const { data, isLoading } = useLedgerCycles(account?.id ?? null, { page: 1, limit: 20 })
  const markPaid = useMarkLedgerCyclePaid()
  const cycles = data?.cycles ?? []

  const cycleBadge: Record<string, { label: string; bg: string; text: string }> = {
    DUE: { label: "Due", bg: "#FFF8E1", text: "#F59E0B" },
    OVERDUE: { label: "Overdue", bg: "#FEF2F2", text: "#EF4444" },
    PAID: { label: "Paid", bg: "#ECFDF5", text: "#10B981" },
  }

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Billing Cycles — {account?.company_name}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead className="text-right">Overage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  Loading...
                </TableCell>
              </TableRow>
            ) : cycles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  No billing cycles yet
                </TableCell>
              </TableRow>
            ) : (
              cycles.map((cycle) => {
                const badge = cycleBadge[cycle.status]
                return (
                  <TableRow key={cycle.id}>
                    <TableCell className="text-xs">
                      {new Date(cycle.period_start).toLocaleDateString()} – {new Date(cycle.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatINR(cycle.amount_due)}</TableCell>
                    <TableCell className="text-right text-xs text-amber-600">
                      {cycle.overage_amount > 0 ? formatINR(cycle.overage_amount) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-0 font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(cycle.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {cycle.status !== "PAID" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate({ cycleId: cycle.id, payload: { amountPaid: cycle.amount_due } })}
                        >
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {cycle.paid_at ? new Date(cycle.paid_at).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function FinancialPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <FinancialContent />
    </Suspense>
  )
}
