"use client"

/**
 * ShopSwitcher — unified shop switching component for both HQ and store users.
 *
 * HQ users (Super_Admin):
 *   Lists all active shops + "All Shops" option. Calls `selectShop(shopId)`
 *   and clears TanStack caches on selection.
 *
 * Store users (vendor/staff):
 *   Lists only the user's assigned shops. No "All Shops" option. Calls
 *   `selectShop(shopId)` and clears TanStack caches on selection.
 *
 * This component extends the existing `shop-switcher.tsx` pattern to support
 * both user types in a single unified interface.
 *
 * Tasks: 17.2
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Search, Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDebounce } from "@/hooks/useDebounce"
import { useMyShops } from "@/hooks/useMyShops"
import { useActiveShopsForSwitcher } from "@/hooks/useShops"
import { useShopContext } from "@/hooks/useShopContext"
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions"
import { ROLE_DEFAULTS, type PermissionToken } from "@/lib/permissions"
import { isShopScopedKey } from "@/lib/query-keys"
import {
  useShopContextStore,
  type ShopMeta,
} from "@/store/shop-context.store"
import type { Shop } from "@/types"
import type { ShopAssignment } from "@/types/auth.types"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUPER_ADMIN_PERMS: readonly PermissionToken[] = ROLE_DEFAULTS.SHOP_ADMIN

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toShopMeta(shop: Shop): ShopMeta {
  return {
    id: shop.id,
    name: shop.name,
    branchCode: shop.branch_code,
    city: shop.city,
    isActive: shop.is_active,
  }
}

function assignmentToShopMeta(assignment: ShopAssignment): ShopMeta {
  return {
    id: assignment.id,
    name: assignment.name,
    branchCode: assignment.branchCode,
    city: assignment.city,
    isActive: assignment.isActive,
  }
}

function matchesQuery(name: string, branchCode: string, city: string, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    name.toLowerCase().includes(needle) ||
    branchCode.toLowerCase().includes(needle) ||
    city.toLowerCase().includes(needle)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShopSwitcher() {
  const { mode: dashboardMode } = useEffectivePermissions()

  if (dashboardMode === "HQ_MODE") {
    return <HQShopSwitcher />
  }

  // Store mode — show only if user has multiple assigned shops
  return <StoreShopSwitcher />
}

// ─────────────────────────────────────────────────────────────────────────────
// HQ Shop Switcher (Super_Admin)
// ─────────────────────────────────────────────────────────────────────────────

function HQShopSwitcher() {
  const queryClient = useQueryClient()
  const { mode, shopMeta } = useShopContext()
  const { data, isLoading, isError } = useActiveShopsForSwitcher()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 200)

  const triggerLabel =
    mode === "STORE_MODE" && shopMeta ? shopMeta.name : "All Shops"

  const shops = data?.items ?? []

  const filteredShops = useMemo(() => {
    const sorted = [...shops].sort((a, b) => a.name.localeCompare(b.name))
    return sorted.filter((s) =>
      matchesQuery(s.name, s.branch_code, s.city, debouncedQuery),
    )
  }, [shops, debouncedQuery])

  const selectShop = (shop: Shop | null) => {
    if (shop) {
      useShopContextStore
        .getState()
        .setActiveShop(toShopMeta(shop), "SHOP_ADMIN", [...SUPER_ADMIN_PERMS])
    } else {
      useShopContextStore.getState().setAllShopsMode()
    }

    // Clear all shop-scoped TanStack Query caches
    queryClient.invalidateQueries({
      predicate: (q) => isShopScopedKey(q.queryKey),
    })

    setQuery("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Current shop: ${triggerLabel}`}
          data-testid="shop-switcher-trigger"
          className="h-9 min-w-[180px] max-w-[260px] justify-between gap-2"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm font-medium">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        {/* Search */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops..."
            aria-label="Search shops"
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
          />
        </div>

        {/* List */}
        <ScrollArea className="max-h-[320px]">
          <ul role="listbox" aria-label="Shops" className="p-1">
            {/* All Shops — pinned for HQ users */}
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={mode === "HQ_MODE"}
                onClick={() => selectShop(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                  mode === "HQ_MODE" && "bg-accent/60",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    mode === "HQ_MODE" ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-medium">All Shops</span>
              </button>
            </li>

            <li role="presentation" aria-hidden="true" className="my-1 h-px bg-border" />

            {isLoading && (
              <li role="presentation" className="px-2 py-2 text-xs text-muted-foreground">
                Loading shops…
              </li>
            )}

            {isError && !isLoading && (
              <li role="presentation" className="px-2 py-2 text-xs text-destructive">
                Failed to load shops
              </li>
            )}

            {!isLoading && !isError && filteredShops.length === 0 && (
              <li role="presentation" className="px-2 py-2 text-xs text-muted-foreground">
                No shops found
              </li>
            )}

            {filteredShops.map((shop) => {
              const selected = mode === "STORE_MODE" && shopMeta?.id === shop.id
              return (
                <li key={shop.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectShop(shop)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      selected && "bg-accent/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{shop.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {shop.branch_code} · {shop.city}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Shop Switcher (Vendor/Staff — assigned shops only)
// ─────────────────────────────────────────────────────────────────────────────

function StoreShopSwitcher() {
  const queryClient = useQueryClient()
  const { shopMeta } = useShopContext()
  const { data: myShopsData, isLoading } = useMyShops()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 200)

  // Only show switcher if user has multiple assigned shops
  const myShops: ShopAssignment[] = myShopsData ?? []
  if (myShops.length <= 1 && !isLoading) {
    return null
  }

  const triggerLabel = shopMeta?.name ?? "Select Shop"

  const filteredShops = myShops
    .filter((s) =>
      matchesQuery(s.name, s.branchCode, s.city, debouncedQuery),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSelectShop = (assignment: ShopAssignment) => {
    const meta = assignmentToShopMeta(assignment)
    // Use the assignment's role and derive permissions from ROLE_DEFAULTS
    const perms = ROLE_DEFAULTS[assignment.role] ?? []
    useShopContextStore.getState().setActiveShop(meta, assignment.role, [...perms])

    // Clear all shop-scoped TanStack Query caches
    queryClient.invalidateQueries({
      predicate: (q) => isShopScopedKey(q.queryKey),
    })

    setQuery("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Current shop: ${triggerLabel}`}
          data-testid="store-shop-switcher-trigger"
          className="h-9 min-w-[160px] max-w-[220px] justify-between gap-2"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm font-medium">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        {/* Search — only show if more than 5 shops */}
        {myShops.length > 5 && (
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your shops..."
              aria-label="Search your shops"
              className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
            />
          </div>
        )}

        {/* List */}
        <ScrollArea className="max-h-[280px]">
          <ul role="listbox" aria-label="Your shops" className="p-1">
            {isLoading && (
              <li role="presentation" className="px-2 py-2 text-xs text-muted-foreground">
                Loading your shops…
              </li>
            )}

            {!isLoading && filteredShops.length === 0 && (
              <li role="presentation" className="px-2 py-2 text-xs text-muted-foreground">
                No shops found
              </li>
            )}

            {filteredShops.map((assignment) => {
              const selected = shopMeta?.id === assignment.id
              return (
                <li key={assignment.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelectShop(assignment)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      selected && "bg-accent/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{assignment.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {assignment.branchCode} · {assignment.city}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
