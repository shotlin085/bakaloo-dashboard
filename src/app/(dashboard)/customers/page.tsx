"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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

const DEFAULT_LIMIT = 20
const VALID_LIMITS = [20, 50, 100]

export default function CustomersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Every filter (plus the open customer's id and pagination) is seeded
  // from the URL so a bookmarked/shared link, a page refresh, or the
  // browser back button all land back on the exact same filtered view and
  // re-open the same customer's profile — matches the routing added to the
  // /products list.
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")
  const [status, setStatus] = useState<"active" | "blocked" | "">(() => {
    const v = searchParams.get("status")
    return v === "active" || v === "blocked" ? v : ""
  })
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "created_at")
  const [segment, setSegment] = useState<"" | "vip" | "churned">(() => {
    const v = searchParams.get("segment")
    return v === "vip" || v === "churned" ? v : ""
  })
  const [page, setPageState] = useState(() => {
    const fromUrl = Number(searchParams.get("page"))
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : 1
  })
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get("limit"))
    return VALID_LIMITS.includes(fromUrl) ? fromUrl : DEFAULT_LIMIT
  })
  const [selectedId, setSelectedIdState] = useState<string | null>(
    () => searchParams.get("customer"),
  )
  const [joinedFrom, setJoinedFrom] = useState(() => searchParams.get("joinedFrom") ?? "")
  const [joinedTo, setJoinedTo] = useState(() => searchParams.get("joinedTo") ?? "")
  const [minOrders, setMinOrders] = useState(() => searchParams.get("minOrders") ?? "")
  const [maxOrders, setMaxOrders] = useState(() => searchParams.get("maxOrders") ?? "")
  const [minSpent, setMinSpent] = useState(() => searchParams.get("minSpent") ?? "")
  const [maxSpent, setMaxSpent] = useState(() => searchParams.get("maxSpent") ?? "")
  const [showAdvanced, setShowAdvanced] = useState(
    () => !!(joinedFrom || joinedTo || minOrders || maxOrders || minSpent || maxSpent),
  )

  // Merges the given filter values into the URL query string in a single
  // `router.replace` (shallow, no scroll/refetch of the rest of the app).
  // A single call per action avoids two handlers racing each other over
  // the same tick — `useSearchParams()` doesn't reflect a `replace` until
  // the next render, so chaining separate single-param updates would have
  // the second call silently drop the first's change.
  const updateQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
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

  const openCustomer = useCallback(
    (id: string) => {
      setSelectedIdState(id)
      updateQuery({ customer: id })
    },
    [updateQuery],
  )

  const closeCustomer = useCallback(() => {
    setSelectedIdState(null)
    updateQuery({ customer: undefined })
  }, [updateQuery])

  const handleStatusChange = useCallback(
    (v: string) => {
      const next = v === "all_status" ? "" : (v as "active" | "blocked")
      setStatus(next)
      setPageState(1)
      updateQuery({ status: next, page: undefined })
    },
    [updateQuery],
  )

  const handleSegmentChange = useCallback(
    (v: string) => {
      const next = v === "all_segment" ? "" : (v as "vip" | "churned")
      setSegment(next)
      setPageState(1)
      updateQuery({ segment: next, page: undefined })
    },
    [updateQuery],
  )

  const handleSortChange = useCallback(
    (v: string) => {
      setSort(v)
      setPageState(1)
      updateQuery({ sort: v === "created_at" ? undefined : v, page: undefined })
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

  const handleAdvancedChange = useCallback(
    (key: string, value: string, setter: (v: string) => void) => {
      setter(value)
      setPageState(1)
      updateQuery({ [key]: value, page: undefined })
    },
    [updateQuery],
  )

  // Search is debounced before it drives the query — the URL follows that
  // same debounced value rather than updating on every keystroke. The
  // `isFirstRun` guard stops this from firing on mount, which would
  // otherwise strip `page`/other filters already present in a deep-linked
  // URL.
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
    setPageState(1)
    updateQuery({
      search: undefined,
      status: undefined,
      segment: undefined,
      sort: undefined,
      joinedFrom: undefined,
      joinedTo: undefined,
      minOrders: undefined,
      maxOrders: undefined,
      minSpent: undefined,
      maxSpent: undefined,
      page: undefined,
    })
  }, [updateQuery])

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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={status || "all_status"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_status">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segment || "all_segment"} onValueChange={handleSegmentChange}>
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

          <Select value={sort} onValueChange={handleSortChange}>
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
                onChange={(e) => handleAdvancedChange("joinedFrom", e.target.value, setJoinedFrom)}
                className="h-8 w-[130px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={joinedTo}
                onChange={(e) => handleAdvancedChange("joinedTo", e.target.value, setJoinedTo)}
                className="h-8 w-[130px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Orders:</span>
              <Input
                type="number"
                placeholder="Min"
                value={minOrders}
                onChange={(e) => handleAdvancedChange("minOrders", e.target.value, setMinOrders)}
                className="h-8 w-[70px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxOrders}
                onChange={(e) => handleAdvancedChange("maxOrders", e.target.value, setMaxOrders)}
                className="h-8 w-[70px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Spent ₹:</span>
              <Input
                type="number"
                placeholder="Min"
                value={minSpent}
                onChange={(e) => handleAdvancedChange("minSpent", e.target.value, setMinSpent)}
                className="h-8 w-[80px] text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxSpent}
                onChange={(e) => handleAdvancedChange("maxSpent", e.target.value, setMaxSpent)}
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
                    onClick={() => openCustomer(c.id)}
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
        onClose={closeCustomer}
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
