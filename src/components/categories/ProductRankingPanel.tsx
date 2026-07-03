"use client"

/**
 * Shared drag-and-drop product ranking panel — used for both:
 *   - a BUNDLE's member products (search-and-add, then drag to order)
 *   - a STANDARD category's explicit display order (drag to reorder the
 *     products already in that category; nothing can be added here since
 *     category membership itself still comes from the product's own
 *     categoryId field, set on the product edit form)
 *
 * The seed list comes from GET /categories/:id/products (via
 * getCategoryProducts), which already reflects the exact order customers
 * currently see — dragging it and saving IS setting the new order.
 */

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2, Package, Save, Search, X } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategoryProducts } from "@/services/categories.service"
import { getProducts } from "@/services/products.service"
import { useSetCategoryProducts } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import type { Category, Product } from "@/types"

interface ProductRankingPanelProps {
  category: Category | null
  onClose: () => void
}

export function ProductRankingPanel({ category, onClose }: ProductRankingPanelProps) {
  const open = !!category
  const isBundle = category?.category_type === "BUNDLE"

  const [items, setItems] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 250)
  const shouldSearch = isBundle && debouncedSearch.trim().length >= 2

  const { data: seedProducts, isLoading } = useQuery({
    queryKey: ["categories", "products", "seed", category?.id],
    queryFn: () => getCategoryProducts(category!.id, 100),
    enabled: open,
  })

  useEffect(() => {
    setItems(seedProducts ?? [])
  }, [seedProducts])

  useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["categories", "bundle-product-search", debouncedSearch],
    queryFn: () => getProducts({ page: 1, limit: 8, search: debouncedSearch, status: "active" }),
    enabled: shouldSearch,
    staleTime: 30_000,
  })

  const setCategoryProducts = useSetCategoryProducts()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function addProduct(product: Product) {
    setItems((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]))
    setSearch("")
  }

  function removeProduct(productId: string) {
    setItems((prev) => prev.filter((p) => p.id !== productId))
  }

  function handleSave() {
    if (!category) return
    setCategoryProducts.mutate(
      { categoryId: category.id, productIds: items.map((p) => p.id) },
      { onSuccess: onClose }
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{category?.name ?? ""} — Product order</SheetTitle>
          <SheetDescription>
            {isBundle
              ? "Search to add products to this bundle, then drag to set the order customers see."
              : "Drag to set the display order for this category. Removing a product here only clears its explicit rank — it stays in the category with the default order."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {isBundle && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products to add…"
                  className="pl-8"
                />
              </div>
              {shouldSearch && (
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                    </div>
                  ) : searchResults?.products?.length ? (
                    searchResults.products.map((product) => {
                      const alreadyAdded = items.some((p) => p.id === product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addProduct(product)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="truncate">{product.name}</span>
                          {alreadyAdded ? (
                            <Badge variant="secondary" className="text-[10px]">Added</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Add</span>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <p className="p-3 text-xs text-muted-foreground">No products matched.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {isBundle ? "No products in this bundle yet — search above to add some." : "No products in this category yet."}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="rounded-lg border divide-y">
                  {items.map((product, index) => (
                    <RankableRow
                      key={product.id}
                      product={product}
                      rank={index + 1}
                      onRemove={() => removeProduct(product.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setCategoryProducts.isPending}>
            {setCategoryProducts.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save order
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function RankableRow({
  product,
  rank,
  onRemove,
}: {
  product: Product
  rank: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 bg-background"
    >
      <button
        type="button"
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </button>
      <Badge variant="outline" className="w-7 justify-center shrink-0 font-mono text-[10px]">
        {rank}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">₹{product.price}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${product.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
