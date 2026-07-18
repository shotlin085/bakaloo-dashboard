"use client"

import { useState } from "react"
import {
  Activity,
  Search,
  Filter,
  User,
  Package,
  ShoppingCart,
  Truck,
  Image as ImageIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/PageHeader"
import { useActivityLogs } from "@/hooks/useActivityLogs"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import type { ActivityLogFilters } from "@/types/activity-log.types"

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "order", label: "Orders" },
  { value: "product", label: "Products" },
  { value: "shop_product", label: "Shop Listings" },
  { value: "user", label: "Users" },
  { value: "rider", label: "Riders" },
  { value: "banner", label: "Banners" },
  { value: "coupon", label: "Coupons" },
  { value: "settings", label: "Settings" },
]

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  order: <ShoppingCart className="h-3.5 w-3.5" />,
  product: <Package className="h-3.5 w-3.5" />,
  shop_product: <Package className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  rider: <Truck className="h-3.5 w-3.5" />,
  banner: <ImageIcon className="h-3.5 w-3.5" />,
  settings: <Settings className="h-3.5 w-3.5" />,
}

const ENTITY_COLORS: Record<string, string> = {
  order: "bg-blue-50 text-blue-600 border-blue-200",
  product: "bg-green-50 text-green-600 border-green-200",
  shop_product: "bg-teal-50 text-teal-600 border-teal-200",
  user: "bg-purple-50 text-purple-600 border-purple-200",
  rider: "bg-orange-50 text-orange-600 border-orange-200",
  banner: "bg-pink-50 text-pink-600 border-pink-200",
  coupon: "bg-amber-50 text-amber-600 border-amber-200",
  settings: "bg-muted text-muted-foreground border-border",
}

export default function ActivityLogPage() {
  const [actionSearch, setActionSearch] = useState("")
  const [entityType, setEntityType] = useState("all")
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(actionSearch, 400)

  const filters: ActivityLogFilters = {
    page,
    limit: 30,
    ...(debouncedSearch && { action: debouncedSearch }),
    ...(entityType !== "all" && { entityType }),
  }

  const { data, isLoading } = useActivityLogs(filters)
  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        subtitle="Track all admin actions and changes"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search activity logs"
              placeholder="Search actions..."
              className="pl-9 h-9"
              value={actionSearch}
              onChange={(e) => {
                setActionSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <Select
            value={entityType}
            onValueChange={(v) => {
              setEntityType(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto">
            {total} total actions
          </span>
        </div>
      </Card>

      {/* Log Table */}
      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="w-[160px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No activity logs found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="w-[160px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-medium text-xs">
                        {(log.admin_name || "A")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[100px]">
                        {log.admin_name || "System"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        ENTITY_COLORS[log.entity_type] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ENTITY_ICONS[log.entity_type] ?? (
                        <Activity className="h-3 w-3" />
                      )}
                      <span className="ml-1 capitalize">{log.entity_type}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChangeCell
                      oldValue={log.old_value}
                      newValue={log.new_value}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="text-muted-foreground">
                        {formatRelativeTime(log.created_at)}
                      </p>
                      <p className="text-muted-foreground/60">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChangeCell({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | string | null
  newValue: Record<string, unknown> | string | null
}) {
  if (!oldValue && !newValue) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const formatValue = (v: Record<string, unknown> | string | null) => {
    if (!v) return "—"
    if (typeof v === "string") return v
    try {
      // Show key→value pairs for objects
      const entries = Object.entries(v).slice(0, 3)
      return entries.map(([k, val]) => `${k}: ${val}`).join(", ")
    } catch {
      return JSON.stringify(v).slice(0, 60)
    }
  }

  return (
    <div className="text-xs max-w-[250px] truncate">
      {oldValue && (
        <span className="text-red-500 line-through mr-2">
          {formatValue(oldValue)}
        </span>
      )}
      {newValue && (
        <span className="text-green-600">{formatValue(newValue)}</span>
      )}
    </div>
  )
}
