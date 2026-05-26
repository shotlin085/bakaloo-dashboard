"use client"

/**
 * Store Inventory — task 21.5
 * Per-shop stock with adjust-stock dialog and bulk-price-update action.
 * Low-stock badge with 60s refresh polling.
 */

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, DollarSign, Loader2, Package, Search } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyShopState } from "@/components/shared/empty-shop-state"
import { ErrorBlock } from "@/components/shared/error-block"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { shopInventoryService, type ShopInventoryItem, type ShopInventoryListParams } from "@/services/shop-inventory.service"
import { formatCurrency } from "@/lib/i18n"

const PAGE_SIZE = 20

export default function StoreInventoryPage() {
  const { activeShopId, mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ShopInventoryItem | null>(null)
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [showBulkPrice, setShowBulkPrice] = useState(false)
  const debouncedSearch = useDebounce(searchInput, 300)

  const filters = useMemo<ShopInventoryListParams>(() => {
    const params: ShopInventoryListParams = { page, limit: PAGE_SIZE }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    if (lowStockOnly) params.low_stock = true
    return params
  }, [page, debouncedSearch, lowStockOnly])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["shop-inventory", activeShopId, filters],
    queryFn: () => shopInventoryService.list(filters),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const { data: lowStockCount } = useQuery({
    queryKey: ["shop-inventory-low-stock", activeShopId],
    queryFn: () => shopInventoryService.getLowStockCount(),
    enabled: mode === "STORE_MODE" && !!activeShopId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const adjustMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) => shopInventoryService.adjustStock(productId, quantity, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shop-inventory", activeShopId] }); toast.success("Stock adjusted"); setAdjustItem(null); setAdjustQty(""); setAdjustReason("") },
    onError: (e: Error) => toast.error(e.message || "Failed to adjust stock"),
  })

  if (mode !== "STORE_MODE") {
    return (<div className="space-y-6"><PageHeader title="Store Inventory" subtitle="Select a shop to manage inventory" /><EmptyShopState isSuperAdmin={isSuperAdmin} /></div>)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Inventory" subtitle={data?.pagination ? `${data.pagination.total} items` : undefined}>
        {(lowStockCount ?? 0) > 0 && <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {lowStockCount} Low Stock</Badge>}
        <Link href="/store/inventory/movements"><Button variant="outline" size="sm">Stock Movements</Button></Link>
      </PageHeader>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="Search inventory..." aria-label="Search inventory" className="h-9 pl-9" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} /></div>
          <Button variant={lowStockOnly ? "default" : "outline"} size="sm" onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1) }} className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Low Stock</Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkPrice(true)} className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Bulk Price Update</Button>
          {isFetching && !isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </Card>

      {isError ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load inventory"} onRetry={() => refetch()} /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !data?.items?.length ? <Card className="p-8 text-center text-muted-foreground">No inventory items found</Card> : (
        <div className="space-y-2">{data.items.map((item) => (
          <Card key={item.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.product_image ? <img src={item.product_image} alt={item.product_name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
              <div><p className="font-medium text-sm">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.product_sku} · {formatCurrency(item.price)}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={item.stock_quantity <= item.low_stock_threshold ? "destructive" : "secondary"}>{item.stock_quantity} in stock</Badge>
              <Button size="sm" variant="outline" onClick={() => setAdjustItem(item)}>Adjust</Button>
            </div>
          </Card>
        ))}</div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      )}

      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock — {adjustItem?.product_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current stock: {adjustItem?.stock_quantity}</p>
          <div className="space-y-3"><div><Label htmlFor="adjust-qty">Quantity Change (+ or -)</Label><Input id="adjust-qty" type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="+10 or -5" /></div><div><Label htmlFor="adjust-reason">Reason</Label><Input id="adjust-reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason for adjustment" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button><Button disabled={!adjustQty || !adjustReason.trim() || adjustMutation.isPending} onClick={() => adjustItem && adjustMutation.mutate({ productId: adjustItem.id, quantity: Number(adjustQty), reason: adjustReason })}>{adjustMutation.isPending ? "Adjusting..." : "Adjust Stock"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkPriceDialog open={showBulkPrice} onClose={() => setShowBulkPrice(false)} shopId={activeShopId!} />
    </div>
  )
}

function BulkPriceDialog({ open, onClose, shopId }: { open: boolean; onClose: () => void; shopId: string }) {
  const queryClient = useQueryClient()
  const [updates, setUpdates] = useState<Array<{ id: string; price: string; sale_price: string }>>([{ id: "", price: "", sale_price: "" }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const valid = updates.filter((u) => u.id.trim() && u.price)
    if (valid.length === 0) return
    setIsSubmitting(true)
    try {
      await shopInventoryService.bulkUpdatePrice(valid.map((u) => ({ id: u.id, price: Number(u.price), sale_price: u.sale_price ? Number(u.sale_price) : null })))
      queryClient.invalidateQueries({ queryKey: ["shop-inventory", shopId] })
      toast.success(`${valid.length} prices updated`)
      onClose()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to update prices") } finally { setIsSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk Price Update</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-60 overflow-y-auto">{updates.map((u, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <Input placeholder="Product ID" value={u.id} onChange={(e) => { const n = [...updates]; n[i].id = e.target.value; setUpdates(n) }} />
            <Input type="number" placeholder="Price" value={u.price} onChange={(e) => { const n = [...updates]; n[i].price = e.target.value; setUpdates(n) }} />
            <Input type="number" placeholder="Sale Price" value={u.sale_price} onChange={(e) => { const n = [...updates]; n[i].sale_price = e.target.value; setUpdates(n) }} />
          </div>
        ))}</div>
        <Button variant="outline" size="sm" onClick={() => setUpdates([...updates, { id: "", price: "", sale_price: "" }])}>+ Add Row</Button>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={isSubmitting} onClick={handleSubmit}>{isSubmitting ? "Updating..." : "Update Prices"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
