"use client"

/**
 * Shop_Staff_UI list page — `/shops/[shopId]/staff`.
 *
 * Renders the paginated staff list for a single shop using
 * {@link useShopStaffList}. RBAC is derived from {@link useRouteRBAC}:
 * users without `shop-staff.write` see the list in read-only mode (no
 * "Invite staff" CTA, no row actions). The responsive table↔card
 * collapse below md is delegated to the shared `<DataList />` shell.
 *
 * Pagination is server-side at 20 rows per page, capped at 100 by the
 * service layer (`shop-staff.service.ts`).
 *
 * The "Invite staff" CTA opens `<InviteStaffDialog mode="invite" />` and
 * the row "Edit" action opens the same dialog in `mode="edit"` prefilled
 * from the row (task 6.4).
 *
 * Requirements: 6.1, 6.2, 6.11, 12.3
 */

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { ErrorBlock } from "@/components/shared/error-block"
import { Forbidden } from "@/components/shared/forbidden"
import { PageHeader } from "@/components/shared/PageHeader"
import { useRouteRBAC } from "@/hooks/useRBAC"
import { useRemoveShopStaff, useShopStaffList } from "@/hooks/useShopStaff"
import { formatDate, t } from "@/lib/i18n"
import type { ShopStaff, ShopStaffRole } from "@/types"

import { InviteStaffDialog } from "./_components/invite-staff-dialog"

/** Default page size for the staff list (Req 6.1). */
const PAGE_SIZE = 20

/**
 * Visual variants for the role badge column. Maps every ShopStaffRole onto
 * one of the shadcn Badge variants so the column can render at a glance.
 */
const ROLE_BADGE_VARIANT: Record<
  ShopStaffRole,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SHOP_ADMIN: "default",
  SHOP_MANAGER: "secondary",
  SHOP_STAFF: "outline",
  SHOP_VIEWER: "outline",
}

/** Localized label for each role — falls back to the raw token. */
function roleLabel(role: ShopStaffRole): string {
  const key = `shopStaff.invite.role.${role}` as const
  const translated = t(key)
  return translated === key ? role : translated
}

/**
 * Page component — receives the dynamic `shopId` segment from the App
 * Router via `params.shopId`.
 */
