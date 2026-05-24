"use client"

/**
 * Edit_Product_Dialog (`<EditProductDialog />`) — task 8.6.
 *
 * Single-step Radix `Dialog` for editing the per-shop fields of an
 * existing `ShopProduct` row. Mirrors `<AddProductDialog />` step 2 minus
 * the catalog typeahead — the master-catalog product is fixed for an
 * existing inventory row, so we only surface the per-shop slots:
 *
 *   `price`, `sale_price`, `cost_price`, `stock_quantity`,
 *   `low_stock_threshold`, `max_order_qty`, `is_available`, `is_featured`
 *
 * Validation runs through the canonical `shopProductSchema`
 * (`lib/shop-validations.ts`), the same single source of truth that the
 * Add dialog uses (Req 7.5). Field primitives (`NumberField`,
 * `NullableNumberField`, `ToggleRow`) are reused from
 * `./product-form-fields.tsx`.
 *
 * Visibility (Req 7.4 / 7.9): the parent shop-products page only mounts
 * the row-level Edit affordance when the user holds `shop-products.write`,
 * so this dialog is implicitly permission-gated. We do not re-check
 * inside the dialog.
 *
 * On submit (Req 7.9, design §8 — Property 8: round-trip rollback):
 *   - Calls `useUpdateShopProduct(shopId).mutateAsync({ id: product.id,
 *     body })`. The hook owns the optimistic update — it patches every
 *     matching `["shop-products", shopId, …]` cache entry in place
 *     before the request lands and rolls back on error.
 *   - On success: closes the dialog. The `onSettled` invalidation in
 *     the hook reconciles with server truth (e.g. server-derived
 *     `is_available` flips when stock crosses zero).
 *   - On error: leaves the dialog open so the operator can retry. The
 *     hook's `onError` already restored the snapshot and surfaced the
 *     destructive toast (`shopProducts.toast.updateFailed`).
 *
 * NOTE: `stock_quantity` is included in the form because the schema
 * requires it, but the update mutation strips it before posting —
 * stock changes flow through the dedicated `PATCH /:id/stock` endpoint
 * owned by a future task. The form value defaults to the current row's
 * `stock_quantity` so the Zod schema's `min(0)` constraint is satisfied
 * without forcing the operator to retype it; the input is rendered
 * read-only.
 *
 * Responsiveness (Req 12.5): single-column form with
 * `max-h-[90vh] overflow-y-auto` so it scrolls cleanly at the 360 × 640
 * baseline; the responsive grid collapses to one column under sm.
 *
 * Requirements: 7.5, 7.9, 12.5
 */

import { useEffect } from "react"
import { Controller, useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Package } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useUpdateShopProduct } from "@/hooks/useShopProducts"
import { useShopContext } from "@/hooks/useShopContext"
import { t } from "@/lib/i18n"
import {
  shopProductSchema,
  type ShopProductInput,
} from "@/lib/shop-validations"
import type { ShopProduct } from "@/types"

import {
  NullableNumberField,
  NumberField,
  ToggleRow,
} from "./product-form-fields"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EditProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The shop-product row whose per-shop fields are being edited. */
  product: ShopProduct
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build RHF default values from the row being edited. Every form slot
 * gets its current persisted value so the dialog opens "ready" — the
 * operator can submit immediately after toggling one field without being
 * asked to re-enter the rest.
 *
 * `stock_quantity` is preserved for schema-validation purposes only; the
 * update path strips it before posting (see file-header note).
 */
