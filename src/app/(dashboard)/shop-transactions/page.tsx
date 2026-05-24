"use client"

/**
 * Shop_Transactions ledger page — task 10.3 of the multi-vendor dashboard.
 *
 * Renders the per-shop append-only ledger surface:
 *   - Empty state via `<EmptyShopState />` when `mode !== "SINGLE_SHOP"`,
 *     and the underlying TanStack Query is disabled in that branch
 *     (Req 9.1, design §10).
 *   - Filters: `type` (multi-select via a checkbox-popover), date range
 *     (`from` / `to` `<input type="date">`), `reference_type` (single-select),
 *     and a free-text `search` across description debounced at 300 ms
 *     (Req 9.4, 14.3).
 *   - Eight columns rendered through `<DataList />` so the table collapses
 *     to stacked cards below md while preserving every column value
 *     (Req 9.3, 12.3, design §13).
 *   - Header chip showing the running balance (`page.items[0]?.balance_after`)
 *     as a reference, since the backend returns rows sorted `created_at` desc
 *     and `balance_after` is the post-row balance (Req 9.7, design §10).
 *   - Reference cell renders a `<Link>` to the related order detail
 *     (ORDER_REVENUE / REFUND_DEBIT / COMMISSION_DEBIT / DELIVERY_COST →
 *     `/orders/{reference_id}`) or shop financial period
 *     (PAYOUT_CREDIT → `/shop-financials?period_id={reference_id}`); other
 *     types render the raw id without a link (Req 9.6).
 *   - Read-only by construction: there are no create / edit / delete
 *     affordances anywhere on the page (Req 9.5, 15.1).
 *
 * The amount cell colours credits (positive amount) green and debits
 * (negative amount) red and always shows the sign so users with color-vision
 * differences can still tell the direction (Req 13.6).
 *
 * Validates Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7, 12.3, 14.2, 14.3
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { Filter, Loader2, Search } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { useShopTransactions } from "@/hooks/useShopTransactions"
import { formatCurrency, formatDate, t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type {
  ShopTransactionReferenceType,
  ShopTransactionsListParams,
} from "@/services/shop-transactions.service"
import type { ShopTransaction, ShopTransactionType } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Page-size constant — matches the canonical 20 rows/page (Req 9.2).
 *  The service further caps `limit` at 100 (Property 12). */
const PAGE_SIZE = 20

/** All ledger types in display order — drives the type-filter checkboxes. */
const ALL_TYPES: ShopTransactionType[] = [
  "ORDER_REVENUE",
  "COMMISSION_DEBIT",
  "DELIVERY_COST",
  "REFUND_DEBIT",
  "PAYOUT_CREDIT",
  "ADJUSTMENT",
  "EXPENSE",
]

/** All reference_type filter options — matches the backend enum. */
const ALL_REFERENCE_TYPES: ShopTransactionReferenceType[] = [
  "ORDER",
  "PAYOUT",
  "ADJUSTMENT",
  "EXPENSE",
]

/** Sentinel value for "no reference_type filter" in the Select control. */
const ALL_REFERENCE_TYPES_VALUE = "all"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the navigation target for a ledger row's reference cell.
 *
 * Req 9.6:
 *   - ORDER_REVENUE / REFUND_DEBIT / COMMISSION_DEBIT / DELIVERY_COST
 *       → `/orders/{reference_id}`
 *   - PAYOUT_CREDIT
 *       → `/shop-financials?period_id={reference_id}`
 *   - ADJUSTMENT / EXPENSE — no canonical destination; rendered without a link.
 *
 * Returns `null` when `reference_id` is missing or the type is not
 * navigable, so the cell can render the raw id without a `<Link>` wrapper.
 */
function buildReferenceHref(row: ShopTransaction): string | null {
  if (!row.reference_id) return null
  switch (row.type) {
    case "ORDER_REVENUE":
    case "REFUND_DEBIT":
    case "COMMISSION_DEBIT":
    case "DELIVERY_COST":
      return `/orders/${row.reference_id}`
    case "PAYOUT_CREDIT":
      return `/shop-financials?period_id=${row.reference_id}`
    default:
      return null
  }
}

/**
 * Convert a calendar date (`YYYY-MM-DD`) into the ISO 8601 timestamp the
 * backend filter expects. We anchor `from` to the start of the day and `to`
 * to the end of the day so an inclusive single-day range still matches every
 * row created on that calendar date.
 */
