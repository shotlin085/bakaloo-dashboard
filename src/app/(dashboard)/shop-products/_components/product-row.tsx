"use client"

/**
 * Product_Row — task 8.7.
 *
 * Houses the canonical cell renderers for the Shop_Products list page.
 * Extracted from `shop-products/page.tsx` so the table-cell decisions
 * (image fallback, formatting, badge composition) live in one place and
 * the page composes them by reference.
 *
 * Pattern notes:
 *   - The `<DataList />` shell already owns the responsive table↔card
 *     transformation (design §13). Each export here is a one-cell leaf
 *     that returns the same content for both surfaces; the shell decides
 *     which one is visible at a given viewport. Keeping the cells leaf
 *     components — rather than refactoring to a richer "row" pattern —
 *     keeps the bijection asserted by Property 14 intact (every column
 *     produces exactly one node per row, on both surfaces).
 *   - `<ProductActions />` is the only stateful cell. It owns the open
 *     state for the Edit dialog and the Remove confirmation; closing
 *     either resets the local state. Gating on `canWrite` is enforced
 *     here so the page does not have to thread the flag through column
 *     definitions a second time.
 *
 * Exported cells (Req 7.2):
 *   - `<ProductImage />`, `<ProductName />`, `<ProductSku />`
 *   - `<ProductPrice />`, `<ProductSalePrice />`
 *   - `<ProductStock />` (count + Low_Stock / Sold_Out badge)
 *   - `<ProductLowStockThreshold />`, `<ProductMaxOrderQty />`
 *   - `<ProductIsAvailable />`, `<ProductIsFeatured />`
 *   - `<ProductSoldOutAt />`
 *   - `<ProductActions />` — DropdownMenu (Edit / Remove) gated on
 *     `canWrite`, with an AlertDialog confirmation calling
 *     `useRemoveShopProduct` on confirm
 *
 * Requirements: 7.2, 7.6, 7.7, 7.9, 7.10, 7.11
 */

import * as React from "react"
import Image from "next/image"
import { Loader2, MoreHorizontal, Package } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouteRBAC } from "@/hooks/useRBAC"
import { useRemoveShopProduct } from "@/hooks/useShopProducts"
import { useShopContext } from "@/hooks/useShopContext"
import { formatCurrency, formatDate, t } from "@/lib/i18n"
import type { ShopProduct } from "@/types"

import { EditProductDialog } from "./edit-product-dialog"
import { StockBadgeForProduct } from "./stock-badge"

// ─────────────────────────────────────────────────────────────────────────────
// Shared row prop shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every cell takes the canonical {@link ShopProduct} row plus optional
 * test-id/className overrides. Cells are intentionally tiny so the page
 * can compose them inline inside `DataListColumn.cell` without an extra
 * adapter layer.
 */
export interface ProductCellProps {
  product: ShopProduct
}

// ─────────────────────────────────────────────────────────────────────────────
// <ProductImage /> — thumbnail with fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Product thumbnail with a graceful fallback when the master-catalog
 * product has no `image_url`. Matches the minimal-style 40 × 40 thumb
 * used elsewhere in the dashboard (cf. `<AddProductDialog />`).
 */
