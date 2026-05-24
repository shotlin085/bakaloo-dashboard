"use client"

/**
 * Super_Admin Shop_Switcher — topbar control for pivoting the dashboard's
 * active shop scope without re-authenticating.
 *
 * Trigger: a `Button` showing the current shop's name or the `"All Shops"`
 * label when the dashboard is in `ALL_SHOPS` mode.
 *
 * Content: a Radix `Popover` with a Command-style search input + scrollable
 * list. The "All Shops" entry is pinned at the top and is always visible
 * regardless of the search query; below it, active shops are filtered by
 * case-insensitive substring against name, branchCode, or city. The active
 * shops query (`useActiveShopsForSwitcher`) shares its cache entry with the
 * `/shops` list so opening the popover never refires a new request when the
 * data is fresh (Req 3.3).
 *
 * Selection effects: every selection performs three side effects in order
 *   1. Update the Shop_Context_Store
 *      • specific shop  → `setActiveShop(meta, "SHOP_ADMIN", ROLE_DEFAULTS.SHOP_ADMIN)`
 *      • All Shops       → `setAllShopsMode()`
 *   2. Invalidate every shop-scoped TanStack Query cache via the predicate
 *      `isShopScopedKey(q.queryKey)` (Property 13, Req 3.4 / 10.3).
 *   3. Rotate the Socket.IO shop rooms via `shopRoomManager.switchTo(...)`
 *      from `@/hooks/useShopRoom` (task 13.1). The store subscription wired
 *      by `useShopRoom()` would catch this transition automatically, but we
 *      still call `switchTo` explicitly here so the rotation happens on the
 *      same render pass as the cache invalidation.
 *
 * Visibility: the switcher is hidden entirely for vendor users
 * (`assignedShopIds.length > 0`). The defensive `useIsSuperAdmin()` check is
 * a second gate — middleware should already prevent vendors from seeing the
 * topbar Shop_Switcher, but we re-check here so a misconfigured layout cannot
 * leak the cross-shop pivot to a vendor session (Req 3.2, 3.7).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Design references:
 *   - design.md §4 "Super_Admin Shop_Switcher"
 *   - design.md §5 "Central Query-Key Factory" (predicate invalidation)
 *   - design.md §12 "Live_Updates_Channel Design" (room rotation hook-in)
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
import { useActiveShopsForSwitcher } from "@/hooks/useShops"
import { useIsSuperAdmin, useShopContext } from "@/hooks/useShopContext"
import { shopRoomManager } from "@/hooks/useShopRoom"
import { t } from "@/lib/i18n"
import { ROLE_DEFAULTS, type PermissionToken } from "@/lib/permissions"
import { isShopScopedKey } from "@/lib/query-keys"
import {
  useShopContextStore,
  type ShopMeta,
} from "@/store/shop-context.store"
import type { Shop } from "@/types"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Permissions / future integration points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permissions seeded into the Shop_Context_Store when a Super_Admin pivots
 * to a single shop. Super admins effectively have full read+write inside
 * any shop; the JWT `permissions[]` array carried on the access token is
 * what the backend ultimately enforces, so the front-end seeding only
 * needs to be permissive enough that UI gating doesn't hide affordances.
 *
 * Reusing `ROLE_DEFAULTS.SHOP_ADMIN` keeps this aligned with the staff
 * invite dialog defaults — there is one source of truth for "what a shop
 * admin can do" (`lib/permissions.ts`).
 */
const SUPER_ADMIN_PERMS: readonly PermissionToken[] = ROLE_DEFAULTS.SHOP_ADMIN

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Project a backend `Shop` (snake_case) into the camelCase `ShopMeta` the
 * Shop_Context_Store persists. Centralized here so every selection writes a
 * consistent shape into localStorage.
 */
function toShopMeta(shop: Shop): ShopMeta {
  return {
    id: shop.id,
    name: shop.name,
    branchCode: shop.branch_code,
    city: shop.city,
    isActive: shop.is_active,
  }
}

/**
 * Case-insensitive substring filter over the shop fields the user is most
 * likely to type. Whitespace-trimming the query avoids surprises when the
 * input is autofocused and the user types/deletes a stray space.
 */
