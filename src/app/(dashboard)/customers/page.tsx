"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
// Popover removed — advanced filters use inline panel instead
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldBan,
  ShieldCheck,
  UserCheck,
  UserX,
  TrendingUp,
  Crown,
  AlertTriangle,
  Filter,
  X,
  Copy,
  Check,
} from "lucide-react"
import {
  useCustomers,
  useExportCustomers,
  useToggleBlockCustomer,
} from "@/hooks/useCustomers"
import { CustomerProfileDrawer } from "@/components/customers/CustomerProfileDrawer"
import type { CustomerFilters } from "@/types"
import { formatINR, formatDate, formatRelativeTime } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"

export default function CustomersPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"active" | "blocked" | "">("")
  const [sort, setSort] = useState("created_at")
  const [segment, setSegment] = useState<"" | "vip" | "churned">("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [joinedFrom, setJoinedFrom] = useState("")
  const [joinedTo, setJoinedTo] = useState("")
  const [minOrders, setMinOrders] = useState("")
  const [maxOrders, setMaxOrders] = useState("")
  const [minSpent, setMinSpent] = useState("")
  const [maxSpent, setMaxSpent] = useState("")

  const debouncedSearch = useDebounce(search, 400)

  const filters: CustomerFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: status || undefined,
      sort: sort || undefined,
      order: "desc" as const,
    }),
    [page, limit, debouncedSearch, status, sort]
  )

  const { data, isLoading } = useCustomers(filters)
  const exportCustomers = useExportCustomers()
  const toggleBlock = useToggleBlockCustomer()
  const { can } = usePermissions()
  const canManage = can("customers.manage")

  const customers = useMemo(() => data?.customers ?? [], [data?.customers])
  const pagination = data?.pagination

  // Compute summary stats from loaded data
  const stats = useMemo(() => {
    const total = pagination?.total ?? customers.length
    const active = customers.filter((c) => !c.is_blocked).length
    const blocked = customers.filter((c) => c.is_blocked).length
    const totalSpent = customers.reduce((s, c) => s + (c.total_spent ?? 0), 0)
    return { total, active, blocked, totalSpent }
  }, [customers, pagination])

  const clearFilters = useCallback(() => {
    setSearch("")
    setStatus("")
    setSegment("")
    setSort("created_at")
    setJoinedFrom("")
    setJoinedTo("")
    setMinOrders("")
    setMaxOrders("")
    setMinSpent("")
    setMaxSpent("")
    setPage(1)
  }, [])

  // Segment helpers
  const getSegment = useCallback((c: { order_count: number; total_spent: number; last_order_at: string | null }) => {
    if (c.order_count >= 10 || c.total_spent >= 10000) return "vip"
    if (c.last_order_at) {
      const daysSince = Math.floor((Date.now() - new Date(c.last_order_at).getTime()) / 86400000)
      if (daysSince > 60 && c.order_count >= 2) return "churned"
    }
    return null
  }, [])

  const filteredCustomers = useMemo(() => {
    let result = customers
    if (segment) result = result.filter((c) => getSegment(c) === segment)
    if (joinedFrom) result = result.filter((c) => c.created_at >= joinedFrom)
    if (joinedTo) result = result.filter((c) => c.created_at <= joinedTo + "T23:59:59")
    if (minOrders) result = result.filter((c) => c.order_count >= Number(minOrders))
    if (maxOrders) result = result.filter((c) => c.order_count <= Number(maxOrders))
    if (minSpent) result = result.filter((c) => c.total_spent >= Number(minSpent))
    if (maxSpent) result = result.filter((c) => c.total_spent <= Number(maxSpent))
    return result
  }, [customers, segment, getSegment, joinedFrom, joinedTo, minOrders, maxOrders, minSpent, maxSpent])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Customers" subtitle="View and manage customer accounts" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCustomers.mutate()}
          disabled={exportCustomers.isPending}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{stats.active.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Blocked</p>
              <p className="text-xl font-bold">{stats.blocked.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">{formatINR(stats.totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search customers"
              placeholder="Search name, phone, email..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <Select
            value={status || "all_status"}
            onValueChange={(v) => {
              setStatus(v === "all_status" ? "" : (v as "active" | "blocked"))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_status">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={segment || "all_segment"}
            onValueChange={(v) => {
              setSegment(v === "all_segment" ? "" : (v as "vip" | "churned"))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Segments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_segment">All Segments</SelectItem>
              <SelectItem value="vip">
                <span className="flex items-center gap-1.5"><Crown className="h-3 w-3 text-amber-500" /> VIP</span>
              </SelectItem>
              <SelectItem value="churned">
                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-red-500" /> Churned</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="orders">Most Orders</SelectItem>
              <SelectItem value="spent">Highest Spent</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Advanced
          </Button>

          {(joinedFrom || joinedTo || minOrders || maxOrders || minSpent || maxSpent) && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Joined:</span>
              <Input
                type="date"
                value={joinedFrom}
                onChange={(e) => { setJoinedFrom(e.target.value); setPage(1) }}
                className="h-8 w-[130px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={joinedTo}
                onChange={(e) => { setJoinedTo(e.target.value); setPage(1) }}
                className="h-8 w-[130px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Orders:</span>
              <Input
                type="number"
                placeholder="Min"
                value={minOrders}
                onChange={(e) => { setMinOrders(e.target.value); setPage(1) }}
                className="h-8 w-[70px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxOrders}
                onChange={(e) => { setMaxOrders(e.target.value); setPage(1) }}
                className="h-8 w-[70px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Spent ₹:</span>
              <Input
                type="number"
                placeholder="Min"
                value={minSpent}
                onChange={(e) => { setMinSpent(e.target.value); setPage(1) }}
                className="h-8 w-[80px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxSpent}
                onChange={(e) => { setMaxSpent(e.target.value); setPage(1) }}
                className="h-8 w-[80px] text-xs"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      {isLoading ? (
        <CustomersSkeleton />
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No customers found</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">User ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => {
                const seg = getSegment(c)
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell>
                      <CopyableId id={c.id} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{c.name ?? "—"}</p>
                          {seg === "vip" && (
                            <Badge className="text-[9px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                              <Crown className="h-2.5 w-2.5 mr-0.5" /> VIP
                            </Badge>
                          )}
                          {seg === "churned" && (
                            <Badge variant="outline" className="text-[9px] h-4 text-red-600 border-red-200">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Churned
                            </Badge>
                          )}
                        </div>
                        {c.email && (
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {c.phone}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {c.order_count}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatINR(c.total_spent)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatINR(c.wallet_balance)}
                    </TableCell>
                    <TableCell>
                      {c.is_blocked ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocked
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-50 text-green-600 border-0 hover:bg-green-100">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                        {c.last_order_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Last: {formatRelativeTime(c.last_order_at)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBlock.mutate({
                            id: c.id,
                            blocked: !c.is_blocked,
                          })
                        }}
                        disabled={toggleBlock.isPending}
                      >
                        {c.is_blocked ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <ShieldBan className="h-3.5 w-3.5 mr-1" />
                            Block
                          </>
                        )}
                      </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} customers
            </p>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v))
                setPage(1)
              }}
            >
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
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
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
                    variant={page === pageNum ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Profile Drawer */}
      <CustomerProfileDrawer
        customerId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

function CustomersSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">User ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Total Spent</TableHead>
            <TableHead className="text-right">Wallet</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-7 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

/** Compact User ID with copy-to-clipboard */
function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const shortId = id.slice(0, 8)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopied(true)
    toast.success("User ID copied")
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-1 group" title={id}>
      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        {shortId}…
      </code>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
        title="Copy full ID"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
