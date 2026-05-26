"use client"

/**
 * Store Staff — task 21.7
 * List, create, edit, deactivate, reset-password.
 * Uses PATCH (not PUT) on update — bug fixed in shop-staff.service.ts.
 * Renders temp password exactly once with copyable UI and clear warning.
 */

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Copy, Loader2, Plus, Search, Shield, UserX } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { PermissionGate } from "@/components/shared/PermissionGate"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { shopStaffService, type ShopStaffListParams, type ShopStaffInviteBody, type ShopStaffUpdateBody } from "@/services/shop-staff.service"
import type { ShopStaff, ShopStaffRole } from "@/types"

const PAGE_SIZE = 20
const ROLES: ShopStaffRole[] = ["SHOP_ADMIN", "SHOP_MANAGER", "SHOP_STAFF", "SHOP_VIEWER"]

export default function StoreStaffPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [editStaff, setEditStaff] = useState<ShopStaff | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [tempPasswordStaffName, setTempPasswordStaffName] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const filters = useMemo<ShopStaffListParams>(() => {
    const params: ShopStaffListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (roleFilter !== "all") params.role = roleFilter as ShopStaffRole
    return params
  }, [page, debouncedSearch, roleFilter])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["shop-staff", activeShopId, filters],
    queryFn: () => shopStaffService.list(activeShopId!, filters),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const inviteMutation = useMutation({
    mutationFn: (body: ShopStaffInviteBody) => shopStaffService.invite(activeShopId!, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shop-staff", activeShopId] }); toast.success("Staff member added"); setShowInvite(false) },
    onError: (e: Error) => toast.error(e.message || "Failed to add staff"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ staffId, body }: { staffId: string; body: ShopStaffUpdateBody }) => shopStaffService.update(activeShopId!, staffId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shop-staff", activeShopId] }); toast.success("Staff updated"); setEditStaff(null) },
    onError: (e: Error) => toast.error(e.message || "Failed to update staff"),
  })

  const deactivateMutation = useMutation({
    mutationFn: (staffId: string) => shopStaffService.remove(activeShopId!, staffId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shop-staff", activeShopId] }); toast.success("Staff deactivated") },
    onError: (e: Error) => toast.error(e.message || "Failed to deactivate staff"),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (staffId: string) => shopStaffService.resetPassword(activeShopId!, staffId),
    onSuccess: (result, staffId) => { const staff = data?.items.find((s) => s.id === staffId); setTempPasswordStaffName(staff?.user?.name ?? "Staff"); setTempPassword(result.temp_password) },
    onError: (e: Error) => toast.error(e.message || "Failed to reset password"),
  })

  if (mode !== "STORE_MODE") {
    return (<div className="space-y-6"><PageHeader title="Store Staff" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Staff" subtitle={data?.pagination ? `${data.pagination.total} members` : undefined}>
        <PermissionGate require="shop_staff.create"><Button size="sm" onClick={() => setShowInvite(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Staff</Button></PermissionGate>
      </PageHeader>

      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search staff..." aria-label="Search staff" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}><SelectTrigger className="h-9 w-[160px]" aria-label="Filter by role"><SelectValue placeholder="All Roles" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("SHOP_", "")}</SelectItem>)}</SelectContent></Select>
        {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load staff"} onRetry={() => refetch()} /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No staff members found</Card> : (
        <div className="space-y-2">{data.items.map((staff) => (
          <Card key={staff.id} className="p-4 flex items-center justify-between">
            <div><div className="flex items-center gap-2"><p className="font-medium text-sm">{staff.user?.name}</p>{!staff.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}</div><p className="text-xs text-muted-foreground">{staff.user?.email} · {staff.role.replace("SHOP_", "")}</p></div>
            <div className="flex items-center gap-2">
              <PermissionGate require="shop_staff.update"><Button size="sm" variant="outline" onClick={() => setEditStaff(staff)}>Edit</Button><Button size="sm" variant="outline" onClick={() => resetPasswordMutation.mutate(staff.id)} disabled={resetPasswordMutation.isPending}><Shield className="h-3.5 w-3.5 mr-1" /> Reset Password</Button></PermissionGate>
              <PermissionGate require="shop_staff.delete">{staff.is_active && <Button size="sm" variant="ghost" onClick={() => { if (confirm("Deactivate this staff member?")) deactivateMutation.mutate(staff.id) }}><UserX className="h-4 w-4 text-destructive" /></Button>}</PermissionGate>
            </div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}

      {showInvite && <InviteStaffDialog onClose={() => setShowInvite(false)} onSubmit={(body) => inviteMutation.mutate(body)} isPending={inviteMutation.isPending} />}
      {editStaff && <EditStaffDialog staff={editStaff} onClose={() => setEditStaff(null)} onSubmit={(body) => updateMutation.mutate({ staffId: editStaff.id, body })} isPending={updateMutation.isPending} />}

      {/* Temp Password Modal — shown once, never persisted client-side */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent><DialogHeader><DialogTitle>Temporary Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3"><AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" /><p className="text-sm text-amber-800 dark:text-amber-200">This password will only be shown <strong>once</strong>. Copy it now and share it securely with {tempPasswordStaffName}. It cannot be retrieved later.</p></div>
            <div className="flex items-center gap-2"><code className="flex-1 rounded-lg bg-muted px-4 py-3 font-mono text-lg tracking-wider select-all">{tempPassword}</code><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tempPassword ?? ""); toast.success("Copied to clipboard") }} className="gap-1"><Copy className="h-4 w-4" /> Copy</Button></div>
          </div>
          <DialogFooter><Button onClick={() => setTempPassword(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InviteStaffDialog({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (body: ShopStaffInviteBody) => void; isPending: boolean }) {
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<ShopStaffRole>("SHOP_STAFF")
  return (<Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader><div className="space-y-3"><div><Label htmlFor="invite-user-id">User ID</Label><Input id="invite-user-id" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Enter user ID" /></div><div><Label htmlFor="invite-role">Role</Label><Select value={role} onValueChange={(v) => setRole(v as ShopStaffRole)}><SelectTrigger id="invite-role"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("SHOP_", "")}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!userId.trim() || isPending} onClick={() => onSubmit({ user_id: userId, role, permissions: [], is_active: true })}>{isPending ? "Adding..." : "Add Staff"}</Button></DialogFooter></DialogContent></Dialog>)
}

function EditStaffDialog({ staff, onClose, onSubmit, isPending }: { staff: ShopStaff; onClose: () => void; onSubmit: (body: ShopStaffUpdateBody) => void; isPending: boolean }) {
  const [role, setRole] = useState<ShopStaffRole>(staff.role)
  const [isActive, setIsActive] = useState(staff.is_active)
  return (<Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Edit Staff — {staff.user?.name}</DialogTitle></DialogHeader><div className="space-y-3"><div><Label htmlFor="edit-role">Role</Label><Select value={role} onValueChange={(v) => setRole(v as ShopStaffRole)}><SelectTrigger id="edit-role"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("SHOP_", "")}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><input type="checkbox" id="edit-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" /><Label htmlFor="edit-active">Active</Label></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={isPending} onClick={() => onSubmit({ role, is_active: isActive })}>{isPending ? "Saving..." : "Save Changes"}</Button></DialogFooter></DialogContent></Dialog>)
}
