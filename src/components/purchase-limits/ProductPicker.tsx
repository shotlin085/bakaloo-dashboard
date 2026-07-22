"use client"

/**
 * Focused search-and-pick control for a single product — used by
 * PurchaseLimitRuleDialog when targetType === "PRODUCT".
 *
 * Modeled on the product-search half of `components/builder/LinkPicker.tsx`'s
 * `SearchPickerPopover` (this codebase has no combobox/command primitive, so
 * a Popover + search Input + result list is the established pattern), but
 * trimmed down to a single controlled id/label pair — no type selector, no
 * resolved-path parsing, no category branch. The caller already knows the
 * label up front (`rule.productName` is pre-joined by the backend), so this
 * component takes it as a prop instead of re-fetching product detail.
 */

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounce } from "@/hooks/useDebounce"
import { getProducts } from "@/services/products.service"

const RESULTS_LIMIT = 10

interface ProductPickerProps {
  /** Selected product id, or null/empty if nothing picked yet. */
  value: string | null
  /** Display label for `value` (e.g. `rule.productName`), if known. */
  valueLabel?: string | null
  onChange: (id: string, name: string) => void
  disabled?: boolean
}

export function ProductPicker({ value, valueLabel, onChange, disabled }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 250)

  // Reset the search box each time the popover closes so re-opening starts fresh.
  useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const { data, isFetching } = useQuery({
    queryKey: ["purchase-limits", "product-search", debouncedSearch],
    queryFn: () =>
      getProducts({ page: 1, limit: RESULTS_LIMIT, search: debouncedSearch, status: "active" }),
    enabled: open && debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  const results = data?.products ?? []
  const showResults = debouncedSearch.trim().length >= 2

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{valueLabel ?? (value ? value : "Search products…")}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {!showResults ? (
            <p className="p-3 text-xs text-muted-foreground">Type at least 2 characters to search.</p>
          ) : isFetching ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No products matched.</p>
          ) : (
            results.map((product) => (
              <button
                type="button"
                key={product.id}
                onClick={() => {
                  onChange(product.id, product.name)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/70"
              >
                <span className="truncate">{product.name}</span>
                {product.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