export function ProductImage({ product }: ProductCellProps) {
  const imageUrl = product.product?.image_url
  const altText = product.product?.name ?? ""

  if (!imageUrl) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"
        aria-hidden="true"
        data-testid="product-image-fallback"
      >
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
      <Image
        src={imageUrl}
        alt={altText}
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// <ProductName /> / <ProductSku /> — text cells
// ─────────────────────────────────────────────────────────────────────────────

export function ProductName({ product }: ProductCellProps) {
  return (
    <span className="font-medium text-foreground">
      {product.product?.name ?? "—"}
    </span>
  )
}

export function ProductSku({ product }: ProductCellProps) {
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {product.product?.sku ?? "—"}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Money + numeric cells
// ─────────────────────────────────────────────────────────────────────────────

export function ProductPrice({ product }: ProductCellProps) {
  return <>{formatCurrency(product.price)}</>
}

export function ProductSalePrice({ product }: ProductCellProps) {
  if (product.sale_price == null) return <>{"—"}</>
  return <>{formatCurrency(product.sale_price)}</>
}

/**
 * Stock count alongside the Low_Stock / Sold_Out badge. The badge
 * component (`<StockBadgeForProduct />`) owns the decision tree; this
 * cell only handles layout (numeric + badge inline).
 */
export function ProductStock({ product }: ProductCellProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">{product.stock_quantity}</span>
      <StockBadgeForProduct product={product} />
    </div>
  )
}

export function ProductLowStockThreshold({ product }: ProductCellProps) {
  return <span className="tabular-nums">{product.low_stock_threshold}</span>
}

export function ProductMaxOrderQty({ product }: ProductCellProps) {
  return <span className="tabular-nums">{product.max_order_qty}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// Boolean cells
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Boolean → `Yes` / `No` badge. Shared across `is_available` and
 * `is_featured` columns so the visual treatment stays consistent.
 */
function BoolBadge({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "default" : "outline"}>
      {value ? "Yes" : "No"}
    </Badge>
  )
}

export function ProductIsAvailable({ product }: ProductCellProps) {
  return <BoolBadge value={product.is_available} />
}

export function ProductIsFeatured({ product }: ProductCellProps) {
  return <BoolBadge value={product.is_featured} />
}

// ─────────────────────────────────────────────────────────────────────────────
// <ProductSoldOutAt /> — formatted timestamp or em-dash
// ─────────────────────────────────────────────────────────────────────────────

export function ProductSoldOutAt({ product }: ProductCellProps) {
  if (!product.sold_out_at) return <>{"—"}</>
  return <>{formatDate(product.sold_out_at, "short")}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// <ProductActions /> — Edit + Remove menu (gated on canWrite)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductActionsProps extends ProductCellProps {
  /**
   * Whether the user holds `shop-products.write`. When omitted the cell
   * resolves it from `useRouteRBAC("/shop-products")` so callers can
   * mount the cell without threading the flag through column definitions.
   * Passing it explicitly keeps the column renderer pure when the page
   * has already paid for the RBAC lookup.
   */
  canWrite?: boolean
}

/**
 * Row actions cell — exposes Edit and Remove behind a kebab DropdownMenu
 * (Req 7.9 / 7.10). Renders an em-dash placeholder when the user lacks
 * `shop-products.write` so the table column stays aligned with the
 * read-only surface (Req 7.11 — section gating already short-circuits
 * the page itself in non-SINGLE_SHOP modes).
 */
export function ProductActions({
  product,
  canWrite: canWriteProp,
}: ProductActionsProps) {
  // Resolve `canWrite` from the central route RBAC hook when the parent
  // hasn't passed it. Guard the call with `useRouteRBAC` always invoked
  // — React's rules-of-hooks require unconditional invocation, so we
  // call the hook once and pick the prop or the resolved value below.
  const rbac = useRouteRBAC("/shop-products")
  const canWrite = canWriteProp ?? rbac.canWrite

  const { activeShopId } = useShopContext()
  const removeMutation = useRemoveShopProduct(activeShopId ?? "")

  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false)

  // Read-only viewers see a dash so the responsive bijection still holds.
  if (!canWrite) {
    return (
      <span className="text-muted-foreground" aria-hidden="true">
        —
      </span>
    )
  }

  const productName = product.product?.name ?? "product"

  /**
   * Confirm-handler for the remove AlertDialog. We close the dialog only
   * on success — on failure we leave it open so the operator can retry,
   * mirroring the dialog convention used by `<EditProductDialog />`.
   * `mutate` is fire-and-forget here because the hook already surfaces
   * the success/error toasts and invalidates the list.
   */
  function handleConfirmRemove(e: React.MouseEvent<HTMLButtonElement>) {
    // Prevent the AlertDialog from auto-closing before the mutation
    // settles so the spinner stays visible and a network failure can
    // re-prompt the operator.
    e.preventDefault()
    removeMutation.mutate(product.id, {
      onSuccess: () => {
        setIsRemoveOpen(false)
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Actions for ${productName}`}
            data-testid={`product-actions-trigger-${product.id}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => setIsEditOpen(true)}
            data-testid={`product-actions-edit-${product.id}`}
          >
            {t("shops.edit.submit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setIsRemoveOpen(true)}
            data-testid={`product-actions-remove-${product.id}`}
          >
            {t("shopProducts.confirmRemove.confirm")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit dialog — keyed on the product id so opening from a different
          row resets RHF state without leaking the previous defaults. */}
      {isEditOpen ? (
        <EditProductDialog
          key={product.id}
          product={product}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      ) : null}

      {/* Remove confirmation — mounts only when triggered so the AlertDialog
          state (and its portalled overlay) stays scoped to the row in flight. */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("shopProducts.confirmRemove.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("shopProducts.confirmRemove.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Display the product name so the operator can confirm they're
              removing the right row, matching the shop deactivate dialog. */}
          <p className="text-sm text-muted-foreground">
            {productName}
            {product.product?.sku ? (
              <span className="ml-2 font-mono text-xs">
                ({product.product.sku})
              </span>
            ) : null}
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              {t("shopStaff.invite.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              data-testid={`product-actions-remove-confirm-${product.id}`}
            >
              {removeMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("shopProducts.confirmRemove.confirm")}
                </span>
              ) : (
                t("shopProducts.confirmRemove.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Default namespace export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convenience namespace export — `<ProductRow.Image />` etc. — so call
 * sites can import a single symbol and reach every cell. The named
 * exports above remain the canonical entry points for tree-shaking and
 * direct testing.
 */
export const ProductRow = {
  Image: ProductImage,
  Name: ProductName,
  Sku: ProductSku,
  Price: ProductPrice,
  SalePrice: ProductSalePrice,
  Stock: ProductStock,
  LowStockThreshold: ProductLowStockThreshold,
  MaxOrderQty: ProductMaxOrderQty,
  IsAvailable: ProductIsAvailable,
  IsFeatured: ProductIsFeatured,
  SoldOutAt: ProductSoldOutAt,
  Actions: ProductActions,
} as const

export default ProductRow
