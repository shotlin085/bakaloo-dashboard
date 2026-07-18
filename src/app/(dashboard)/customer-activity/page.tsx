"use client"

import { useState } from "react"
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  RefreshCcw,
  Wallet,
  Bell,
  Star,
  Eye,
  ShoppingBag,
  MapPin,
  MapPinOff,
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
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import {
  useResolveCustomerActivityUser,
  useCustomerActivityTimeline,
} from "@/hooks/useCustomerActivity"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDateTime, formatRelativeTime, formatINR } from "@/lib/utils"
import type {
  CustomerActivityEvent,
  CustomerActivityEventType,
} from "@/types/customer-activity.types"

const EVENT_TYPES: { value: CustomerActivityEventType | "all"; label: string }[] = [
  { value: "all", label: "All Activity" },
  { value: "ORDER_PLACED", label: "Orders Placed" },
  { value: "ORDER_STATUS", label: "Order Status Changes" },
  { value: "WALLET", label: "Wallet" },
  { value: "NOTIFICATION", label: "Notifications" },
  { value: "REVIEW", label: "Reviews" },
  { value: "PRODUCT_VIEW", label: "Product Views" },
  { value: "CART_EVENT", label: "Cart Activity" },
  { value: "ADDRESS_ADDED", label: "Addresses Added" },
  { value: "ADDRESS_REMOVED", label: "Addresses Removed" },
]

const EVENT_ICONS: Record<CustomerActivityEventType, React.ReactNode> = {
  ORDER_PLACED: <ShoppingCart className="h-3.5 w-3.5" />,
  ORDER_STATUS: <RefreshCcw className="h-3.5 w-3.5" />,
  WALLET: <Wallet className="h-3.5 w-3.5" />,
  NOTIFICATION: <Bell className="h-3.5 w-3.5" />,
  REVIEW: <Star className="h-3.5 w-3.5" />,
  PRODUCT_VIEW: <Eye className="h-3.5 w-3.5" />,
  CART_EVENT: <ShoppingBag className="h-3.5 w-3.5" />,
  ADDRESS_ADDED: <MapPin className="h-3.5 w-3.5" />,
  ADDRESS_REMOVED: <MapPinOff className="h-3.5 w-3.5" />,
}

const EVENT_COLORS: Record<CustomerActivityEventType, string> = {
  ORDER_PLACED: "bg-blue-50 text-blue-600 border-blue-200",
  ORDER_STATUS: "bg-indigo-50 text-indigo-600 border-indigo-200",
  WALLET: "bg-green-50 text-green-600 border-green-200",
  NOTIFICATION: "bg-amber-50 text-amber-600 border-amber-200",
  REVIEW: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PRODUCT_VIEW: "bg-purple-50 text-purple-600 border-purple-200",
  CART_EVENT: "bg-orange-50 text-orange-600 border-orange-200",
  ADDRESS_ADDED: "bg-teal-50 text-teal-600 border-teal-200",
  ADDRESS_REMOVED: "bg-red-50 text-red-600 border-red-200",
}

const EVENT_LABELS: Record<CustomerActivityEventType, string> = {
  ORDER_PLACED: "Order Placed",
  ORDER_STATUS: "Order Status",
  WALLET: "Wallet",
  NOTIFICATION: "Notification",
  REVIEW: "Review",
  PRODUCT_VIEW: "Product View",
  CART_EVENT: "Cart Activity",
  ADDRESS_ADDED: "Address Added",
  ADDRESS_REMOVED: "Address Removed",
}

