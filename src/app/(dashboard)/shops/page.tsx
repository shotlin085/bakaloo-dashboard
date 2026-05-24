"use client"

/**
 * Shops list page (`/shops`) — task 5.3.
 *
 * Renders every shop the operator can see, paginated 20/page (capped at 100
 * by the service layer per Req 14.4 / Property 12). Wraps the rows in
 * `<DataList />` so the table collapses to stacked cards below md (Req 12.3),
 * and surfaces the standard CRUD action menu (View / Edit / Deactivate /
 * Reactivate) gated by `useRouteRBAC` + `useIsSuperAdmin`.
 *
 * Filter behavior (Req 5.3):
 *   - `is_active`   — three-way (all / active / inactive)
 *   - `is_verified` — three-way (all / verified / unverified)
 *   - `city`        — text contains
 *   - `search`      — free-text across name + branch_code, debounced 300 ms
 *
 * Action gating:
 *   - "Create shop" CTA — visible only with `shops.write` AND super admin
 *   - "Edit"             — super-admin only
 *   - "Deactivate"       — super-admin only, gated behind a confirm dialog
 *   - "Reactivate"       — super-admin only, shown for inactive rows
 *
 * Requirements: 5.1, 5.2, 5.3, 5.8, 5.9, 12.3, 14.2, 14.3, 14.4
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Star,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { ErrorBlock } from "@/components/shared/error-block"
import { Forbidden } from "@/components/shared/forbidden"
import { PageHeader } from "@/components/shared/PageHeader"

import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin } from "@/hooks/useShopContext"
import { useRouteRBAC } from "@/hooks/useRBAC"
import { useDeactivateShop, useReactivateShop, useShopsList } from "@/hooks/useShops"

import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { ShopsListParams } from "@/services/shops.service"
import type { Shop } from "@/types"

const PAGE_SIZE = 20

/** UI state for the three-way active/verified selects. */
type TriState = "all" | "yes" | "no"

/** Map a tri-state filter UI value back onto the boolean the service expects. */
function triToBool(v: TriState): boolean | undefined {
  if (v === "yes") return true
  if (v === "no") return false
  return undefined
}

export default function ShopsPage() {
  return <ShopsPageInner />
}

