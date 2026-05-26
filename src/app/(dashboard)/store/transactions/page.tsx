"use client"

/**
 * Store Transactions — task 21.8
 * Consumes /api/v1/shop-finance/* with CSV export.
 */

import { useMemo, useState } from "react"
import { Download, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { useShopTransactions } from "@/hooks/useShopTransactions"
import type { ShopTransactionsListParams } from "@/services/shop-transactions.service"
import { formatCurrency } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { ShopTransaction } from "@/types"
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

export default function StoreTransactionsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const [searchInput, setSearchInput] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchInput, 300)

  const filters = useMemo<ShopTransactionsListParams>(() => {
    const params: ShopTransactionsListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (fromDate) params.from = `${fromDate}T00:00:00.000Z`
    if (toDate) params.to = `${toDate}T23:59:59.999Z`
    return params
  }, [page, debouncedSearch, fromDate, toDate])

  const { data, isLoading, isError, error, refetch, isFetching } = useShopTransactions(filters)

  const handleExportCsv = async () => {
    try {
      const response = await api.get("/shop-transactions/export", { params: { from: fromDate || undefined, to: toDate || undefined }, responseType: "blob" })
      downloadBlob(response.data, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success("CSV exported")
    } catch { toast.error("Failed to export CSV") }
  }

  if (mode !== "STORE_MODE") {
    return (<div className="space-y-6"><PageHeader title="Store Transactions" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Transactions" subtitle={data?.pagination ? `${data.pagination.total} entries` : undefined}>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button>
      </PageHeader>
      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search transactions..." aria-label="Search transactions" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
        <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        <span className="text-xs text-muted-foreground">–</span>
        <Input type="date" aria-label="To date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load"} onRetry={() => refetch()} /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No transactions found</Card> : (
        <div className="space-y-2">{data.items.map((tx: ShopTransaction) => (
          <Card key={tx.id} className="p-3 flex items-center justify-between">
            <div><p className="text-sm font-medium">{tx.description}</p><p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()} · {tx.type}</p></div>
            <div className="flex items-center gap-3"><span className={cn("font-semibold text-sm tabular-nums", tx.amount > 0 ? "text-green-600" : "text-red-600")}>{tx.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}</span><Badge variant="outline" className="text-xs">{tx.type}</Badge></div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}
    </div>
  )
}