export default function ShopStaffPage({
  params,
}: {
  params: { shopId: string }
}) {
  const shopId = params.shopId

  // RBAC — `useRouteRBAC` checks the route guard for `/shops/:id/staff` and
  // surfaces both `isAuthorized` (gates the entire page) and `canWrite`
  // (gates the invite CTA + row actions per Req 6.11).
  const { isAuthorized, canWrite } = useRouteRBAC(`/shops/${shopId}/staff`)

  // Pagination + invite-dialog state are local to this page; filters
  // (role / is_active / search) will be added in a follow-up.
  const [page, setPage] = useState(1)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  // The same dialog is reused for invite + edit. When `editingStaff` is
  // non-null the dialog mounts in `"edit"` mode; otherwise `isInviteOpen`
  // toggles the invite flow. The two states are mutually exclusive at the
  // open() handlers so only one dialog is ever mounted at a time.
  const [editingStaff, setEditingStaff] = useState<ShopStaff | null>(null)
  // Remove confirmation — when non-null the AlertDialog is open and labels
  // itself with this row's display name (Req 6.9). Cleared on confirm
  // settle (success or error) and on cancel.
  const [removingStaff, setRemovingStaff] = useState<ShopStaff | null>(null)

  const removeMutation = useRemoveShopStaff(shopId)

  const listParams = useMemo(
    () => ({ page, limit: PAGE_SIZE }),
    [page],
  )

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useShopStaffList(shopId, listParams)

  // Short-circuit before any data is touched when the user fails the
  // route guard (Req 4.3).
  if (!isAuthorized) {
    return <Forbidden />
  }

  const items: ShopStaff[] = data?.items ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 0

  // Columns are constant per page — defined inline so the renderers can close
  // over `canWrite` for the actions column.
  const columns: DataListColumn<ShopStaff>[] = [
    {
      id: "name",
      header: t("shopStaff.list.column.user"),
      cell: (row) => (
        <span className="font-medium">{row.user.name || "—"}</span>
      ),
    },
    {
      id: "email",
      header: t("shopStaff.list.column.email"),
      cell: (row) => (
        <span className="text-muted-foreground">{row.user.email || "—"}</span>
      ),
    },
    {
      id: "phone",
      header: t("shopStaff.list.column.phone"),
      cell: (row) => (
        <span className="text-muted-foreground">{row.user.phone || "—"}</span>
      ),
    },
    {
      id: "role",
      header: t("shopStaff.list.column.role"),
      cell: (row) => (
        <Badge variant={ROLE_BADGE_VARIANT[row.role]}>
          {roleLabel(row.role)}
        </Badge>
      ),
    },
    {
      id: "is_active",
      header: t("shopStaff.list.column.isActive"),
      cell: (row) =>
        row.is_active ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        ),
    },
    {
      id: "joined_at",
      header: t("shopStaff.list.column.joinedAt"),
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.joined_at ? formatDate(row.joined_at, "short") : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("shopStaff.list.column.actions"),
      // Row actions are only mounted for users with `shop-staff.write`.
      // Read-only viewers see an em-dash placeholder so the column stays
      // aligned without exposing an empty trigger. (Req 6.11.)
      cell: (row) =>
        canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Actions for ${row.user.name ?? "staff member"}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit opens the same dialog in `"edit"` mode and prefills
                  from the row. Remove opens the AlertDialog confirmation
                  below (task 6.6 / Req 6.9). */}
              <DropdownMenuItem onSelect={() => setEditingStaff(row)}>
                {t("shopStaff.edit.title")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setRemovingStaff(row)}
                className="text-destructive focus:text-destructive"
              >
                {t("shopStaff.confirmRemove.confirm")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-muted-foreground" aria-hidden="true">
            —
          </span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("shopStaff.list.title")}
        subtitle={t("shopStaff.list.count", { count: total })}
      >
        {/* Invite CTA visible only to users with `shop-staff.write` (Req 6.11). */}
        {canWrite ? (
          <Button onClick={() => setIsInviteOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("shopStaff.list.inviteButton")}
          </Button>
        ) : null}
      </PageHeader>

      {isError ? (
        <ErrorBlock
          status={
            (error as { response?: { status?: number } } | null)?.response
              ?.status
          }
          message={
            (error as { message?: string } | null)?.message ??
            t("errors.genericError")
          }
          onRetry={() => {
            void refetch()
          }}
        />
      ) : isLoading && items.length === 0 ? (
        <Card className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <DataList<ShopStaff>
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
            emptyMessage={t("shopStaff.list.empty")}
          />
        </Card>
      )}

      {/* Pagination footer — shown only when there is more than one page. */}
      {totalPages > 1 ? (
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

      {/*
        Real invite/edit dialog (task 6.4). The same component is reused
        for both flows; toggling `editingStaff` puts it in `"edit"` mode
        with the row prefilled, and `isInviteOpen` drives the fresh
        `"invite"` flow. The two state variables are mutually exclusive at
        the open() handlers above so only one dialog is mounted at a time.
      */}
      {canWrite ? (
        <>
          <InviteStaffDialog
            shopId={shopId}
            open={isInviteOpen}
            onOpenChange={setIsInviteOpen}
            mode="invite"
          />
          {editingStaff ? (
            <InviteStaffDialog
              shopId={shopId}
              // Keying on `editingStaff.id` resets RHF state cleanly when
              // the operator pivots between rows without first closing the
              // dialog (defensive — should not happen with the dropdown
              // pattern above, but cheap insurance).
              key={editingStaff.id}
              open={Boolean(editingStaff)}
              onOpenChange={(open) => {
                if (!open) setEditingStaff(null)
              }}
              mode="edit"
              initialStaff={editingStaff}
            />
          ) : null}

          {/*
            Remove confirmation (Req 6.9). The dialog mounts only when
            `removingStaff` is non-null so the title can safely interpolate
            `staff.user.name`. `onSettled` clears the row regardless of
            success/error — the hook itself handles cache invalidation and
            success/error toasts.
          */}
          <AlertDialog
            open={Boolean(removingStaff)}
            onOpenChange={(open) => {
              if (!open && !removeMutation.isPending) {
                setRemovingStaff(null)
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("shopStaff.confirmRemove.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("shopStaff.confirmRemove.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {removingStaff ? (
                <p className="text-sm font-medium">
                  {removingStaff.user.name ||
                    removingStaff.user.email ||
                    removingStaff.user.phone ||
                    "—"}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removeMutation.isPending}>
                  {t("shopStaff.invite.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    if (!removingStaff) return
                    removeMutation.mutate(removingStaff.id, {
                      onSettled: () => setRemovingStaff(null),
                    })
                  }}
                  disabled={removeMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("shopStaff.confirmRemove.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  )
}