function ShopsPageInner() {
  const router = useRouter()
  const isSuperAdmin = useIsSuperAdmin()
  const { isAuthorized, canWrite } = useRouteRBAC("/shops")

  // ── Filter state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("")
  const [activeFilter, setActiveFilter] = useState<TriState>("all")
  const [verifiedFilter, setVerifiedFilter] = useState<TriState>("all")
  const [page, setPage] = useState(1)

  // 300 ms debounce per Req 5.3 / 14.3.
  const debouncedSearch = useDebounce(search, 300)
  const debouncedCity = useDebounce(city, 300)

  const params: ShopsListParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(debouncedCity.trim() && { city: debouncedCity.trim() }),
      ...(triToBool(activeFilter) !== undefined && {
        is_active: triToBool(activeFilter),
      }),
      ...(triToBool(verifiedFilter) !== undefined && {
        is_verified: triToBool(verifiedFilter),
      }),
    }),
    [page, debouncedSearch, debouncedCity, activeFilter, verifiedFilter],
  )

  const { data, isLoading, isError, error, refetch } = useShopsList(params)

  // Mutations — both gated behind the super-admin role at the action site.
  const deactivate = useDeactivateShop()
  const reactivate = useReactivateShop()

  // Confirmation dialog for Deactivate (Req 5.9).
  const [pendingDeactivate, setPendingDeactivate] = useState<Shop | null>(null)

  // ── RBAC gate — Forbidden short-circuits before further render so the
  //    underlying mutations never get a chance to fire. The list query
  //    above is permitted because the route guard already requires
  //    `shops.read`, which aligns with the GET endpoint (Req 4.3).
  if (!isAuthorized) {
    return <Forbidden />
  }

  const canCreate = canWrite && isSuperAdmin
  const canEdit = isSuperAdmin
  const canToggleActive = isSuperAdmin

  const rows = data?.items ?? []
  const pagination = data?.pagination

  // ── Columns — DataList renders these as a table at md+ and as label/value
  //    pairs in stacked cards below md (Req 12.3 / Property 14).
  const columns: DataListColumn<Shop>[] = [
    {
      id: "name",
      header: t("shops.list.column.name"),
      cell: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/shops/${row.id}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {row.name}
          </Link>
          <span className="text-xs text-muted-foreground">{row.slug}</span>
        </div>
      ),
    },
    {
      id: "branch_code",
      header: t("shops.list.column.branchCode"),
      cell: (row) => (
        <span className="font-mono text-xs">{row.branch_code}</span>
      ),
    },
    {
      id: "city",
      header: t("shops.list.column.city"),
      cell: (row) => <span className="text-sm">{row.city}</span>,
    },
    {
      id: "pincode",
      header: t("shops.list.column.pincode"),
      cell: (row) => (
        <span className="font-mono text-xs">{row.pincode}</span>
      ),
    },
    {
      id: "is_active",
      header: t("shops.list.column.isActive"),
      cell: (row) => <ActiveBadge active={row.is_active} />,
    },
    {
      id: "is_verified",
      header: t("shops.list.column.isVerified"),
      cell: (row) => <VerifiedBadge verified={row.is_verified} />,
    },
    {
      id: "total_orders",
      header: t("shops.list.column.totalOrders"),
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {Number(row.total_orders ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: "avg_rating",
      header: t("shops.list.column.avgRating"),
      cell: (row) => (
        <RatingCell rating={row.avg_rating} count={row.rating_count} />
      ),
    },
    {
      id: "actions",
      header: t("shops.list.column.actions"),
      cell: (row) => (
        <ShopRowActions
          shop={row}
          canEdit={canEdit}
          canToggleActive={canToggleActive}
          onDeactivateClick={() => setPendingDeactivate(row)}
          onReactivateClick={() => reactivate.mutate(row.id)}
          isReactivating={
            reactivate.isPending && reactivate.variables === row.id
          }
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("shops.list.title")}
        subtitle={t("shops.list.subtitle")}
      >
        {canCreate ? (
          <Button onClick={() => router.push("/shops/new")} size="sm">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("shops.list.createButton")}
          </Button>
        ) : null}
      </PageHeader>

      {/* Filters row — search + tri-state selects + city contains. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label={t("shops.list.searchPlaceholder")}
            placeholder={t("shops.list.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as TriState)
            setPage(1)
          }}
        >
          <SelectTrigger
            aria-label={t("shops.list.filter.isActive")}
            className="h-9 w-[150px]"
          >
            <SelectValue placeholder={t("shops.list.filter.isActive")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shops.list.filter.all")}</SelectItem>
            <SelectItem value="yes">
              {t("shops.list.filter.active")}
            </SelectItem>
            <SelectItem value="no">
              {t("shops.list.filter.inactive")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={verifiedFilter}
          onValueChange={(v) => {
            setVerifiedFilter(v as TriState)
            setPage(1)
          }}
        >
          <SelectTrigger
            aria-label={t("shops.list.filter.isVerified")}
            className="h-9 w-[150px]"
          >
            <SelectValue placeholder={t("shops.list.filter.isVerified")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shops.list.filter.all")}</SelectItem>
            <SelectItem value="yes">
              {t("shops.list.filter.verified")}
            </SelectItem>
            <SelectItem value="no">
              {t("shops.list.filter.unverified")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Input
          aria-label={t("shops.list.filter.city")}
          placeholder={t("shops.list.filter.city")}
          value={city}
          onChange={(e) => {
            setCity(e.target.value)
            setPage(1)
          }}
          className="h-9 w-[160px]"
        />
      </div>

      {/* Body — error / loading / data */}
      {isError ? (
        <ErrorBlock
          message={(error as Error)?.message ?? ""}
          onRetry={() => void refetch()}
        />
      ) : isLoading && rows.length === 0 ? (
        <ShopsLoadingSkeleton />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <DataList<Shop>
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage={t("shops.list.empty")}
            className="px-1 py-1 md:px-0 md:py-0"
          />

          {pagination && pagination.totalPages > 1 ? (
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPage={setPage}
            />
          ) : null}
        </div>
      )}

      {/* Deactivate confirm dialog — Req 5.9 */}
      <Dialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("shops.edit.confirmDeactivate.title")}
            </DialogTitle>
            <DialogDescription>
              {t("shops.edit.confirmDeactivate.description")}
            </DialogDescription>
          </DialogHeader>
          {pendingDeactivate ? (
            <p className="text-sm text-muted-foreground">
              {pendingDeactivate.name}{" "}
              <span className="font-mono text-xs">
                ({pendingDeactivate.branch_code})
              </span>
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeactivate(null)}
              disabled={deactivate.isPending}
            >
              {t("shopStaff.invite.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deactivate.isPending || pendingDeactivate === null}
              onClick={() => {
                if (!pendingDeactivate) return
                deactivate.mutate(pendingDeactivate.id, {
                  onSuccess: () => setPendingDeactivate(null),
                })
              }}
            >
              {deactivate.isPending
                ? t("shops.edit.submitting")
                : t("shops.edit.confirmDeactivate.title")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell components
// ─────────────────────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={cn(
        "gap-1 text-[11px]",
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <XCircle className="h-3 w-3" aria-hidden="true" />
      )}
      {active
        ? t("shops.list.filter.active")
        : t("shops.list.filter.inactive")}
    </Badge>
  )
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[11px]",
        verified
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {verified ? (
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ShieldOff className="h-3 w-3" aria-hidden="true" />
      )}
      {verified
        ? t("shops.list.filter.verified")
        : t("shops.list.filter.unverified")}
    </Badge>
  )
}