export default function CustomerActivityPage() {
  const [search, setSearch] = useState("")
  const [eventType, setEventType] = useState<CustomerActivityEventType | "all">("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)
  const { data: user, isFetching: userLookupPending } =
    useResolveCustomerActivityUser(debouncedSearch)

  const { data, isLoading } = useCustomerActivityTimeline(user?.id ?? null, {
    page,
    limit: 20,
    ...(eventType !== "all" && { eventType }),
    ...(dateRange.from && { from: dateRange.from.toISOString() }),
    ...(dateRange.to && { to: dateRange.to.toISOString() }),
  })

  const events = data?.events ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Activity"
        subtitle="Look up a customer's full activity history — orders, wallet, cart, and more — to see what happened and why"
      />

      {/* Search */}
      <Card className="p-4 space-y-2">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="User ID or phone number"
            placeholder="Enter User ID or phone number..."
            className="pl-9 font-mono text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <UserLookupCaption query={debouncedSearch} user={user} isFetching={userLookupPending} />
      </Card>

      {!user ? (
        <Card className="p-12 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Search for a customer above to see their activity timeline
          </p>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={eventType}
                onValueChange={(v) => {
                  setEventType(v as CustomerActivityEventType | "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[190px] h-9">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DateRangePicker
                value={dateRange}
                onChange={(r) => {
                  setDateRange(r)
                  setPage(1)
                }}
              />

              <span className="text-xs text-muted-foreground ml-auto">
                {pagination?.total ?? 0} events
              </span>
            </div>
          </Card>

          {/* Timeline */}
          {isLoading ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[160px]">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : events.length === 0 ? (
            <Card className="p-12 text-center">
              <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No activity found for this customer{eventType !== "all" || dateRange.from
                  ? " with the current filters"
                  : ""}
              </p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[160px]">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event, i) => (
                    <TableRow key={`${event.eventType}-${event.eventAt}-${i}`}>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${EVENT_COLORS[event.eventType]}`}>
                          {EVENT_ICONS[event.eventType]}
                          <span className="ml-1">{EVENT_LABELS[event.eventType]}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <EventSummary event={event} />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="text-muted-foreground">{formatRelativeTime(event.eventAt)}</p>
                          <p className="text-muted-foreground/60">{formatDateTime(event.eventAt)}</p>
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
                Page {page} of {totalPages} ({pagination?.total ?? 0} events)
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
        </>
      )}
    </div>
  )
}

/**
 * Confirmation caption under the search input — resolves whatever's typed
 * to a real customer (name + phone) plus their last_active_at. That field
 * is a single rolling "last seen" timestamp, NOT a login history — no
 * individual login/app-open events are recorded anywhere in this system,
 * so this is shown as one honest fact rather than faking a login timeline.
 */
function UserLookupCaption({
  query,
  user,
  isFetching,
}: {
  query: string
  user: { name: string | null; phone: string; last_active_at: string | null } | null | undefined
  isFetching: boolean
}) {
  if (query.trim().length < 3) return null

  if (isFetching) {
    return <p className="text-xs text-muted-foreground">Looking up user...</p>
  }

  if (user) {
    return (
      <p className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {user.name || "Unnamed customer"} · {user.phone} · Last seen{" "}
        {user.last_active_at ? formatRelativeTime(user.last_active_at) : "never"}
      </p>
    )
  }

  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <AlertCircle className="h-3.5 w-3.5" />
      No user found for this ID or phone number
    </p>
  )
}

/** Type-specific one-line summary rendered from an event's `meta`. */
function EventSummary({ event }: { event: CustomerActivityEvent }) {
  const m = event.meta as Record<string, string | number | boolean | null | undefined>

  switch (event.eventType) {
    case "ORDER_PLACED":
      return (
        <span>
          Order <code className="text-xs bg-muted px-1 py-0.5 rounded">{m.orderNumber}</code> placed —{" "}
          {formatINR(Number(m.totalAmount) || 0)} ({m.paymentMethod})
        </span>
      )
    case "ORDER_STATUS":
      return (
        <span>
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{m.orderNumber}</code>:{" "}
          {m.fromStatus ? `${m.fromStatus} → ` : ""}
          <strong>{String(m.toStatus)}</strong>
          {m.note ? ` — ${m.note}` : ""}
          {m.changedByName ? (
            <span className="text-muted-foreground"> (by {m.changedByName})</span>
          ) : null}
        </span>
      )
    case "WALLET":
      return (
        <span>
          <span className={m.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
            {m.type === "CREDIT" ? "+" : "-"}
            {formatINR(Number(m.amount) || 0)}
          </span>
          {m.description ? ` — ${m.description}` : ""}
        </span>
      )
    case "NOTIFICATION":
      return (
        <span>
          {m.title}
          <span className="text-muted-foreground"> ({m.isRead ? "read" : "unread"})</span>
        </span>
      )
    case "REVIEW":
      return (
        <span>
          Reviewed <strong>{m.productName}</strong> — {m.rating}★
          {m.comment ? `: ${m.comment}` : ""}
        </span>
      )
    case "PRODUCT_VIEW":
      return (
        <span>
          Viewed <strong>{m.productName}</strong>
          {m.source ? <span className="text-muted-foreground"> via {m.source}</span> : null}
        </span>
      )
    case "CART_EVENT":
      return (
        <span>
          Cart {String(m.eventType).toLowerCase().replace(/_/g, " ")} — worth{" "}
          {formatINR(Number(m.cartValue) || 0)}
          <span className="text-muted-foreground"> ({m.actorType})</span>
        </span>
      )
    case "ADDRESS_ADDED":
      return (
        <span>
          Added address &quot;{m.label}&quot; — {m.city}
        </span>
      )
    case "ADDRESS_REMOVED":
      return (
        <span>
          Removed address &quot;{m.label}&quot; — {m.city}
        </span>
      )
    default:
      return <span className="text-muted-foreground">—</span>
  }
}
