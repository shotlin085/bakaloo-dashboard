"use client"

/**
 * Store Financials — task 21.8
 * Consumes /api/v1/shop-finance/* with CSV export.
 */

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { useShopFinancials } from "@/hooks/useShopFinancials"
import { formatCurrency } from "@/lib/i18n"
import type { ShopFinancialPeriodType } from "@/types/shop-financial.types"
import api from "@/lib/api"

const PAGE_SIZE = 20

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

export default function StoreFinancialsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const [periodType, setPeriodType] = useState<ShopFinancialPeriodType>("DAILY")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useShopFinancials({
    shopId: activeShopId,
    period_type: periodType,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const handleExportCsv = async () => {
    try {
      const response = await api.get("/shop-financials/export", { params: { period_type: periodType, from: fromDate || undefined, to: toDate || undefined }, responseType: "blob" })
      downloadBlob(response.data, `financials-${periodType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success("CSV exported")
    } catch { toast.error("Failed to export CSV") }
  }

  if (mode !== "STORE_MODE") {
    return (<div className="space-y-6"><PageHeader title="Store Financials" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Financials" subtitle={data?.pagination ? `${data.pagination.total} periods` : undefined}>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button>
      </PageHeader>

      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <Select value={periodType} onValueChange={(v) => { setPeriodType(v as ShopFinancialPeriodType); setPage(1) }}><SelectTrigger className="h-9 w-[140px]" aria-label="Period type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAILY">Daily</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem></SelectContent></Select>
        <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        <span className="text-xs text-muted-foreground">–</span>
        <Input type="date" aria-label="To date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load"} onRetry={() => refetch()} /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No financial periods found</Card> : (
        <div className="space-y-3">{data.items.map((period) => (
          <Card key={period.id} className="p-4">
            <div className="flex items-center justify-between mb-2"><div><p className="font-medium text-sm">{period.period_start} — {period.period_end}</p><p className="text-xs text-muted-foreground">{period.total_orders} orders · Avg {formatCurrency(period.avg_order_value)}</p></div><Badge variant={period.payout_status === "PAID" ? "default" : "secondary"} className="text-xs">{period.payout_status}</Badge></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Gross Revenue</p><p className="font-semibold tabular-nums">{formatCurrency(period.gross_revenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Revenue</p><p className="font-semibold tabular-nums">{formatCurrency(period.net_revenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Commission</p><p className="font-semibold tabular-nums text-red-600">{formatCurrency(period.platform_commission)}</p></div>
              <div><p className="text-xs text-muted-foreground">Payout</p><p className="font-semibold tabular-nums text-green-600">{formatCurrency(period.payout_amount)}</p></div>
            </div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}
    </div>
  )
}