function buildDefaultsFromProduct(product: ShopProduct): ShopProductInput {
  return {
    product_id: product.product_id,
    price: product.price,
    sale_price: product.sale_price,
    cost_price: product.cost_price,
    stock_quantity: product.stock_quantity,
    low_stock_threshold: product.low_stock_threshold,
    max_order_qty: product.max_order_qty,
    is_available: product.is_available,
    is_featured: product.is_featured,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EditProductDialog({
  open,
  onOpenChange,
  product,
}: EditProductDialogProps) {
  // Read the active shop so the mutation hook keys its optimistic
  // updates and invalidations against the right cache prefix. The shop
  // products page (which mounts this dialog) is gated on
  // `mode === "SINGLE_SHOP"` so `activeShopId` is always populated;
  // the submit handler still defends against the null case so no
  // misuse posts an unscoped PATCH.
  const { activeShopId } = useShopContext()

  // Mutation — bound to the active shop (or a sentinel "" when null,
  // which is unreachable at runtime because the parent gates the CTA).
  // The hook owns optimistic update + rollback (design §8); this
  // component only triggers it.
  const updateMutation = useUpdateShopProduct(activeShopId ?? "")

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopProductInput>({
    // The shopProductSchema's `.refine` produces an effects-wrapped schema
    // whose inferred input/output diverge slightly from `ShopProductInput`;
    // cast through the shared resolver type so the rest of the form code
    // stays strictly typed (matches the Add dialog).
    resolver: zodResolver(
      shopProductSchema,
    ) as unknown as Resolver<ShopProductInput>,
    defaultValues: buildDefaultsFromProduct(product),
    mode: "onSubmit",
  })

  // Re-seed defaults whenever the dialog (re)opens or the row reference
  // changes. Without this, opening the dialog on a different row after
  // closing the first one would show the previous row's values.
  useEffect(() => {
    if (!open) return
    reset(buildDefaultsFromProduct(product))
  }, [open, product, reset])

  // ─── Submit handler ──────────────────────────────────────────────────────

  async function onSubmit(values: ShopProductInput) {
    if (!activeShopId) return

    try {
      await updateMutation.mutateAsync({
        id: product.id,
        body: {
          price: values.price,
          sale_price: values.sale_price,
          cost_price: values.cost_price,
          low_stock_threshold: values.low_stock_threshold,
          max_order_qty: values.max_order_qty,
          is_available: values.is_available,
          is_featured: values.is_featured,
        },
      })
      // Close on success. The hook's `onSettled` invalidation will
      // refetch the list so server-derived fields (e.g. `is_available`
      // flipping when stock crosses zero) reconcile with the cache.
      onOpenChange(false)
    } catch {
      // Hook's `onError` already rolled the cache back and surfaced the
      // destructive toast. Stay open so the operator can retry without
      // re-typing every value.
    }
  }

  const submitting = isSubmitting || updateMutation.isPending
  const canSubmit = Boolean(activeShopId) && !submitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product.product?.name ?? t("shopProducts.list.column.name")}
          </DialogTitle>
          <DialogDescription>
            {product.product?.sku
              ? `SKU ${product.product.sku}`
              : t("shopProducts.list.column.name")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          data-testid="edit-product-form"
        >
          {/* ── Product summary header ────────────────────────────── */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
            <ProductThumb product={product} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {product.product?.name ?? "—"}
              </span>
              {product.product?.sku ? (
                <span className="truncate text-xs text-muted-foreground">
                  SKU {product.product.sku}
                </span>
              ) : null}
            </div>
          </div>

          {/* ── Pricing ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              id="edit-product-price"
              label={t("shopProducts.list.column.price")}
              step="0.01"
              min={0}
              required
              error={errors.price?.message}
              {...register("price", { valueAsNumber: true })}
            />
            <NullableNumberField
              id="edit-product-sale-price"
              label={t("shopProducts.list.column.salePrice")}
              step="0.01"
              min={0}
              control={control}
              name="sale_price"
              error={errors.sale_price?.message}
            />
            <NullableNumberField
              id="edit-product-cost-price"
              label="Cost price"
              step="0.01"
              min={0}
              control={control}
              name="cost_price"
              error={errors.cost_price?.message}
            />
          </div>

          {/* ── Inventory ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              id="edit-product-stock"
              label={t("shopProducts.list.column.stockQuantity")}
              step="1"
              min={0}
              required
              error={errors.stock_quantity?.message}
              // Stock changes flow through the dedicated stock endpoint
              // owned by a future task. We surface the field so the
              // schema's `min(0)` requirement is satisfied with the
              // current persisted value, but render it read-only to
              // communicate that this dialog cannot mutate it. Removing
              // it would require diverging from the shared
              // `shopProductSchema` (Req 7.5 — single source of truth).
              readOnly
              {...register("stock_quantity", { valueAsNumber: true })}
            />
            <NumberField
              id="edit-product-low-stock"
              label={t("shopProducts.list.column.lowStockThreshold")}
              step="1"
              min={0}
              error={errors.low_stock_threshold?.message}
              {...register("low_stock_threshold", { valueAsNumber: true })}
            />
            <NumberField
              id="edit-product-max-qty"
              label={t("shopProducts.list.column.maxOrderQty")}
              step="1"
              min={1}
              max={10000}
              required
              error={errors.max_order_qty?.message}
              {...register("max_order_qty", { valueAsNumber: true })}
            />
          </div>

          {/* ── Toggles ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <Controller
              control={control}
              name="is_available"
              render={({ field }) => (
                <ToggleRow
                  id="edit-product-is-available"
                  label={t("shopProducts.list.column.isAvailable")}
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  testId="edit-product-is-available"
                />
              )}
            />
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <ToggleRow
                  id="edit-product-is-featured"
                  label={t("shopProducts.list.column.isFeatured")}
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  testId="edit-product-is-featured"
                />
              )}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("shopStaff.invite.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-testid="edit-product-submit"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("shops.edit.submitting")}
                </span>
              ) : (
                t("shops.edit.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditProductDialog

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thumbnail for the row being edited with a graceful fallback when the
 * master-catalog product has no `image_url`. Mirrors the `CatalogThumb`
 * helper in `<AddProductDialog />` but reads from `ShopProduct.product`
 * (the embedded catalog ref) instead of a top-level `Product`.
 */
function ProductThumb({ product }: { product: ShopProduct }) {
  const url = product.product?.image_url
  if (!url) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"
        aria-hidden="true"
      >
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
      <Image
        src={url}
        alt={product.product?.name ?? ""}
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  )
}
