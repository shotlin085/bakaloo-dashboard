"use client"

import { Suspense, useState } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Bike,
  Star,
  Phone,
  LayoutGrid,
  List,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RiderDetailDrawer } from "@/components/riders/RiderDetailDrawer"
import { useRiders } from "@/hooks/useRiders"
import { useDebounce } from "@/hooks/useDebounce"
import { useRiderLocations, useConnectionStatus } from "@/hooks/useSocket"

type StatusTab = "all" | "online" | "offline" | "on_delivery" | "pending" | "suspended"
type ViewMode = "grid" | "table"

function RidersContent() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<StatusTab>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [page, setPage] = useState(1)
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useRiders({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: tab === "all" ? undefined : tab === "on_delivery" ? "online" : tab,
    sortBy: "created_at",
    sortOrder: "DESC",
  })

  const allRiders = data?.riders ?? []
  const liveLocations = useRiderLocations()
  const connStatus = useConnectionStatus()
  // Client-side filter for on_delivery tab (needs live socket data)
  const riders = tab === "on_delivery"
    ? allRiders.filter((r) => r.is_online && liveLocations.some((l) => l.riderId === r.id))
    : allRiders
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-6">
      <PageHeader title="Riders" subtitle="Manage delivery riders">
        {connStatus === "connected" && liveLocations.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            {liveLocations.length} live
          </div>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search riders"
              placeholder="Search by name or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as StatusTab); setPage(1) }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">Online</TabsTrigger>
              <TabsTrigger value="on_delivery">On Delivery</TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-l-none"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card Grid View */}
      {viewMode === "grid" ? (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-muted animate-pulse rounded mt-2" />
              </Card>
            ))}
          </div>
        ) : riders.length === 0 ? (
          <Card className="p-12 text-center">
            <Bike className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No riders found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {riders.map((rider) => {
              const live = liveLocations.find((l) => l.riderId === rider.id)
              return (
                <Card
                  key={rider.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRiderId(rider.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={rider.avatar_url ?? undefined} />
                        <AvatarFallback className="text-sm font-medium">
                          {rider.name?.charAt(0)?.toUpperCase() ?? "R"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{rider.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {rider.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant={rider.is_online ? "default" : "outline"} className="text-[10px]">
                        {rider.is_online ? "Online" : "Offline"}
                      </Badge>
                      {live && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          On Delivery
                        </Badge>
                      )}
                      {!rider.is_approved && (
                        <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
                      <div>
                        <p className="text-lg font-bold">{rider.total_deliveries}</p>
                        <p className="text-[10px] text-muted-foreground">Deliveries</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-lg font-bold">{parseFloat(String(rider.rating ?? 0)).toFixed(1)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{rider.vehicle_type}</p>
                        <p className="text-[10px] text-muted-foreground">Vehicle</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="hidden md:table-cell">Deliveries</TableHead>
                <TableHead className="hidden md:table-cell">Rating</TableHead>
                <TableHead className="hidden lg:table-cell">Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : riders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Bike className="h-6 w-6 text-muted-foreground" />}
                      title="No riders found"
                      description={search ? "Try a different search" : "No riders registered yet"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                riders.map((rider) => (
                  <TableRow
                    key={rider.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRiderId(rider.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={rider.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {rider.name?.charAt(0)?.toUpperCase() ?? "R"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{rider.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {rider.phone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{rider.vehicle_type}</div>
                      <div className="text-xs text-muted-foreground">{rider.vehicle_number}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-medium">{rider.total_deliveries}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{parseFloat(String(rider.rating ?? 0)).toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{rider.commission_rate}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant={rider.is_online ? "default" : "outline"} className="text-[10px]">
                          {rider.is_online ? "Online" : "Offline"}
                        </Badge>
                        {!rider.is_active && (
                          <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                        )}
                        {!rider.is_approved && (
                          <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}  {/* end grid/table toggle */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} riders)
          </p>
          <div className="flex gap-1">
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

      {/* Detail Drawer */}
      <RiderDetailDrawer
        riderId={selectedRiderId}
        open={!!selectedRiderId}
        onClose={() => setSelectedRiderId(null)}
      />
    </div>
  )
}

export default function RidersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <RidersContent />
    </Suspense>
  )
}
