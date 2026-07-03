"use client"

/**
 * Shared "link to something" picker for the theme builder — search-and-pick
 * a product or category (categories and bundles shown together, since a
 * bundle is just a category_type: "BUNDLE" category under the hood), or a
 * plain URL. Built on the existing Popover primitive since no
 * combobox/command component exists yet in this codebase.
 *
 * Two ways to use it:
 *   - `LinkPicker` — a complete control (type selector + search) for
 *     widgets that have no linking today (Animated Banner, Custom Banner,
 *     Promo Carousel). Works in terms of a resolved PATH STRING
 *     (`/product/:id`, `/categories/:id/products`, or a raw URL) because
 *     that's exactly what `config.link_url` already means to the Flutter
 *     app (see section_registry.dart's `_readString(entry.config['link_url'])`)
 *     — no app changes needed.
 *   - `LinkValuePicker` — just the search-and-pick half, for a single type,
 *     with a RAW ID (not a resolved path) — used inside Seasonal Mosaic's
 *     TileActionEditor, which already has its own type selector (including
 *     mosaic-only types like "tab"/"app_page") and expects `TileAction.value`
 *     to be a raw product/category id, resolved app-side by its own
 *     `switch (action.type)`.
 */

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCategories, useBundles } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { getProducts, getProductDetail } from "@/services/products.service"

export type LinkTargetType = "none" | "product" | "category" | "url"

const RESULTS_PAGE_SIZE = 10

// ─────────────────────────────────────────────────────────────────────────
// Path string <-> {type, id} — the vocabulary Flutter already understands
// for config.link_url (see section_registry.dart's `_resolveBannerTarget`).
// ─────────────────────────────────────────────────────────────────────────

function pathToTypeAndId(path: string): { type: LinkTargetType; id: string } {
  if (!path) return { type: "none", id: "" }
  const productMatch = path.match(/^\/product\/(.+)$/)
  if (productMatch) return { type: "product", id: productMatch[1] }
  const categoryMatch = path.match(/^\/categories\/([^/]+)\/products$/)
  if (categoryMatch) return { type: "category", id: categoryMatch[1] }
  return { type: "url", id: path }
}

function typeAndIdToPath(type: LinkTargetType, id: string): string {
  if (!id) return ""
  if (type === "product") return `/product/${id}`
  if (type === "category") return `/categories/${id}/products`
  return id
}

