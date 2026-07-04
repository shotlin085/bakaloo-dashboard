"use client"

/**
 * HQ Finance page (task 20.4) — transactions, financials, mark-paid, payout CSV.
 *
 * Consumes `/api/v1/admin/finance/*` endpoints. Tabbed view with
 * Transactions and Financials tabs. Supports mark-paid action and CSV export.
 */

import { useMemo, useState } from "react"
import {
  Download,
  CheckCircle,
  Loader2,
  PlayCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { ErrorBlock } from "@/components/shared/error-block"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionGate } from "@/components/shared/PermissionGate"

import {
  useHQTransactions,
  useHQFinancials,
  useMarkPaid,
  useRunSettlementNow,
} from "@/hooks/useHQ"
import { useActiveShopsForSwitcher } from "@/hooks/useShops"
import { hqService } from "@/services/hq.service"
import type { HQTransaction, HQFinancial, HQFinanceFilters } from "@/services/hq.service"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function HQFinancePage() {
  const [tab, setTab] = useState("transactions")

  return (
    <div className="space-y-4">
      <PageHeader
        title="HQ — Finance"
        subtitle="Transactions, financials, and payouts"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="financials">Financials & Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="financials" className="mt-4">
          <FinancialsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions Tab
// ─────────────────────────────────────────────────────────────────────────────

function TransactionsTab() {
  const [shopId, setShopId] = useState("")
  const [page, setPage] = useState(1)

  const { data: shopsData } = useActiveShopsForSwitcher()
  const shops = shopsData?.items ?? []

  const filters: HQFinanceFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(shopId && { shop_id: shopId }),
    }),
    [page, shopId],
  )

  const { data, isLoading, isError, error, refetch } = useHQTransactions(filters)
  const rows = data?.items ?? []
  const pagination = data?.pagination

  const columns: DataListColumn<HQTransaction>[] = [
    {
      id: "shop",
      header: "Shop",
      cell: (row) => <span className="text-sm">{row.shop_name}</span>,
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-[11px]">
          {row.type}
        </Badge>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => (
        <span className={cn("text-sm font-medium tabular-nums", row.amount >= 0 ? "text-emerald-600" : "text-red-600")}>
          {row.amount >= 0 ? "+" : ""}₹{Math.abs(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      id: "description",
      header: "Description",
      cell: (row) => <span className="text-sm text-muted-foreground truncate max-w-[200px]">{row.description}</span>,
    },
    {
      id: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={shopId} onValueChange={(v) => { setShopId(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by shop">
            <SelectValue placeholder="All Shops" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Shops</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorBlock message={(error as Error)?.message ?? ""} onRetry={() => void refetch()} />
      ) : isLoading && rows.length === 0 ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <DataList<HQTransaction>
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No transactions yet — entries post once an order is delivered and settlement runs (nightly, or via 'Run Settlement Now' on the Financials tab)"
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Financials Tab
// ─────────────────────────────────────────────────────────────────────────────

function FinancialsTab() {
  const [shopId, setShopId] = useState("")
  const [payoutStatus, setPayoutStatus] = useState("")
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const { data: shopsData } = useActiveShopsForSwitcher()
  const shops = shopsData?.items ?? []
  const markPaid = useMarkPaid()
  const runSettlement = useRunSettlementNow()

  const filters: HQFinanceFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(shopId && { shop_id: shopId }),
      ...(payoutStatus && { payout_status: payoutStatus }),
    }),
    [page, shopId, payoutStatus],
  )

  const { data, isLoading, isError, error, refetch } = useHQFinancials(filters)
  const rows = data?.items ?? []
  const pagination = data?.pagination

  function handleRunSettlement() {
    runSettlement.mutate({ shopId: shopId || undefined })
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const blob = await hqService.exportPayoutReport({ shop_id: shopId || undefined })
      downloadBlob(blob, `payout-report-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success("Payout report downloaded")
    } catch {
      toast.error("Failed to export report")
    } finally {
      setExporting(false)
    }
  }

  const columns: DataListColumn<HQFinancial>[] = [
    {
      id: "shop",
      header: "Shop",
      cell: (row) => <span className="text-sm">{row.shop_name}</span>,
    },
    {
      id: "period",
      header: "Period",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{row.period_type}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(row.period_start).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            {" – "}
            {new Date(row.period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </span>
        </div>
      ),
    },
    {
      id: "revenue",
      header: "Revenue",
      cell: (row) => <span className="text-sm tabular-nums">₹{Number(row.total_revenue).toLocaleString()}</span>,
    },
    {
      id: "commission",
      header: "Commission",
      cell: (row) => <span className="text-sm tabular-nums">₹{Number(row.commission_amount).toLocaleString()}</span>,
    },
    {
      id: "payout",
      header: "Payout",
      cell: (row) => <span className="text-sm font-medium tabular-nums">₹{Number(row.payout_amount).toLocaleString()}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="secondary" className={cn("text-[11px]", PAYOUT_STATUS_COLORS[row.payout_status] ?? "bg-muted")}>
          {row.payout_status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        row.payout_status !== "PAID" ? (
          <PermissionGate require="finance.manage">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={markPaid.isPending}
              onClick={() => markPaid.mutate(row.id)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Mark Paid
            </Button>
          </PermissionGate>
        ) : (
          <span className="text-xs text-muted-foreground">Paid</span>
        )
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={shopId} onValueChange={(v) => { setShopId(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by shop">
            <SelectValue placeholder="All Shops" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Shops</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payoutStatus} onValueChange={(v) => { setPayoutStatus(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by payout status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <PermissionGate require="finance.manage">
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={handleRunSettlement}
            disabled={runSettlement.isPending}
            title={shopId ? "Settle today for the selected shop" : "Settle today for every active shop"}
          >
            {runSettlement.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Run Settlement Now
          </Button>
        </PermissionGate>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
          Export CSV
        </Button>
      </div>

      {isError ? (
        <ErrorBlock message={(error as Error)?.message ?? ""} onRetry={() => void refetch()} />
      ) : isLoading && rows.length === 0 ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <DataList<HQFinancial>
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No financial records yet — a shop's first row appears the day after its first delivered order settles (nightly, or run it now above)"
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
