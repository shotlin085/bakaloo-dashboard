"use client"

/**
 * Store Stock Movements — task 21.6
 * Consumes /api/v1/shops/:shopId/stock-movements with all filters.
 */

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Loader2, Search } from "lucide-react"
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
import { shopInventoryService, type StockMovementsListParams } from "@/services/shop-inventory.service"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const MOVEMENT_TYPES = ["ADJUSTMENT", "SALE", "RESTOCK", "RETURN", "DAMAGE", "TRANSFER"] as const

export default function StockMovementsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const [searchInput, setSearchInput] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchInput, 300)

  const filters = useMemo<StockMovementsListParams>(() => {
    const params: StockMovementsListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (typeFilter !== "all") params.type = typeFilter
    if (fromDate) params.from = `${fromDate}T00:00:00.000Z`
    if (toDate) params.to = `${toDate}T23:59:59.999Z`
    return params
  }, [page, debouncedSearch, typeFilter, fromDate, toDate])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["stock-movements", activeShopId, filters],
    queryFn: () => shopInventoryService.listMovements(activeShopId!, filters),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  if (mode !== "STORE_MODE") {
    return (<div className="space-y-6"><PageHeader title="Stock Movements" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" subtitle={data?.pagination ? `${data.pagination.total} movements` : undefined} />
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search..." aria-label="Search movements" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}><SelectTrigger className="h-9 w-[150px]" aria-label="Filter by type"><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{MOVEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="date" aria-label="To date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
          {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load movements"} onRetry={() => refetch()} /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No stock movements found</Card> : (
        <div className="space-y-2">{data.items.map((m) => (
          <Card key={m.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-full p-1.5", m.quantity_change > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30")}>{m.quantity_change > 0 ? <ArrowUp className="h-4 w-4 text-green-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />}</div>
              <div><p className="text-sm font-medium">{m.product_name}</p><p className="text-xs text-muted-foreground">{m.reason || m.type} · {new Date(m.created_at).toLocaleDateString()}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("font-semibold text-sm tabular-nums", m.quantity_change > 0 ? "text-green-600" : "text-red-600")}>{m.quantity_change > 0 ? "+" : ""}{m.quantity_change}</span>
              <Badge variant="outline" className="text-xs">{m.type}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">{m.quantity_before} → {m.quantity_after}</span>
            </div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      )}
    </div>
  )
}
