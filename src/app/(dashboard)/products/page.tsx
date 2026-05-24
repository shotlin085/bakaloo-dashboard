"use client"

/**
 * Products page — Master Catalog vs Shop Products tab shell (task 12.5).
 *
 * The `/products` route now exposes two surfaces side-by-side:
 *   - **Master Catalog** — the existing super-admin-managed catalog list
 *     (rendered through `<MasterCatalogView />`). Visible whenever the
 *     route is reachable, mirroring the previous single-surface page.
 *   - **Shop Products** — the per-shop inventory view from §8 (rendered
 *     through `<ShopProductsView embedded />`). Gated on:
 *       1. `requiresActiveShop` — only enabled when the Shop_Context_Store
 *          is in `SINGLE_SHOP` mode (Req 4.5, 7.11).
 *       2. `useRouteRBAC("/shop-products").canRead` — the user must hold
 *          `shop-products.read` to see/use the tab. Vendors without that
 *          permission see only the Master Catalog tab.
 *
 * When a Super_Admin is in `ALL_SHOPS` mode (or no shop has been picked
 * yet), the Shop Products tab is rendered as a *disabled* trigger with a
 * tooltip explaining that selecting a shop unlocks the inventory surface.
 * Disabling (rather than hiding) keeps the affordance discoverable so the
 * super admin learns where the inventory lives without having to consult
 * the sidebar.
 *
 * Requirements: 10.7
 */

import { PageHeader } from "@/components/shared/PageHeader"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouteRBAC } from "@/hooks/useRBAC"
import { useShopContext } from "@/hooks/useShopContext"
import { t } from "@/lib/i18n"

import { ShopProductsView } from "@/app/(dashboard)/shop-products/_components/shop-products-view"

import { MasterCatalogView } from "./_components/master-catalog-view"

/** Stable tab identifiers; used as the Radix Tabs `value` keys. */
const TAB_MASTER = "master"
const TAB_SHOP = "shop"

export default function ProductsPage() {
  // ─── Tab visibility ──────────────────────────────────────────────────────
  // The Master Catalog tab is always present (the route owner reaches this
  // page only when their role permits viewing products).
  //
  // The Shop Products tab follows the existing `/shop-products` guard via
  // `useRouteRBAC`:
  //   - `canRead` is true when the user holds `shop-products.read`.
  //   - The active-shop branch comes from `useShopContext()` directly so
  //     the trigger reflects the live Shop_Switcher selection without
  //     waiting for the route guard to re-resolve.
  const { canRead: canReadShopProducts } = useRouteRBAC("/shop-products")
  const { mode } = useShopContext()
  const hasActiveShop = mode === "SINGLE_SHOP"

  // The tab is rendered (not hidden) whenever the user holds
  // `shop-products.read` so super admins can discover the inventory
  // surface even before they pick a shop. The trigger itself is disabled
  // until a shop is selected; clicking it has no effect, and a tooltip
  // explains the state.
  const showShopProductsTab = canReadShopProducts
  const isShopProductsEnabled = hasActiveShop

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Manage your product catalog" />

      {/* Default tab prefers Master Catalog — the super-admin's primary
          surface and the historical landing for `/products`. */}
      <Tabs defaultValue={TAB_MASTER}>
        <TabsList className="h-9">
          <TabsTrigger value={TAB_MASTER} className="text-xs px-4">
            {t("products.tab.masterCatalog")}
          </TabsTrigger>

          {showShopProductsTab && (
            isShopProductsEnabled ? (
              // Enabled — render the trigger directly. No tooltip is
              // needed in this branch since the affordance is fully
              // available; wrapping in `<TooltipTrigger asChild>` would
              // intercept the pointer event and break Radix's tab
              // selection (the wrapped child receives a synthetic event
              // that does not bubble back to the Tabs root).
              <TabsTrigger
                value={TAB_SHOP}
                className="text-xs px-4"
                data-testid="shop-products-tab-trigger"
                aria-disabled={false}
              >
                {t("products.tab.shopProducts")}
              </TabsTrigger>
            ) : (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  {/* Disabled — wrap in a span so Radix Tooltip still
                      fires (Radix tooltips ignore disabled buttons). */}
                  <TooltipTrigger asChild>
                    <span className="cursor-not-allowed">
                      <TabsTrigger
                        value={TAB_SHOP}
                        className="text-xs px-4"
                        disabled
                        data-testid="shop-products-tab-trigger"
                        aria-disabled={true}
                      >
                        {t("products.tab.shopProducts")}
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("products.tab.shopProducts.disabledHint")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          )}
        </TabsList>

        <TabsContent value={TAB_MASTER} className="mt-4">
          <MasterCatalogView />
        </TabsContent>

        {showShopProductsTab && (
          <TabsContent value={TAB_SHOP} className="mt-4">
            {/* `embedded` suppresses the inner `<PageHeader />` and inline
                title — the parent shell above already provides one.
                When `mode !== "SINGLE_SHOP"` the embedded view falls back
                to its own `<EmptyShopState />`, though in practice the
                user cannot reach this branch (the trigger is disabled). */}
            <ShopProductsView embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