function matchesShopQuery(shop: Shop, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    shop.name.toLowerCase().includes(needle) ||
    shop.branch_code.toLowerCase().includes(needle) ||
    shop.city.toLowerCase().includes(needle)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShopSwitcher() {
  const { mode, shopMeta } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()
  const assignedShopIds = useShopContextStore((s) => s.assignedShopIds)

  // Vendor user → never render the switcher (Req 3.2, 3.7). The
  // `assignedShopIds` check is the authoritative source: super admins keep an
  // empty list, vendors carry their locked set. The `isSuperAdmin` check is
  // a defensive second gate (see file-level comment).
  const isVendor = assignedShopIds.length > 0
  if (isVendor || !isSuperAdmin) {
    return null
  }

  return <ShopSwitcherInternal mode={mode} shopMeta={shopMeta} />
}

interface ShopSwitcherInternalProps {
  mode: ReturnType<typeof useShopContext>["mode"]
  shopMeta: ShopMeta | null
}

/**
 * Internal renderer split from the top-level component so the
 * `useActiveShopsForSwitcher` query is only ever issued for super admins.
 * Mounting the query inside the visible branch keeps the popover's request
 * cost off vendor sessions entirely.
 */
function ShopSwitcherInternal({ mode, shopMeta }: ShopSwitcherInternalProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useActiveShopsForSwitcher()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 200)

  const allShopsLabel = t("shopScope.allShops")
  const triggerLabel =
    mode === "SINGLE_SHOP" && shopMeta ? shopMeta.name : allShopsLabel

  const shops = data?.items ?? []

  /** Filtered list of active shops sorted by name for stable scanning. */
  const filteredShops = useMemo(() => {
    const sorted = [...shops].sort((a, b) => a.name.localeCompare(b.name))
    return sorted.filter((s) => matchesShopQuery(s, debouncedQuery))
  }, [shops, debouncedQuery])

  /**
   * Apply a selection.
   *
   * The three side effects (store update → cache invalidation → room
   * rotation) are deliberately ordered so that:
   *   - the store is the new source of truth before any cache work runs
   *     (other store-subscribed effects pick up the new shop on the same
   *     render pass);
   *   - the predicate sweep marks shop-scoped queries stale before the
   *     socket re-joins, so any in-flight refetch after the room change
   *     uses the new `X-Shop-Id` injected by the axios interceptor.
   */
  const applySelection = (shop: Shop | null) => {
    if (shop) {
      useShopContextStore
        .getState()
        .setActiveShop(toShopMeta(shop), "SHOP_ADMIN", [...SUPER_ADMIN_PERMS])
    } else {
      useShopContextStore.getState().setAllShopsMode()
    }

    // Property 13 / Req 3.4 / Req 10.3 — predicate-based invalidation drops
    // every shop-scoped cache entry in a single pass without touching
    // non-shop-scoped queries (e.g. `my-shops`).
    queryClient.invalidateQueries({
      predicate: (q) => isShopScopedKey(q.queryKey),
    })

    // Req 3.4 + design §12 — rotate the Socket.IO rooms so live-update
    // listeners receive events for the new scope. The store subscription
    // wired by `useShopRoom()` would catch this transition too, but we
    // call `switchTo` explicitly here so the rotation runs synchronously
    // alongside the cache invalidation above (task 13.1).
    shopRoomManager.switchTo(shop ? shop.id : null)

    // Reset transient UI state and close the popover so the next open is
    // a clean slate.
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
          aria-label={t("shopScope.badge", { name: triggerLabel })}
          data-testid="shop-switcher-trigger"
          className="h-9 min-w-[180px] max-w-[260px] justify-between gap-2"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm font-medium">
              {triggerLabel}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        {/* ── Search input ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            // Plain input (not the styled `<Input>`) so the search field
            // sits flush inside the popover without doubled borders. The
            // `aria-label` mirrors the placeholder for screen readers.
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("shops.list.searchPlaceholder")}
            aria-label={t("shops.list.searchPlaceholder")}
            data-testid="shop-switcher-search"
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
          />
        </div>

        {/* ── List ─────────────────────────────────────────────────────── */}
        <ScrollArea className="max-h-[320px]">
          <ul role="listbox" aria-label="Shops" className="p-1">
            {/* All Shops — pinned, never filtered out (Req 3.3) */}
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={mode === "ALL_SHOPS"}
                data-testid="shop-switcher-all-shops"
                onClick={() => applySelection(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                  mode === "ALL_SHOPS" && "bg-accent/60",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    mode === "ALL_SHOPS" ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-medium">{allShopsLabel}</span>
              </button>
            </li>

            {/* Divider between the pinned entry and the dynamic list */}
            <li
              role="presentation"
              aria-hidden="true"
              className="my-1 h-px bg-border"
            />

            {/* Loading / error / empty / list states */}
            {isLoading && (
              <li
                role="presentation"
                className="px-2 py-2 text-xs text-muted-foreground"
              >
                Loading shops…
              </li>
            )}

            {isError && !isLoading && (
              <li
                role="presentation"
                className="px-2 py-2 text-xs text-destructive"
              >
                {t("errors.genericError")}
              </li>
            )}

            {!isLoading && !isError && filteredShops.length === 0 && (
              <li
                role="presentation"
                className="px-2 py-2 text-xs text-muted-foreground"
              >
                {t("shops.list.empty")}
              </li>
            )}

            {filteredShops.map((shop) => {
              const selected =
                mode === "SINGLE_SHOP" && shopMeta?.id === shop.id
              return (
                <li key={shop.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-testid={`shop-switcher-shop-${shop.id}`}
                    onClick={() => applySelection(shop)}
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
