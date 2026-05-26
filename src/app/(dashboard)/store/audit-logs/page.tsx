"use client"

/**
 * Store Audit Logs — task 21.11
 * Consumes /api/v1/shop-audit-logs.
 * Visible only when active staff record holds audit_logs.view.
 */

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Search, Shield } from "lucide-react"

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
import { usePermissions } from "@/hooks/usePermissions"
import { shopAuditLogsService, type ShopAuditLogsListParams } from "@/services/shop-audit-logs.service"

const PAGE_SIZE = 20

export default function StoreAuditLogsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const { can } = usePermissions()
  const [searchInput, setSearchInput] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchInput, 300)

  const hasPermission = can("audit_logs.view")
  const isSingleShop = mode === "STORE_MODE"

  const filters = useMemo<ShopAuditLogsListParams>(() => {
    const params: ShopAuditLogsListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (actionFilter !== "all") params.action = actionFilter
    if (fromDate) params.from = `${fromDate}T00:00:00.000Z`
    if (toDate) params.to = `${toDate}T23:59:59.999Z`
    return params
  }, [page, debouncedSearch, actionFilter, fromDate, toDate])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["shop-audit-logs", activeShopId, filters],
    queryFn: () => shopAuditLogsService.list(filters),
    enabled: isSingleShop && !!activeShopId && hasPermission,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  if (!hasPermission) {
    return (<div className="space-y-6"><PageHeader title="Audit Logs" subtitle="Access restricted" /><Card className="p-8 text-center"><Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">You don&apos;t have permission to view audit logs.</p></Card></div>)
  }

  if (!isSingleShop) { return (<div className="space-y-6"><PageHeader title="Audit Logs" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>) }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle={data?.pagination ? `${data.pagination.total} entries` : undefined} />
      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search logs..." aria-label="Search audit logs" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}><SelectTrigger className="h-9 w-[150px]" aria-label="Filter by action"><SelectValue placeholder="All Actions" /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem><SelectItem value="CREATE">Create</SelectItem><SelectItem value="UPDATE">Update</SelectItem><SelectItem value="DELETE">Delete</SelectItem><SelectItem value="LOGIN">Login</SelectItem></SelectContent></Select>
        <Input type="date" aria-label="From" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" /><span className="text-xs text-muted-foreground">–</span><Input type="date" aria-label="To" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-9 w-[140px] text-xs" />
        {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed"} onRetry={() => refetch()} /> : isLoading ? (<div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No audit logs found</Card> : (
        <div className="space-y-2">{data.items.map((log) => (
          <Card key={log.id} className="p-3 flex items-center justify-between">
            <div><p className="text-sm font-medium">{log.action} — {log.entity_type}</p><p className="text-xs text-muted-foreground">{log.user_name} · {new Date(log.created_at).toLocaleString()}</p></div>
            <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{log.action}</Badge>{log.ip_address && <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>}</div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}
    </div>
  )
}
