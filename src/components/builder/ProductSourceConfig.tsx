"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Product } from "@/types"
import { getProducts } from "@/services/products.service"
import { useDebounce } from "@/hooks/useDebounce"
import type {
  MerchBinding,
  UpdateSectionMerchPayload,
} from "@/types/theme.types"
import CategoryTree from "./CategoryTree"

interface ProductSourceConfigProps {
  merchBinding: MerchBinding | null
  onBindingChange: (binding: UpdateSectionMerchPayload) => void
}

function normalizeMerchBinding(binding: MerchBinding | null) {
  return {
    source: binding?.source ?? "category",
    category_ids: binding?.category_ids ?? [],
    product_ids: binding?.product_ids ?? [],
    tags: binding?.tags ?? [],
    limit: binding?.limit ?? 12,
  }
}

function buildSummary(binding: ReturnType<typeof normalizeMerchBinding>) {
  switch (binding.source) {
    case "tag":
      return `${binding.limit} products from ${binding.tags.length} tags`
    case "manual":
      return `${binding.product_ids.length} manually selected products`
    case "category":
    default:
      return `${binding.limit} products from ${binding.category_ids.length} categories`
  }
}

export default function ProductSourceConfig({
  merchBinding,
  onBindingChange,
}: ProductSourceConfigProps) {
  const binding = useMemo(
    () => normalizeMerchBinding(merchBinding),
    [merchBinding]
  )
  const [tagInput, setTagInput] = useState(binding.tags.join(", "))
  const [productSearch, setProductSearch] = useState("")
  const debouncedSearch = useDebounce(productSearch, 250)
  const shouldSearch = debouncedSearch.trim().length >= 2
  const [knownProducts, setKnownProducts] = useState<Record<string, Product>>({})

  const { data, isFetching } = useQuery({
    queryKey: ["builder", "product-search", debouncedSearch],
    queryFn: () =>
      getProducts({
        page: 1,
        limit: 8,
        search: debouncedSearch,
        status: "active",
      }),
    enabled: shouldSearch,
    staleTime: 30_000,
  })

  useEffect(() => {
    setTagInput(binding.tags.join(", "))
  }, [binding.tags])

  useEffect(() => {
    if (!data?.products?.length) return

    setKnownProducts((current) => {
      const next = { ...current }
      data.products.forEach((product) => {
        next[product.id] = product
      })
      return next
    })
  }, [data?.products])

  const patchBinding = (patch: UpdateSectionMerchPayload) => {
    onBindingChange({
      category_ids: binding.category_ids,
      product_ids: binding.product_ids,
      tags: binding.tags,
      limit: binding.limit,
      source: binding.source,
      ...patch,
    })
  }

  const selectedProducts = binding.product_ids.map((productId) => ({
    id: productId,
    name: knownProducts[productId]?.name ?? productId,
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Product Source</Label>
        <RadioGroup
          value={binding.source}
          onValueChange={(value) =>
            patchBinding({ source: value as MerchBinding["source"] })
          }
          className="grid gap-3 md:grid-cols-3"
        >
          {[
            {
              value: "category",
              label: "By Category",
              description: "Fill products from one or more categories.",
            },
            {
              value: "tag",
              label: "By Tag",
              description: "Use comma-separated tags as the merch source.",
            },
            {
              value: "manual",
              label: "Manual Pick",
              description: "Hand-pick products in the exact order you want.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:border-slate-300"
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {option.label}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {binding.source === "category" ? (
        <CategoryTree
          selectedIds={binding.category_ids}
          onSelect={(categoryId) =>
            patchBinding({
              category_ids: binding.category_ids.includes(categoryId)
                ? binding.category_ids.filter((id) => id !== categoryId)
                : [...binding.category_ids, categoryId],
            })
          }
        />
      ) : null}

      {binding.source === "tag" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <Label htmlFor="builder-tag-input">Tags</Label>
            <Input
              id="builder-tag-input"
              value={tagInput}
              onChange={(event) => {
                const next = event.target.value
                setTagInput(next)
                patchBinding({
                  tags: next
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }}
              placeholder="festive, diwali"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {binding.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-2">
                #{tag}
                <button
                  type="button"
                  onClick={() =>
                    patchBinding({
                      tags: binding.tags.filter((value) => value !== tag),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {binding.source === "manual" ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <Label htmlFor="manual-product-search">Product Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="manual-product-search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search by product name, SKU, or barcode"
                className="pl-10"
              />
            </div>
          </div>

          {shouldSearch ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60">
              {isFetching ? (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching products...
                </div>
              ) : data?.products?.length ? (
                <div className="divide-y divide-slate-200">
                  {data.products.map((product) => {
                    const alreadyAdded = binding.product_ids.includes(product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={alreadyAdded}
                        onClick={() => {
                          patchBinding({
                            product_ids: [...binding.product_ids, product.id],
                          })
                          setProductSearch("")
                        }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {product.name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {product.category_name ?? "Uncategorized"}
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <Badge variant="secondary">Added</Badge>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 text-sm text-slate-500">
                  No active products matched this search.
                </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {selectedProducts.length ? (
              selectedProducts.map((product) => (
                <Badge key={product.id} variant="secondary" className="gap-2">
                  {product.name}
                  <button
                    type="button"
                    onClick={() =>
                      patchBinding({
                        product_ids: binding.product_ids.filter(
                          (value) => value !== product.id
                        ),
                      })
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
                No manual products selected yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="merch-limit">Product Limit</Label>
          <span className="text-sm font-medium text-slate-600">
            {binding.limit}
          </span>
        </div>
        <Input
          id="merch-limit"
          type="range"
          min={4}
          max={50}
          step={1}
          value={binding.limit}
          onChange={(event) =>
            patchBinding({ limit: Number(event.target.value) || 12 })
          }
          className="h-3 cursor-pointer rounded-full border-0 bg-transparent px-0 shadow-none"
        />
        <div className="text-sm text-slate-500">{buildSummary(binding)}</div>
      </div>
    </div>
  )
}
