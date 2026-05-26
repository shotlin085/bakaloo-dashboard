"use client"

/**
 * Store Reports — task 21.10
 * Consumes /api/v1/shop-reports/* with CSV export.
 */

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, FileBarChart, Loader2, Search } from "lucide-react"
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
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { shopReportsService, type ShopReportsListParams } from "@/services/shop-reports.service"

const PAGE_SIZE = 20
const REPORT_TYPES = ["SALES", "INVENTORY", "ORDERS", "REVENUE", "PERFORMANCE"] as const

function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }

export default function StoreReportsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const [searchInput, setSearchInput] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchInput, 300)

  const filters = useMemo<ShopReportsListParams>(() => {
    const params: ShopReportsListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (typeFilter !== "all") params.type = typeFilter
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    return params
  }, [page, debouncedSearch, typeFilter, fromDate, toDate])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["shop-reports", activeShopId, filters],
    queryFn: () => shopReportsService.list(filters),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })

  const handleExportCsv = async () => { try { const blob = await shopReportsService.exportCsv(filters); downloadBlob(blob, `reports-${new Date().toISOString().slice(0, 10)}.csv`); toast.success("CSV exported") } catch { toast.error("Failed to export") } }

  if (mode !== "STORE_MODE") { return (<div className="space-y-6"><PageHeader title="Store Reports" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>) }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Reports" subtitle={data?.pagination ? `${data.pagination.total} reports` : undefined}><Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button></PageHeader>
      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search reports..." aria-label="Search reports" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}><SelectTrigger className="h-9 w-[150px]" aria-label="Report type"><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" aria-label="From" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" /><span className="text-xs text-muted-foreground">–</span><Input type="date" aria-label="To" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed"} onRetry={() => refetch()} /> : isLoading ? (<div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No reports found</Card> : (
        <div className="space-y-2">{data.items.map((r) => (<Card key={r.id} className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><FileBarChart className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium text-sm">{r.title}</p><p className="text-xs text-muted-foreground">{r.period_start} — {r.period_end}</p></div></div><Badge variant="outline" className="text-xs">{r.type}</Badge></Card>))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}
    </div>
  )
}
