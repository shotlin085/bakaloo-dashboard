"use client"

/**
 * Shop_Financials_UI — read-only profit-and-loss page (task 9.3).
 *
 * Renders the period-list shell for a single shop:
 *   - Empty state via `<EmptyShopState />` when `mode !== "SINGLE_SHOP"`,
 *     and the underlying query is `enabled: false` in that branch
 *     (Req 8.1, design §11).
 *   - Period toggle (Daily / Weekly / Monthly) defaulting to Daily
 *     (Req 8.2).
 *   - Date range picker (react-day-picker) defaulting to last 30 days
 *     for Daily, last 12 weeks for Weekly, last 12 months for Monthly
 *     (Req 8.3). The numeric range is debounced at 500 ms before the
 *     query fires (design §15).
 *   - 8-card KPI strip aggregated across the visible page rows (Req 8.4).
 *     The grid wraps to 2 columns below 1024 px (Req 12.4).
 *   - Recharts `<AreaChart>` with two series (`gross_revenue`,
 *     `net_revenue`), loaded via `next/dynamic({ ssr: false })` so the
 *     chart bundle stays out of the initial JS payload (Req 8.5,
 *     design §15).
 *   - Period table with columns from Req 8.6, paginated 20/page with
 *     `placeholderData: (prev) => prev`. Rendered through `<DataList />`
 *     so it collapses to stacked cards below md (design §13).
 *   - Payout-status chip group (PENDING / PROCESSING / PAID / HELD)
 *     counts of the visible rows (Req 8.7).
 *   - Every monetary value runs through `formatCurrency` from
 *     `@/lib/i18n` so locale and decimal handling are consistent
 *     (Req 8.8).
 *   - Strictly read-only — no mutation hooks, no create/edit/delete
 *     affordances (Req 8.9).
 *   - On query failure renders `<ErrorBlock />` with the server message
 *     and a Retry button (Req 8.10).
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9,
 * 8.10, 12.4, 14.2, 14.3, 14.6, 14.7
 */

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { useShopFinancials } from "@/hooks/useShopFinancials"
import { formatCurrency, formatDate, t } from "@/lib/i18n"
import type {
  ShopFinancialPayoutStatus,
  ShopFinancialPeriod,
  ShopFinancialPeriodType,
} from "@/types/shop-financial.types"

import { aggregateShopFinancialKpis } from "./_lib/aggregate-kpis"

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic chart
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defer Recharts until after first paint — the financials page is the only
 * surface that imports `<AreaChart>`, so keeping it out of the initial
 * bundle is a meaningful saving on the dashboard's shared chunks
 * (design §15).
 */