function calendarDateToIso(
  value: string,
  endOfDay: boolean,
): string | undefined {
  if (!value) return undefined
  // `YYYY-MM-DD` always has length 10 — trust the `<input type="date">`
  // contract; jsdom returns the same shape.
  return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopTransactionsPage() {
  // ─── Shop context gating ─────────────────────────────────────────────────
  // Req 9.1: render `<EmptyShopState />` when no single shop is active. The
  // list query's `enabled` flag also short-circuits in this branch (see
  // `useShopTransactions`), so no request is fired against the backend.
  const { mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  // ─── Filter state ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<ShopTransactionType[]>([])
  const [referenceType, setReferenceType] = useState<string>(
    ALL_REFERENCE_TYPES_VALUE,
  )
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)

  // 300 ms debounce on the free-text search field (Req 9.4 / 14.3). The page
  // resets to page 1 whenever a filter changes (see the inline handlers).
  const debouncedSearch = useDebounce(searchInput, 300)

  // ─── Build the list query params ─────────────────────────────────────────
  const filters = useMemo<ShopTransactionsListParams>(() => {
    const params: ShopTransactionsListParams = { page, limit: PAGE_SIZE }
    const trimmed = debouncedSearch.trim()
    if (trimmed.length > 0) params.search = trimmed
    if (selectedTypes.length > 0) params.type = selectedTypes
    if (referenceType !== ALL_REFERENCE_TYPES_VALUE) {
      params.reference_type = referenceType as ShopTransactionReferenceType
    }
    const fromIso = calendarDateToIso(fromDate, false)
    const toIso = calendarDateToIso(toDate, true)
    if (fromIso) params.from = fromIso
    if (toIso) params.to = toIso
    return params
  }, [page, debouncedSearch, selectedTypes, referenceType, fromDate, toDate])

  // ─── List query ──────────────────────────────────────────────────────────
  // Disabled outside `SINGLE_SHOP` mode (Req 9.1) — the empty state below
  // short-circuits the render before this query is read.
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useShopTransactions(filters)

  const rows: ShopTransaction[] = data?.items ?? []

  // ─── Header chip — running balance reference (Req 9.7) ──────────────────
  // Backend returns rows sorted `created_at` desc, and `balance_after` is the
  // post-row balance, so the first visible row carries the latest balance.
  // When the page is empty (or still loading), the chip is hidden.
  const runningBalance: number | null = rows[0]?.balance_after ?? null

  // ─── Columns (8 columns per Req 9.3) ────────────────────────────────────
  const columns = useMemo<DataListColumn<ShopTransaction>[]>(
    () => [
      {
        id: "createdAt",
        header: t("shopTransactions.column.createdAt"),
        cell: (row) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDate(row.created_at, "datetime")}
          </span>
        ),
      },
      {
        id: "type",
        header: t("shopTransactions.column.type"),
        cell: (row) => (
          <Badge variant="outline" className="font-medium">
            {t(`shopTransactions.type.${row.type}`)}
          </Badge>
        ),
      },
      {
        id: "amount",
        header: t("shopTransactions.column.amount"),
        cell: (row) => <AmountCell amount={row.amount} />,
      },
      {
        id: "balanceAfter",
        header: t("shopTransactions.column.balanceAfter"),
        cell: (row) => (
          <span className="tabular-nums">{formatCurrency(row.balance_after)}</span>
        ),
      },
      {
        id: "referenceType",
        header: t("shopTransactions.column.referenceType"),
        cell: (row) =>
          row.reference_type ? (
            <span className="text-sm text-muted-foreground">
              {row.reference_type}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "referenceId",
        header: t("shopTransactions.column.referenceId"),
        cell: (row) => <ReferenceCell row={row} />,
      },
      {
        id: "description",
        header: t("shopTransactions.column.description"),
        cell: (row) => (
          <span className="text-sm text-foreground">{row.description}</span>
        ),
      },
      {
        id: "createdBy",
        header: t("shopTransactions.column.createdBy"),
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.created_by}
          </span>
        ),
      },
    ],
    [],
  )

  // ─── Empty-shop short-circuit (Req 9.1) ──────────────────────────────────
  // Rendered before the data hooks are read so no list request fires.
  if (mode !== "SINGLE_SHOP") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("shopTransactions.title")}
          subtitle={t("emptyShop.description")}
        />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  // ─── Standard list shell ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header row: title + running-balance chip (read-only — no CTA per Req 9.5) */}
      <PageHeader
        title={t("shopTransactions.title")}
        subtitle={
          data?.pagination ? `${data.pagination.total} total` : undefined
        }
      >
        {/* Req 9.7 — header chip displays the running balance reference,
            sourced from the first visible row's `balance_after`. Hidden
            when the page is empty so the operator never sees a stale or
            misleading "0.00" placeholder. */}
        {runningBalance !== null ? (
          <Badge variant="secondary" data-testid="running-balance-chip">
            {t("shopTransactions.balanceChip", {
              balance: formatCurrency(runningBalance),
            })}
          </Badge>
        ) : null}
      </PageHeader>

      {/* Filters row */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Free-text search across description (Req 9.4, debounced 300 ms) */}
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label={t("shopTransactions.searchPlaceholder")}
              placeholder={t("shopTransactions.searchPlaceholder")}
              className="h-9 pl-9"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Type multi-select via a checkbox popover */}
          <TypeFilterPopover
            selected={selectedTypes}
            onChange={(next) => {
              setSelectedTypes(next)
              setPage(1)
            }}
          />

          {/* reference_type single-select */}
          <Select
            value={referenceType}
            onValueChange={(v) => {
              setReferenceType(v)
              setPage(1)
            }}
          >
            <SelectTrigger
              className="h-9 w-[180px]"
              aria-label={t("shopTransactions.filter.referenceType")}
            >
              <SelectValue
                placeholder={t("shopTransactions.filter.referenceType")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_REFERENCE_TYPES_VALUE}>
                {t("shops.list.filter.all")}
              </SelectItem>
              {ALL_REFERENCE_TYPES.map((rt) => (
                <SelectItem key={rt} value={rt}>
                  {rt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range — reuses the established `<input type="date">` pattern
              from the customers page so we don't pull in a new datepicker dep. */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t("shopTransactions.filter.dateRange")}:
            </span>
            <Input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[140px] text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[140px] text-xs"
            />
          </div>

          {/* Subtle background-fetch indicator so users get feedback when
              `placeholderData: (prev) => prev` keeps the previous page on
              screen during pagination/filter transitions. */}
          {isFetching && !isLoading ? (
            <Loader2
              className="ml-auto h-4 w-4 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          ) : null}
        </div>
      </Card>

      {/* Content */}
      {isError ? (
        <ErrorBlock
          message={
            error instanceof Error ? error.message : t("errors.genericError")
          }
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <ListSkeleton />
      ) : (
        <Card className="p-0 md:p-2">
          <DataList<ShopTransaction>
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            emptyMessage={t("shopTransactions.empty")}
          />
        </Card>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 ? (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onChange={setPage}
        />
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell renderers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Amount cell — colours credits (positive amount) green and debits
 * (negative amount) red, and always renders a leading sign (`+` for
 * credits, `−` for debits) so users with color-vision differences can still
 * tell the direction of the entry (Req 9.3, 13.6).
 *
 * Zero amounts are rendered without a sign in muted styling — they are rare
 * (typical only for ADJUSTMENT entries that net to zero) but legal under the
 * backend schema, so we render them safely instead of asserting them away.
 */
function AmountCell({ amount }: { amount: number }) {
  const isCredit = amount > 0
  const isDebit = amount < 0
  const sign = isCredit ? "+" : isDebit ? "−" : ""
  // `Math.abs` keeps `formatCurrency` from injecting its own locale-specific
  // negative glyph (e.g. parentheses), which would conflict with the explicit
  // sign we render in front of it.
  const magnitude = formatCurrency(Math.abs(amount))
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        isCredit && "text-green-600 dark:text-green-500",
        isDebit && "text-red-600 dark:text-red-500",
        !isCredit && !isDebit && "text-muted-foreground",
      )}
    >
      {sign}
      {magnitude}
    </span>
  )
}

/**
 * Reference id cell — renders a `<Link>` to the related order detail or
 * shop financial period when the row's `type` has a known destination
 * (Req 9.6); otherwise renders the raw id (or `—` when null) so the column
 * stays informative even for unlinked types like ADJUSTMENT and EXPENSE.
 */
function ReferenceCell({ row }: { row: ShopTransaction }) {
  if (!row.reference_id) {
    return <span className="text-muted-foreground">—</span>
  }
  const href = buildReferenceHref(row)
  if (!href) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        {row.reference_id}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="font-mono text-xs text-primary underline-offset-4 hover:underline"
    >
      {row.reference_id}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Type filter popover
// ─────────────────────────────────────────────────────────────────────────────

interface TypeFilterPopoverProps {
  selected: ShopTransactionType[]
  onChange: (next: ShopTransactionType[]) => void
}

/**
 * Multi-select for ledger `type` rendered as a checkbox group inside a
 * popover. Picked over a freeform `Combobox` because the option set is
 * fixed and small (seven values), so a checkbox list is faster to operate
 * with both pointer and keyboard. Trigger label summarises the current
 * selection so the operator can read the active filter at a glance without
 * opening the popover.
 */
function TypeFilterPopover({ selected, onChange }: TypeFilterPopoverProps) {
  const triggerLabel =
    selected.length === 0
      ? t("shopTransactions.filter.type")
      : selected.length === 1
        ? t(`shopTransactions.type.${selected[0]}`)
        : `${t("shopTransactions.filter.type")} (${selected.length})`

  const toggle = (type: ShopTransactionType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((existing) => existing !== type))
    } else {
      onChange([...selected, type])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          aria-label={t("shopTransactions.filter.type")}
        >
          <Filter className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">
            {t("shopTransactions.filter.type")}
          </span>
          {selected.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          {ALL_TYPES.map((type) => {
            const id = `tx-type-${type}`
            const checked = selected.includes(type)
            return (
              <label
                key={type}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => toggle(type)}
                />
                <Label
                  htmlFor={id}
                  className="cursor-pointer text-sm font-normal"
                >
                  {t(`shopTransactions.type.${type}`)}
                </Label>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton + pagination
// ─────────────────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (next: number) => void
}

/**
 * Minimal previous/next pagination, mirroring the shop-products page so the
 * two ledger-style surfaces feel identical. A richer pagination control lives
 * in the shared layout and can be swapped in once a future task lands a
 * canonical pagination component.
 */
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