/** Resolve a human-readable label for an existing product/category id. */
function useResolvedLabel(type: LinkTargetType, id: string) {
  const { data: product } = useQuery({
    queryKey: ["link-picker", "product", id],
    queryFn: () => getProductDetail(id),
    enabled: type === "product" && !!id,
    staleTime: 60_000,
  })
  const { data: categories } = useCategories()
  const { data: bundles } = useBundles()

  if (type === "product") return product?.name ?? null
  if (type === "category") {
    const match = [...(bundles ?? []), ...(categories ?? [])].find((c) => c.id === id)
    return match ? `${match.category_type === "BUNDLE" ? "🎁 " : ""}${match.name}` : null
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Core search-and-pick popover — shared by both exported components.
// ─────────────────────────────────────────────────────────────────────────

function SearchPickerPopover({
  type,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
}: {
  type: "product" | "category"
  selectedId: string
  selectedLabel: string | null
  onSelect: (id: string, label: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 250)
  const [page, setPage] = useState(1)
  const [productResults, setProductResults] = useState<{ id: string; name: string }[]>([])
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE)

  useEffect(() => {
    if (!open) return
    setPage(1)
    setProductResults([])
    setVisibleCount(RESULTS_PAGE_SIZE)
  }, [open, debouncedSearch])

  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: bundles } = useBundles()

  const { data: productPage, isFetching: productsFetching } = useQuery({
    queryKey: ["link-picker", "product-search", debouncedSearch, page],
    queryFn: () => getProducts({ page, limit: RESULTS_PAGE_SIZE, search: debouncedSearch, status: "active" }),
    enabled: type === "product" && open && debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!productPage) return
    setProductResults((prev) => (page === 1 ? productPage.products : [...prev, ...productPage.products]))
  }, [productPage, page])

  const categoryResults =
    type === "category"
      ? [...(bundles ?? []), ...(categories ?? [])].filter((c) =>
          c.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
        )
      : []
  const visibleCategoryResults = categoryResults.slice(0, visibleCount)
  const hasMoreCategoryResults = categoryResults.length > visibleCategoryResults.length
  const hasMoreProductResults = !!productPage && page < productPage.pagination.totalPages
  const showResults = debouncedSearch.trim().length >= 2 || type === "category"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedLabel ?? (selectedId ? selectedId : `Search ${type === "product" ? "products" : "categories"}…`)}
          </span>
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
              placeholder={type === "product" ? "Search products…" : "Search categories…"}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {type === "product" ? (
            !showResults ? (
              <p className="p-3 text-xs text-muted-foreground">Type at least 2 characters to search.</p>
            ) : productsFetching && page === 1 ? (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            ) : productResults.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No products matched.</p>
            ) : (
              <>
                {productResults.map((product) => (
                  <ResultRow
                    key={product.id}
                    label={product.name}
                    selected={product.id === selectedId}
                    onClick={() => {
                      onSelect(product.id, product.name)
                      setOpen(false)
                    }}
                  />
                ))}
                {hasMoreProductResults && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    disabled={productsFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {productsFetching ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : null}
                    See more
                  </Button>
                )}
              </>
            )
          ) : categoriesLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : categoryResults.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No categories matched.</p>
          ) : (
            <>
              {visibleCategoryResults.map((category) => (
                <ResultRow
                  key={category.id}
                  label={`${category.category_type === "BUNDLE" ? "🎁 " : ""}${category.name}`}
                  selected={category.id === selectedId}
                  onClick={() => {
                    onSelect(category.id, `${category.category_type === "BUNDLE" ? "🎁 " : ""}${category.name}`)
                    setOpen(false)
                  }}
                />
              ))}
              {hasMoreCategoryResults && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-xs"
                  onClick={() => setVisibleCount((c) => c + RESULTS_PAGE_SIZE)}
                >
                  See more
                </Button>
              )}
            </>
          )}
        </div>
        {selectedId && (
          <div className="border-t p-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ResultRow({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/70"
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LinkValuePicker — raw-id mode, for Seasonal Mosaic's TileActionEditor
// (which already has its own type selector).
// ─────────────────────────────────────────────────────────────────────────

export function LinkValuePicker({
  type,
  value,
  onChange,
}: {
  type: "product" | "category" | "url"
  value: string | null
  onChange: (value: string | null) => void
}) {
  const label = useResolvedLabel(type === "url" ? "none" : type, value ?? "")

  if (type === "url") {
    return (
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="https://example.com"
      />
    )
  }

  return (
    <SearchPickerPopover
      type={type}
      selectedId={value ?? ""}
      selectedLabel={label}
      onSelect={(id) => onChange(id)}
      onClear={() => onChange(null)}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LinkPicker — full control (type selector + search), resolved-path mode.
// ─────────────────────────────────────────────────────────────────────────

export function LinkPicker({
  value,
  onChange,
}: {
  /** A resolved path/URL string, e.g. what's stored in config.link_url. */
  value: string
  onChange: (value: string) => void
}) {
  const parsed = pathToTypeAndId(value)

  // BUG THIS FIXES: the persisted `value` is a plain string, and an empty
  // string always parses back to type "none" (pathToTypeAndId has no way
  // to represent "type is category, but nothing picked yet" — there's no
  // path for that). Switching the dropdown to "Open product"/"Open
  // category"/"Open URL" has nothing to persist until a search result (or
  // URL) is actually chosen, so writing "" immediately on type-switch made
  // the very next render re-derive type "none" from that empty value and
  // snap the dropdown straight back to "No link" — every click looked like
  // it silently failed. `pendingType` holds the just-picked type locally
  // until there's real content to persist.
  const [pendingType, setPendingType] = useState<LinkTargetType | null>(null)
  useEffect(() => {
    if (parsed.type !== "none") setPendingType(null)
  }, [value, parsed.type])

  const effectiveType = value ? parsed.type : (pendingType ?? "none")
  const effectiveId = parsed.type === effectiveType ? parsed.id : ""
  const label = useResolvedLabel(effectiveType, effectiveId)

  const setType = (nextType: LinkTargetType) => {
    if (nextType === "none") {
      setPendingType(null)
      onChange("")
      return
    }
    setPendingType(nextType)
    if (nextType === "url" && parsed.type !== "url") {
      // Nothing to persist yet — wait for the admin to type a URL. Clear
      // any stale product/category value from a previous type.
      onChange("")
    }
  }

  return (
    <div className="space-y-2">
      <Select value={effectiveType} onValueChange={(v) => setType(v as LinkTargetType)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No link</SelectItem>
          <SelectItem value="product">Open product</SelectItem>
          <SelectItem value="category">Open category</SelectItem>
          <SelectItem value="url">Open URL</SelectItem>
        </SelectContent>
      </Select>

      {effectiveType === "url" && (
        <Input
          value={effectiveId}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
        />
      )}

      {(effectiveType === "product" || effectiveType === "category") && (
        <SearchPickerPopover
          type={effectiveType}
          selectedId={effectiveId}
          selectedLabel={effectiveId ? label : null}
          onSelect={(pickedId) => {
            onChange(typeAndIdToPath(effectiveType, pickedId))
            setPendingType(null)
          }}
          onClear={() => {
            onChange("")
            setPendingType(null)
          }}
        />
      )}

      {effectiveType !== "none" && effectiveId && (
        <Badge variant="outline" className="text-[10px] font-mono truncate max-w-full">
          {value}
        </Badge>
      )}
    </div>
  )
}