const FinancialsChart = dynamic(
  () => import("./_components/financials-chart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />,
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Page size for the period table (Req 8.6). Service caps `limit` at 100. */
const PAGE_SIZE = 20

/** Debounce window applied to the date-range pair before requerying. */
const RANGE_DEBOUNCE_MS = 500

/** All four payout statuses in the canonical display order (Req 8.7). */
const PAYOUT_STATUSES: readonly ShopFinancialPayoutStatus[] = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "HELD",
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a `Date` as `YYYY-MM-DD` (calendar-only) — the format the backend
 * `listShopFinancialsQuerySchema` accepts. Uses local-time components so
 * "last 30 days" matches the user's wall clock rather than UTC.
 */
function toCalendarDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Default date range per period bucket (Req 8.3):
 *   - Daily   → last 30 days
 *   - Weekly  → last 12 weeks (84 days)
 *   - Monthly → last 12 months
 *
 * Returns dates with the time portion stripped so the range picker shows
 * clean YYYY-MM-DD boundaries.
 */
function defaultRangeFor(period: ShopFinancialPeriodType): {
  from: Date
  to: Date
} {
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  const from = new Date(to)
  if (period === "DAILY") {
    from.setDate(from.getDate() - 29) // inclusive 30-day window
  } else if (period === "WEEKLY") {
    from.setDate(from.getDate() - 7 * 12 + 1) // 12 weeks inclusive
  } else {
    from.setMonth(from.getMonth() - 11) // 12 months inclusive
  }
  return { from, to }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopFinancialsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  // ─── Period toggle (Req 8.2 — defaults to Daily) ────────────────────────
  const [period, setPeriod] = useState<ShopFinancialPeriodType>("DAILY")

  // ─── Date range — defaulted from `period` (Req 8.3) ─────────────────────
  // Stored as `Date | undefined` so the shared `<DateRangePicker />` can be
  // wired without translation. Reset whenever the period changes so users
  // get the canonical default for the new bucket.
  const [range, setRange] = useState<{ from?: Date; to?: Date }>(() =>
    defaultRangeFor("DAILY"),
  )

  // ─── Pagination ─────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)

  useEffect(() => {
    setRange(defaultRangeFor(period))
    setPage(1)
  }, [period])

  // ─── Debounced range (design §15: numeric range debounced at 500 ms) ────
  // Debouncing the encoded calendar pair (rather than the raw `Date` pair)
  // is enough — the query key only depends on the YYYY-MM-DD strings.
  const fromKey = range.from ? toCalendarDate(range.from) : undefined
  const toKey = range.to ? toCalendarDate(range.to) : undefined
  const debouncedFrom = useDebounce(fromKey, RANGE_DEBOUNCE_MS)
  const debouncedTo = useDebounce(toKey, RANGE_DEBOUNCE_MS)

  // ─── Data query ─────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useShopFinancials({
    shopId: activeShopId,
    period_type: period,
    from: debouncedFrom,
    to: debouncedTo,
    page,
    limit: PAGE_SIZE,
  })

  const rows: ShopFinancialPeriod[] = useMemo(() => data?.items ?? [], [data])

  // ─── KPI aggregates (Req 8.4) ───────────────────────────────────────────
  // Computed via `useMemo` over the currently visible page rows. Every
  // monetary value is rendered through `formatCurrency` (Req 8.8). The
  // reducer lives in `_lib/aggregate-kpis.ts` so the math is unit-tested
  // without mounting React (task 9.4). `avg_order_value` is a weighted
  // mean (total revenue ÷ total orders) so periods with zero orders don't
  // drag the average toward zero.
  const kpis = useMemo(() => aggregateShopFinancialKpis(rows), [rows])

  // ─── Payout-status breakdown (Req 8.7) ──────────────────────────────────
  // Counts of the four lifecycle states across the visible rows. Always
  // returns all four keys (with 0) so the chip group has stable layout.
  const payoutCounts = useMemo<Record<ShopFinancialPayoutStatus, number>>(
    () => {
      const seed: Record<ShopFinancialPayoutStatus, number> = {
        PENDING: 0,
        PROCESSING: 0,
        PAID: 0,
        HELD: 0,
      }
      for (const r of rows) seed[r.payout_status] += 1
      return seed
    },
    [rows],
  )

  // ─── Chart data — the time-series chart consumes only what it needs ─────
  const chartData = useMemo(
    () =>
      rows
        .slice() // don't mutate the cache
        .sort((a, b) => a.period_start.localeCompare(b.period_start))
        .map((r) => ({
          period_start: r.period_start,
          gross_revenue: r.gross_revenue,
          net_revenue: r.net_revenue,
        })),
    [rows],
  )

  // ─── Period table columns (Req 8.6) ─────────────────────────────────────
  const columns = useMemo<DataListColumn<ShopFinancialPeriod>[]>(
    () => [
      {
        id: "periodStart",
        header: t("shopFinancials.column.periodStart"),
        cell: (r) => formatDate(r.period_start, "short"),
      },
      {
        id: "periodEnd",
        header: t("shopFinancials.column.periodEnd"),
        cell: (r) => formatDate(r.period_end, "short"),
      },
      {
        id: "grossRevenue",
        header: t("shopFinancials.column.grossRevenue"),
        cell: (r) => formatCurrency(r.gross_revenue),
      },
      {
        id: "netRevenue",
        header: t("shopFinancials.column.netRevenue"),
        cell: (r) => formatCurrency(r.net_revenue),
      },
      {
        id: "totalOrders",
        header: t("shopFinancials.column.totalOrders"),
        cell: (r) => r.total_orders,
      },
      {
        id: "avgOrderValue",
        header: t("shopFinancials.column.avgOrderValue"),
        cell: (r) => formatCurrency(r.avg_order_value),
      },
      {
        id: "platformCommission",
        header: t("shopFinancials.column.platformCommission"),
        cell: (r) => formatCurrency(r.platform_commission),
      },
      {
        id: "deliveryCosts",
        header: t("shopFinancials.column.deliveryCosts"),
        cell: (r) => formatCurrency(r.delivery_costs),
      },
      {
        id: "refundAmount",
        header: t("shopFinancials.column.refundAmount"),
        cell: (r) => formatCurrency(r.refund_amount),
      },
      {
        id: "payoutAmount",
        header: t("shopFinancials.column.payoutAmount"),
        cell: (r) => formatCurrency(r.payout_amount),
      },
      {
        id: "payoutStatus",
        header: t("shopFinancials.column.payoutStatus"),
        cell: (r) => <PayoutStatusBadge status={r.payout_status} />,
      },
      {
        id: "payoutRef",
        header: t("shopFinancials.column.payoutRef"),
        cell: (r) =>
          r.payout_ref ? (
            <span className="font-mono text-xs">{r.payout_ref}</span>
          ) : (
            "—"
          ),
      },
      {
        id: "paidAt",
        header: t("shopFinancials.column.paidAt"),
        cell: (r) => (r.paid_at ? formatDate(r.paid_at, "datetime") : "—"),
      },
    ],
    [],
  )

  // ─── Empty-shop short-circuit (Req 8.1) ─────────────────────────────────
  // Rendered before reading the data hooks (the query is still gated by
  // `enabled: !!shopId` inside `useShopFinancials`, so no request fires).
  if (mode !== "SINGLE_SHOP") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("shopFinancials.title")}
          subtitle={t("emptyShop.description")}
        />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  // ─── Standard shell ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title={t("shopFinancials.title")}>
        {isFetching && !isLoading ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : null}
      </PageHeader>

      {/* Filters: period toggle + date range picker (Req 8.2, 8.3) */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as ShopFinancialPeriodType)}
          >
            <TabsList className="h-9">
              <TabsTrigger
                value="DAILY"
                className="px-3 text-xs"
                data-testid="period-daily"
              >
                {t("shopFinancials.period.daily")}
              </TabsTrigger>
              <TabsTrigger
                value="WEEKLY"
                className="px-3 text-xs"
                data-testid="period-weekly"
              >
                {t("shopFinancials.period.weekly")}
              </TabsTrigger>
              <TabsTrigger
                value="MONTHLY"
                className="px-3 text-xs"
                data-testid="period-monthly"
              >
                {t("shopFinancials.period.monthly")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next)
              setPage(1)
            }}
            className="ml-auto"
          />
        </CardContent>
      </Card>

      {/* Body — error / loading / loaded */}
      {isError ? (
        <ErrorBlock
          message={
            error instanceof Error ? error.message : t("errors.genericError")
          }
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <LoadingSkeletons />
      ) : (
        <>
          {/* KPI strip — 4 cols ≥1024px, 2 cols below (Req 8.4, 12.4) */}
          <section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            data-testid="kpi-strip"
          >
            <KpiCard
              label={t("shopFinancials.kpi.grossRevenue")}
              value={formatCurrency(kpis.gross)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.netRevenue")}
              value={formatCurrency(kpis.net)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.totalOrders")}
              value={String(kpis.totalOrders)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.avgOrderValue")}
              value={formatCurrency(kpis.avgOrderValue)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.platformCommission")}
              value={formatCurrency(kpis.commission)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.deliveryCosts")}
              value={formatCurrency(kpis.delivery)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.refundAmount")}
              value={formatCurrency(kpis.refund)}
            />
            <KpiCard
              label={t("shopFinancials.kpi.payoutAmount")}
              value={formatCurrency(kpis.payout)}
            />
          </section>

          {/* Time-series chart (Req 8.5) — minHeight 240px (Req 12.4) */}
          <Card>
            <CardContent className="p-4">
              {chartData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                  {t("shopTransactions.empty")}
                </div>
              ) : (
                <FinancialsChart data={chartData} />
              )}
            </CardContent>
          </Card>

          {/* Payout-status chips (Req 8.7) */}
          <section
            className="flex flex-wrap items-center gap-2"
            data-testid="payout-chips"
            aria-label={t("shopFinancials.column.payoutStatus")}
          >
            {PAYOUT_STATUSES.map((status) => (
              <Badge
                key={status}
                variant={payoutChipVariant(status)}
                data-testid={`payout-chip-${status}`}
              >
                {t(`shopFinancials.payoutStatus.${status}`)}: {payoutCounts[status]}
              </Badge>
            ))}
          </section>

          {/* Period table (Req 8.6) */}
          <Card className="p-0 md:p-2">
            <DataList<ShopFinancialPeriod>
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyMessage={t("shopTransactions.empty")}
            />
          </Card>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 ? (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
}

/**
 * Single KPI tile. Kept local because the only callers are the eight cards
 * in the KPI strip; pulling it out into `_components/` would be premature.
 */
function KpiCard({ label, value }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Map a payout status to a Badge variant. The chip group is informational
 * only — colors back the text, not replace it (Req 13.6).
 */
function payoutChipVariant(
  status: ShopFinancialPayoutStatus,
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (status) {
    case "PAID":
      return "default"
    case "PENDING":
    case "PROCESSING":
      return "secondary"
    case "HELD":
      return "destructive"
  }
}

/**
 * Per-row payout status badge — same color logic as the summary chips so
 * a row's status reads consistently with the header summary.
 */
function PayoutStatusBadge({
  status,
}: {
  status: ShopFinancialPayoutStatus
}) {
  return (
    <Badge variant={payoutChipVariant(status)}>
      {t(`shopFinancials.payoutStatus.${status}`)}
    </Badge>
  )
}

/**
 * Skeleton stand-in shown during the initial query. Mirrors the final layout
 * (KPI strip + chart + table) so the visible jump is minimal once data lands.
 */
function LoadingSkeletons() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (next: number) => void
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
