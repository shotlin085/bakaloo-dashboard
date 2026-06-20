"use client"

/**
 * Master Catalog view — extracted from the original `/products` page body.
 *
 * Task 12.5 introduced a Tabs control on `/products` that exposes two
 * surfaces side-by-side:
 *   - Master Catalog (this view) — the super-admin-managed list of every
 *     product in the catalog, with the existing import/export, bulk
 *     actions, table/grid toggle, and inline stock editor untouched.
 *   - Shop Products — the per-shop inventory view from §8, embedded.
 *
 * The render tree below is the original `ProductsPage` body verbatim. It
 * was lifted into a sibling component so the parent route can render it
 * inside a `<TabsContent>` panel without rewriting any of its internals.
 *
 * Requirements: 10.7 (Master Catalog branch of the products tab control)
 */

import { useState, useMemo, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Power,
  PowerOff,
} from "lucide-react"
import {
  useProducts,
  useDeleteProduct,
  useDuplicateProduct,
  useExportProducts,
  useBulkUpdateProducts,
} from "@/hooks/useProducts"
import { Checkbox } from "@/components/ui/checkbox"
import { useCategories } from "@/hooks/useCategories"
import type { ProductFilters } from "@/types"
import { formatINR } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import { InlineStockEdit } from "@/components/products/InlineStockEdit"
import { BulkImportDialog } from "@/components/products/BulkImportDialog"
import { usePermissions } from "@/hooks/usePermissions"

type ViewMode = "table" | "grid"

export function MasterCatalogView() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all_categories")
  const [status, setStatus] = useState<ProductFilters["status"]>("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [viewMode, setViewMode] = useState<ViewMode>("table")

  const [showImport, setShowImport] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const debouncedSearch = useDebounce(search, 400)
  const { can } = usePermissions()
  const canManage = can("products.manage")

  const filters: ProductFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      category: category !== "all_categories" ? category : undefined,
      status: status || undefined,
    }),
    [page, limit, debouncedSearch, category, status],
  )

  const { data, isLoading } = useProducts(filters)
  const { data: categories } = useCategories()
  const deleteProduct = useDeleteProduct()
  const duplicateProduct = useDuplicateProduct()
  const exportProducts = useExportProducts()
  const bulkUpdate = useBulkUpdateProducts()

  const products = data?.products ?? []
  const pagination = data?.pagination

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)))
    }
  }

  const clearFilters = useCallback(() => {
    setSearch("")
    setCategory("all_categories")
    setStatus("")
    setPage(1)
  }, [])

  const getStockBadge = (stock: number, threshold: number) => {
    if (stock === 0)
      return (
        <Badge variant="destructive" className="text-[10px]">
          Out of Stock
        </Badge>
      )
    if (stock <= threshold)
      return (
        <Badge
          variant="outline"
          className="text-[10px] border-amber-300 text-amber-600"
        >
          <AlertTriangle className="h-3 w-3 mr-0.5" />
          Low
        </Badge>
      )
    return (
      <Badge
        variant="outline"
        className="text-[10px] border-green-300 text-green-600"
      >
        In Stock
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar — Import / Export / Add product. The page-level title
          lives in the Tabs parent so this view only renders the action row
          aligned trailing-edge. */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportProducts.mutate("csv")}
                disabled={exportProducts.isPending}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
              <Link href="/products/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Product
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search products"
              placeholder="Search by name, SKU, barcode..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_categories">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status || "all_status"}
            onValueChange={(v) => {
              setStatus(v === "all_status" ? "" : (v as ProductFilters["status"]))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_status">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_sale">On Sale</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="ml-auto flex items-center border rounded-md">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg animate-fade-in">
          <CheckSquare className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium">
            {selectedIds.size} product(s) selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                bulkUpdate.mutate(
                  Array.from(selectedIds).map((id) => ({
                    id,
                    is_active: true,
                  })),
                  { onSuccess: () => setSelectedIds(new Set()) },
                )
              }
              disabled={bulkUpdate.isPending}
            >
              <Power className="h-3.5 w-3.5 mr-1" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                bulkUpdate.mutate(
                  Array.from(selectedIds).map((id) => ({
                    id,
                    is_active: false,
                  })),
                  { onSuccess: () => setSelectedIds(new Set()) },
                )
              }
              disabled={bulkUpdate.isPending}
            >
              <PowerOff className="h-3.5 w-3.5 mr-1" />
              Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} product(s)?`)) {
                  Array.from(selectedIds).forEach((id) =>
                    deleteProduct.mutate(id),
                  )
                  setSelectedIds(new Set())
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        viewMode === "table" ? (
          <TableSkeleton />
        ) : (
          <GridSkeleton />
        )
      ) : products.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No products found</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      products.length > 0 &&
                      selectedIds.size === products.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {p.thumbnail_url ? (
                          <Image
                            src={p.thumbnail_url}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku && `SKU: ${p.sku}`}
                          {p.sku && p.unit && " · "}
                          {p.unit}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.category_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="text-sm font-medium">
                        {formatINR(p.sale_price ?? p.price)}
                      </span>
                      {p.sale_price && p.sale_price < (p.price ?? 0) && (
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          {formatINR(p.price ?? 0)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <InlineStockEdit
                        productId={p.id}
                        currentStock={p.stock_quantity}
                        lowStockThreshold={p.low_stock_threshold}
                      />
                      {getStockBadge(p.stock_quantity, p.low_stock_threshold)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge className="text-[10px] bg-green-50 text-green-600 border-0 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                    {p.is_featured && (
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-1 border-amber-300 text-amber-600"
                      >
                        Featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${p.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateProduct.mutate(p.id)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteProduct.mutate(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-muted">
                {p.thumbnail_url ? (
                  <Image
                    src={p.thumbnail_url}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {/* Hover actions */}
                {canManage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/products/${p.id}/edit`}>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => duplicateProduct.mutate(p.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {/* Status badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {!p.is_active && (
                    <Badge variant="secondary" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                  {p.is_featured && (
                    <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600">
                      Featured
                    </Badge>
                  )}
                  {p.stock_quantity === 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      Out of Stock
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {p.category_name ?? "Uncategorized"}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-sm font-bold">
                      {formatINR(p.sale_price ?? p.price)}
                    </span>
                    {p.sale_price && p.sale_price < p.price && (
                      <span className="text-[10px] text-muted-foreground line-through ml-1">
                        {formatINR(p.price)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Stock: {p.stock_quantity}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} products
            </p>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= pagination.totalPages - 3) {
                  pageNum = pagination.totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Dialog */}
      <BulkImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-14 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-10 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
