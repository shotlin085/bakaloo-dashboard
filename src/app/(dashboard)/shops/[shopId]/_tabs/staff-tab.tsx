"use client"

/**
 * Shop detail — Staff tab.
 *
 * Embeds a compact staff preview (top N members) inside the shop detail
 * page and links to the dedicated `/shops/[shopId]/staff` page for full
 * management. The dedicated page already implements pagination, invite,
 * edit, and remove flows; this tab is intentionally a read-only preview.
 *
 * The underlying `useShopStaffList(shopId, { limit: 5 })` hook funnels
 * through the shop-staff service which caps `limit` at 100 (Req 14.4 /
 * Property 12).
 *
 * Requirements: 5.7, 6.1, 6.2, 6.11
 */

import Link from "next/link"
import { ArrowRight } from "lucide-react"

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
import { useShopStaffList } from "@/hooks/useShopStaff"
import { formatDate } from "@/lib/i18n"
import type { ShopStaffRole } from "@/types"

/** Preview row count — keeps the tab compact while still useful. */
const PREVIEW_LIMIT = 5

const ROLE_BADGE: Record<
  ShopStaffRole,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SHOP_ADMIN: "default",
  SHOP_MANAGER: "secondary",
  SHOP_STAFF: "outline",
  SHOP_VIEWER: "outline",
}

export interface StaffTabProps {
  shop: { id: string }
}

export function StaffTab({ shop }: StaffTabProps) {
  const { data, isLoading, isError, error, refetch } = useShopStaffList(
    shop.id,
    { page: 1, limit: PREVIEW_LIMIT },
  )

  const items = data?.items ?? []
  const total = data?.pagination.total ?? 0
  const seeAllHref = `/shops/${shop.id}/staff`

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Staff{total > 0 ? ` (${total})` : ""}
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={seeAllHref}>
            Manage staff
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorBlock
            message={(error as { message?: string } | null)?.message ?? ""}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No staff assigned to this shop yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.user.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.user.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE[row.role]}>{row.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {row.joined_at ? formatDate(row.joined_at, "short") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