function RatingCell({
  rating,
  count,
}: {
  // Backend returns these as nullable for newly created shops (no ratings
  // yet); Postgres NUMERIC NULLs come through as null, and undefined can
  // appear during optimistic cache hydration. Coerce both to safe numbers
  // before formatting so the row never crashes the table.
  rating: number | null | undefined
  count: number | null | undefined
}) {
  const safeCount = Number(count ?? 0)
  if (!Number.isFinite(safeCount) || safeCount === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const safeRating = Number(rating ?? 0)
  return (
    <div className="flex items-center gap-1">
      <Star
        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
        aria-hidden="true"
      />
      <span className="text-sm tabular-nums">{safeRating.toFixed(2)}</span>
      <span className="text-xs text-muted-foreground">({safeCount})</span>
    </div>
  )
}

interface ShopRowActionsProps {
  shop: Shop
  canEdit: boolean
  canToggleActive: boolean
  onDeactivateClick: () => void
  onReactivateClick: () => void
  isReactivating: boolean
}

function ShopRowActions({
  shop,
  canEdit,
  canToggleActive,
  onDeactivateClick,
  onReactivateClick,
  isReactivating,
}: ShopRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Actions for ${shop.name}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/shops/${shop.id}`}>View</Link>
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem asChild>
            <Link href={`/shops/${shop.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        ) : null}
        {canToggleActive ? (
          <>
            <DropdownMenuSeparator />
            {shop.is_active ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  onDeactivateClick()
                }}
              >
                <AlertTriangle
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={isReactivating}
                onSelect={(e) => {
                  e.preventDefault()
                  onReactivateClick()
                }}
              >
                <CheckCircle2
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Reactivate
              </DropdownMenuItem>
            )}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination + skeletons
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  onPage: (page: number) => void
}

function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPage,
}: PaginationProps) {
  // Five-button window centered on the current page (matches the orders
  // page pagination so users see the same affordance everywhere).
  const windowSize = Math.min(totalPages, 5)
  const start = Math.max(
    1,
    Math.min(page - 2, Math.max(1, totalPages - (windowSize - 1))),
  )
  const pages = Array.from({ length: windowSize }, (_, i) => start + i)

  return (
    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
        {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-8 text-xs"
        >
          Previous
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPage(p)}
            className="h-8 w-8 p-0 text-xs"
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-8 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function ShopsLoadingSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b py-2 last:border-b-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  )
}
