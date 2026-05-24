"use client"

/**
 * Shop_Products list page — thin wrapper around `<ShopProductsView />`.
 *
 * The full inventory render tree lives in
 * `./_components/shop-products-view.tsx` so it can be embedded inside the
 * Master_Catalog vs Shop_Products tabs at `/products` (task 12.5) without
 * duplicating the page body.
 *
 * This standalone route renders the view in its default (non-embedded)
 * mode, which keeps the original `<PageHeader />` chrome intact for the
 * dedicated `/shop-products` URL the sidebar links to.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.6, 7.7, 7.11, 12.3, 14.2, 14.3
 */

import { ShopProductsView } from "./_components/shop-products-view"

export default function ShopProductsPage() {
  return <ShopProductsView />
}
