"use client"

/**
 * Shop detail — Activity tab.
 *
 * Renders a paginated activity log scoped to the current shop.
 *
 * Backend caveat — at the time of writing, the
 * `GET /admin/activity-log` route does not yet accept a `shop_id`
 * parameter (see `bakaloo-backend/src/modules/admin/activity-log/
 * activity-log.routes.js`). To stay useful today, this tab fetches the
 * `entityType=shop` slice (server-side filter) and additionally narrows
 * client-side to entries whose `entity_id` matches this shop. Once the
 * backend learns to filter by `shop_id`, swap the client-side filter for
 * a server-side one — the visible columns will not change.
 *
 * Pagination is server-side at 20 rows per page; the backend route
 * enforces `maximum: 100` on `limit`.
 *
 * Columns (Req 5.7):
 *   - created_at
 *   - actor (name + role) — hidden for SHOP_VIEWER (Req 4.4)
 *   - entity
 *   - action
 *   - diff (collapsible `<details>` JSON viewer)
 *
 * Requirements: 5.7
 */

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorBlock } from "@/components/shared/error-block"
import { useActivityLogs } from "@/hooks/useActivityLogs"
import { useShopContext } from "@/hooks/useShopContext"
import { formatDate } from "@/lib/i18n"
import type { ActivityLog } from "@/types/activity-log.types"

/** Default page size (Req 5.7). Backend caps `limit` at 100. */
const PAGE_SIZE = 20

export interface ActivityTabProps {
  shop: { id: string }
}

export function ActivityTab({ shop }: ActivityTabProps) {
  const { shopRole } = useShopContext()
  // Hide the actor column for SHOP_VIEWER (Req 4.4).
  const hideActor = shopRole === "SHOP_VIEWER"

  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useActivityLogs({
    page,
    limit: PAGE_SIZE,
    entityType: "shop",
  })

  // Client-side scope to this shop until the backend learns `shop_id`.
  // Note: a page may render fewer than `PAGE_SIZE` rows when sibling shops
  // appear in the same backend page; documented above.
  const rows = useMemo<ActivityLog[]>(
    () => (data?.logs ?? []).filter((l) => l.entity_id === shop.id),
    [data?.logs, shop.id],
  )

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError ? (
          <ErrorBlock
            message={(error as { message?: string } | null)?.message ?? ""}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-4 w-28" />
                {!hideActor ? <Skeleton className="h-4 w-32" /> : null}
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No activity recorded for this shop yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">When</TableHead>
                  {hideActor ? null : <TableHead>Actor</TableHead>}
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <ActivityRow key={row.id} row={row} hideActor={hideActor} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityRowProps {
  row: ActivityLog
  hideActor: boolean
}

function ActivityRow({ row, hideActor }: ActivityRowProps) {
  const hasDiff =
    (row.old_value !== null && row.old_value !== undefined) ||
    (row.new_value !== null && row.new_value !== undefined)

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDate(row.created_at, "datetime")}
      </TableCell>
      {hideActor ? null : (
        <TableCell>
          <span className="text-sm font-medium">
            {row.admin_name || "System"}
          </span>
        </TableCell>
      )}
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {row.entity_type}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{row.action}</TableCell>
      <TableCell>
        {hasDiff ? (
          <details className="text-xs">
            <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
              View diff
            </summary>
            <pre className="mt-2 max-w-md overflow-auto rounded-md bg-muted p-2 text-[11px] leading-snug">
              {JSON.stringify(
                { old: row.old_value, new: row.new_value },
                null,
                2,
              )}
            </pre>
          </details>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
