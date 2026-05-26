"use client"

/**
 * Store Coupons — task 21.9
 * List, create, edit, delete consuming /api/v1/admin/coupons
 * with shop_id forced to active shop for SHOP_COUPON.
 */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Search, Trash2 } from "lucide-react"
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
import api from "@/lib/api"
import type { ApiResponse, Paginated } from "@/types"
import { formatCurrency } from "@/lib/i18n"

const PAGE_SIZE = 20

interface Coupon { id: string; code: string; type: "PERCENTAGE" | "FIXED"; value: number; min_order_amount: number | null; max_discount: number | null; usage_limit: number | null; used_count: number; is_active: boolean; shop_id: string | null; expires_at: string | null; created_at: string }

export default function StoreCouponsPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["store-coupons", activeShopId, { page, search: debouncedSearch }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE, shop_id: activeShopId! }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const { data } = await api.get<ApiResponse<{ items: Coupon[]; total: number; page: number; limit: number }>>("/admin/coupons", { params })
      const p = data.data
      return { items: p.items, pagination: { page: p.page, limit: p.limit, total: p.total, totalPages: Math.ceil(p.total / p.limit) } } as Paginated<Coupon>
    },
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["store-coupons", activeShopId] }); toast.success("Coupon deleted") },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  })

  if (mode !== "STORE_MODE") { return (<div className="space-y-6"><PageHeader title="Store Coupons" subtitle="Select a shop" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>) }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Coupons" subtitle={data?.pagination ? `${data.pagination.total} coupons` : undefined}><PermissionGate require="shop_coupons.create"><Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Create Coupon</Button></PermissionGate></PageHeader>
      <Card className="p-4"><div className="flex items-center gap-3"><div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search coupons..." aria-label="Search coupons" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>{isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}</div></Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load"} onRetry={() => refetch()} /> : isLoading ? (<div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No coupons found</Card> : (
        <div className="space-y-2">{data.items.map((c) => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div><div className="flex items-center gap-2"><code className="font-mono font-semibold text-sm">{c.code}</code>{!c.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}</div><p className="text-xs text-muted-foreground">{c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatCurrency(c.value)} off`} · Used {c.used_count}/{c.usage_limit ?? "∞"}</p></div>
            <PermissionGate require="shop_coupons.delete"><Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this coupon?")) deleteMutation.mutate(c.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button></PermissionGate>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (<div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>)}
      {showCreate && <CreateCouponDialog shopId={activeShopId!} onClose={() => setShowCreate(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["store-coupons", activeShopId] }); setShowCreate(false) }} />}
    </div>
  )
}

function CreateCouponDialog({ shopId, onClose, onSuccess }: { shopId: string; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState(""); const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE"); const [value, setValue] = useState(""); const [minOrder, setMinOrder] = useState(""); const [usageLimit, setUsageLimit] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async () => { if (!code.trim() || !value) return; setIsSubmitting(true); try { await api.post("/admin/coupons", { code: code.trim().toUpperCase(), type, value: Number(value), min_order_amount: minOrder ? Number(minOrder) : null, usage_limit: usageLimit ? Number(usageLimit) : null, shop_id: shopId, is_active: true }); toast.success("Coupon created"); onSuccess() } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed") } finally { setIsSubmitting(false) } }
  return (<Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader><div className="space-y-3"><div><Label htmlFor="c-code">Code</Label><Input id="c-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE20" /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="c-type">Type</Label><Select value={type} onValueChange={(v) => setType(v as "PERCENTAGE" | "FIXED")}><SelectTrigger id="c-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERCENTAGE">Percentage</SelectItem><SelectItem value="FIXED">Fixed</SelectItem></SelectContent></Select></div><div><Label htmlFor="c-val">Value</Label><Input id="c-val" type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="c-min">Min Order</Label><Input id="c-min" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Optional" /></div><div><Label htmlFor="c-lim">Usage Limit</Label><Input id="c-lim" type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" /></div></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!code.trim() || !value || isSubmitting} onClick={handleSubmit}>{isSubmitting ? "Creating..." : "Create"}</Button></DialogFooter></DialogContent></Dialog>)
}
