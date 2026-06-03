"use client"

/**
 * AttachExistingProductForm — Search existing products and attach them to a family.
 * Shows product status (no family, already in this family, already in another family).
 */

import { useState } from "react"
import Image from "next/image"
import { Check, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/useDebounce"
import { useProducts } from "@/hooks/useProducts"
import type { Product } from "@/types"

import { OptionEditorForm } from "./option-editor-form"

interface AttachExistingProductFormProps {
  familyId: string
  familyName: string
  onAttached: () => void
}

export function AttachExistingProductForm({
  familyId,
  familyName,
  onAttached,
}: AttachExistingProductFormProps) {
  const [search, setSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useProducts({
    search: debouncedSearch || undefined,
    limit: 50,
    status: "active",
  })

  const products = data?.products ?? []

  const handleSelectProduct = (product: Product) => {
    // Already in this family - do nothing
    if (product.product_family_id === familyId) {
      return
    }
    // Already in another family - blocked
    if (product.product_family_id && product.product_family_id !== familyId) {
      return
    }
    // Available to attach
    setSelectedProduct(product)
  }

  const handleBackToSearch = () => {
    setSelectedProduct(null)
  }

  if (selectedProduct) {
    return (
      <OptionEditorForm
        product={selectedProduct}
        familyId={familyId}
        familyName={familyName}
        onSuccess={() => {
          setSelectedProduct(null)
          onAttached()
        }}
        onCancel={handleBackToSearch}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 border rounded-md px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search existing products..."
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSearch("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No products found" : "Start typing to search products"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const inThisFamily = product.product_family_id === familyId
              const inAnotherFamily =
                product.product_family_id &&
                product.product_family_id !== familyId
              const canAttach = !product.product_family_id

              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    canAttach
                      ? "hover:bg-muted/50 cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => canAttach && handleSelectProduct(product)}
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {product.thumbnail_url ? (
                      <Image
                        src={product.thumbnail_url}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {product.name}
                      </p>
                      {!product.is_active && (
                        <Badge variant="outline" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {product.option_label && (
                        <span className="text-xs text-muted-foreground">
                          {product.option_label}
                        </span>
                      )}
                      {product.net_quantity && !product.option_label && (
                        <span className="text-xs text-muted-foreground">
                          {product.net_quantity}
                        </span>
                      )}
                      {product.unit && (
                        <span className="text-xs text-muted-foreground">
                          {product.unit}
                        </span>
                      )}
                      <span className="text-xs font-medium">
                        ₹{product.sale_price ?? product.price}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {inThisFamily ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Check className="h-3 w-3" />
                        Already added
                      </Badge>
                    ) : inAnotherFamily ? (
                      <Badge variant="outline" className="text-[10px]">
                        In {product.family_name || "another family"}
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline">
                        Attach
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
