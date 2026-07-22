"use client"

/**
 * Multi-select pickers for a coupon's "applies to" scope
 * (applicable_category_ids / applicable_product_ids) — CouponDialog renders
 * one or the other depending on the chosen scope mode.
 *
 * CategoryScopePicker lists STANDARD categories and BUNDLE categories
 * together (bundles are just categories with category_type: "BUNDLE" —
 * see 066_category_bundles_and_ranking.sql — so a coupon can restrict
 * itself to a bundle by picking it here exactly like an ordinary
 * category, no separate "bundle" concept needed on this screen).
 * Subcategories need no special handling either — they're plain rows in
 * the same categories list, distinguished only by having a parent.
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCategories, useBundles } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { getProducts } from "@/services/products.service"

interface CategoryScopePickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function CategoryScopePicker({ selectedIds, onChange }: CategoryScopePickerProps) {
  const [open, setOpen] = useState(false)
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: bundles, isLoading: loadingBundles } = useBundles()

  const options = [
    ...(categories ?? []).map((c) => ({ id: c.id, name: c.name, kind: "Category" as const })),
    ...(bundles ?? []).map((b) => ({ id: b.id, name: b.name, kind: "Bundle" as const })),
  ]
  const selectedSet = new Set(selectedIds)
  const selectedOptions = options.filter((o) => selectedSet.has(o.id))

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate text-muted-foreground">
              {selectedOptions.length > 0 ? `${selectedOptions.length} selected` : "Choose categories or bundles…"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="max-h-72 overflow-y-auto p-1">
            {loadingCategories || loadingBundles ? (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : options.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No categories or bundles found.</p>
            ) : (
              options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/70"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{o.name}</span>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                      {o.kind}
                    </Badge>
                  </span>
                  {selectedSet.has(o.id) && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              {o.name}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

interface ProductScopePickerProps {
  selected: { id: string; name: string }[]
  onChange: (next: { id: string; name: string }[]) => void
}

const RESULTS_LIMIT = 10

export function ProductScopePicker({ selected, onChange }: ProductScopePickerProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 250)

  const { data, isFetching } = useQuery({
    queryKey: ["coupon-scope", "product-search", debouncedSearch],
    queryFn: () => getProducts({ page: 1, limit: RESULTS_LIMIT, search: debouncedSearch, status: "active" }),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  const selectedIds = new Set(selected.map((s) => s.id))
  const results = (data?.products ?? []).filter((p) => !selectedIds.has(p.id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {debouncedSearch.trim().length >= 2 && (
        <div className="rounded-md border bg-card max-h-40 overflow-y-auto">
          {isFetching ? (
            <div className="p-2.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="p-2.5 text-sm text-muted-foreground">No matching products</p>
          ) : (
            results.map((p) => (
              <button
                type="button"
                key={p.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                onClick={() => {
                  onChange([...selected, { id: p.id, name: p.name }])
                  setSearch("")
                }}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s.id !== p.id))}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
