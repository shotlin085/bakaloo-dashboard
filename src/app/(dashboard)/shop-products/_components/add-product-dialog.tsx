"use client"

/**
 * Add_Product_Dialog (`<AddProductDialog />`) — task 8.5.
 *
 * Two-step Radix `Dialog` for adding a master-catalog product to the active
 * shop's inventory:
 *
 *   1. **Catalog typeahead** — debounced 300 ms search over
 *      `searchCatalog(q)` rendered as a Command-style list inside the
 *      dialog body (Req 7.4). Picking a row stamps `product_id` onto the
 *      RHF form and advances to step 2 with the catalog defaults
 *      (`price`, `sale_price`, `low_stock_threshold`) pre-seeded so the
 *      operator only has to confirm or override them.
 *   2. **Per-shop form** — `price`, `sale_price`, `cost_price`,
 *      `stock_quantity`, `low_stock_threshold`, `max_order_qty`,
 *      `is_available`, `is_featured`. Validated by the canonical
 *      `shopProductSchema` (Req 7.5) — single source of truth (see
 *      `lib/shop-validations.ts`).
 *
 * Visibility (Req 7.4): the parent page only mounts the "Add product" CTA
 * when the user holds `shop-products.write`, so this dialog is implicitly
 * permission-gated. We do not re-check inside the dialog.
 *
 * On submit (Req 7.4):
 *   - Calls `useAddShopProduct(activeShopId).mutateAsync({ product_id,
 *     ...form })`. The hook surfaces the success toast and invalidates the
 *     `["shop-products", shopId]` cache prefix.
 *   - On success, closes the dialog (`onOpenChange(false)`).
 *   - On error, leaves the dialog open so the operator can retry without
 *     re-typing every value.
 *
 * Responsiveness (Req 12.5): the dialog is single-column and uses
 * `max-h-[90vh] overflow-y-auto` so it scrolls cleanly at the 360 × 640
 * baseline. The catalog list and form fields stack vertically.
 *
 * Requirements: 7.4, 7.5, 12.5
 */

import { useEffect, useRef, useState } from "react"
import { Controller, useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeft, Loader2, Package, Search } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useDebounce } from "@/hooks/useDebounce"
import {
  useAddShopProduct,
  useSearchProductCatalog,
} from "@/hooks/useShopProducts"
import { useShopContext } from "@/hooks/useShopContext"
import { formatCurrency, t } from "@/lib/i18n"
import {
  shopProductSchema,
  type ShopProductInput,
} from "@/lib/shop-validations"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

import {
  NullableNumberField,
  NumberField,
  ToggleRow,
} from "./product-form-fields"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Two-step dialog state. Step 1 is the catalog typeahead; step 2 is the
 * numeric form. We keep them in a single Dialog so the operator can step
 * back without losing the picked product.
 */
type Step = 1 | 2

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build RHF default values for a freshly opened dialog. Numeric fields
 * for which the schema mandates a value (`price`, `stock_quantity`,
 * `max_order_qty`) are intentionally undefined so the inputs render empty
 * and the operator is forced to type a value rather than accidentally
 * submitting `0`.
 *
 * Nullable numeric fields (`sale_price`, `cost_price`) default to `null`
 * so the schema's `.nullable()` check is satisfied without surfacing a
 * spurious validation error before the operator interacts with them.
 */
function buildBlankDefaults(): Partial<ShopProductInput> {
  return {
    product_id: "",
    sale_price: null,
    cost_price: null,
    low_stock_threshold: 5,
    is_available: true,
    is_featured: false,
  }
}

/**
 * Pre-seed step-2 form values from the catalog row the operator picked.
 * Mirrors the master-catalog `price`, `sale_price`, and
 * `low_stock_threshold` so the form lands with sensible defaults; the
 * operator can override any of them. `cost_price` and `max_order_qty`
 * are taken from the catalog row when present.
 */
function buildDefaultsFromProduct(
  product: Product,
): Partial<ShopProductInput> {
  return {
    product_id: product.id,
    price: typeof product.price === "number" ? product.price : undefined,
    sale_price:
      typeof product.sale_price === "number" ? product.sale_price : null,
    cost_price:
      typeof product.cost_price === "number" ? product.cost_price : null,
    low_stock_threshold:
      typeof product.low_stock_threshold === "number"
        ? product.low_stock_threshold
        : 5,
    max_order_qty:
      typeof product.max_order_qty === "number"
        ? product.max_order_qty
        : undefined,
    is_available: true,
    is_featured: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog typeahead (Step 1)
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogTypeaheadProps {
  /** Called with the picked product so the parent can advance to step 2. */
  onPick: (product: Product) => void
}

/**
 * Inline Command-style search list. Wraps `useSearchProductCatalog` (which
 * already enforces the 60s staleTime + empty-string short-circuit) and
 * presses a 300 ms debounce on the input before the query string flows
 * into the hook. Matches the `<UserPicker />` pattern in
 * `invite-staff-dialog.tsx` for visual consistency.
 */
function CatalogTypeahead({ onPick }: CatalogTypeaheadProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  const trimmed = debouncedQuery.trim()
  const catalogQuery = useSearchProductCatalog(trimmed)

  const inputRef = useRef<HTMLInputElement | null>(null)
  // Auto-focus the search input when the typeahead first mounts so the
  // operator can start typing immediately. We only run this once per
  // mount so re-renders triggered by typing don't fight the cursor.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = catalogQuery.data ?? []

  return (
    <div className="space-y-2">
      <Label htmlFor="add-product-search">
        {t("shopProducts.list.searchPlaceholder")}
      </Label>
      <div className="flex items-center gap-2 rounded-md border bg-background px-3">
        <Search
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="add-product-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("shopProducts.list.searchPlaceholder")}
          aria-label={t("shopProducts.list.searchPlaceholder")}
          data-testid="add-product-search-input"
          className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
        />
      </div>

      <div className="rounded-md border">
        <ScrollArea className="max-h-[280px]">
          <ul
            role="listbox"
            aria-label="Catalog results"
            className="p-1"
            data-testid="add-product-results"
          >
            {trimmed.length === 0 ? (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                {t("shopProducts.list.searchPlaceholder")}
              </li>
            ) : catalogQuery.isLoading ? (
              <li className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                <Loader2
                  className="h-3 w-3 animate-spin"
                  aria-hidden="true"
                />
                Searching…
              </li>
            ) : catalogQuery.isError ? (
              <li className="px-2 py-3 text-xs text-destructive">
                {t("errors.genericError")}
              </li>
            ) : results.length === 0 ? (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                No products match
              </li>
            ) : (
              results.map((product) => (
                <li key={product.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    data-testid={`add-product-option-${product.id}`}
                    onClick={() => onPick(product)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                    )}
                  >
                    <CatalogThumb product={product} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">
                        {product.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {product.sku ? `SKU ${product.sku}` : product.unit}
                        {typeof product.price === "number"
                          ? ` · ${formatCurrency(product.price)}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </div>
    </div>
  )
}

/** Thumbnail for a catalog row with a fallback when no image is set. */
function CatalogThumb({ product }: { product: Product }) {
  const url = product.thumbnail_url
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
        alt={product.name}
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AddProductDialog({
  open,
  onOpenChange,
}: AddProductDialogProps) {
  // The dialog only opens from the shop-products page, which is gated on
  // `mode === "STORE_MODE"`, so `activeShopId` is always populated when
  // this component is mounted. We still defend the submit handler with a
  // guard so a misuse never POSTs an unscoped request.
  const { activeShopId } = useShopContext()

  // Mutation — bound to the active shop so its cache invalidation hits
  // the right `["shop-products", shopId]` prefix. We pass an empty
  // string when `activeShopId` is null; the submit handler refuses to
  // run in that branch so the empty key is never used at runtime.
  const addMutation = useAddShopProduct(activeShopId ?? "")

  // Step state + the picked catalog row. The picked row is held locally
  // (in addition to `product_id` on the form) so step 2 can render a
  // confirmation header with the product name + thumbnail without
  // re-fetching the catalog.
  const [step, setStep] = useState<Step>(1)
  const [picked, setPicked] = useState<Product | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopProductInput>({
    // The shopProductSchema's `.refine` produces an effects-wrapped schema
    // whose inferred input/output diverge slightly from `ShopProductInput`;
    // cast through the shared resolver type to keep the form value type
    // strict at every other call site.
    resolver: zodResolver(
      shopProductSchema,
    ) as unknown as Resolver<ShopProductInput>,
    defaultValues: buildBlankDefaults() as ShopProductInput,
    mode: "onSubmit",
  })

  // Reset both the step and the form whenever the dialog (re)opens so the
  // operator never starts mid-flow on a previous selection.
  useEffect(() => {
    if (!open) return
    setStep(1)
    setPicked(null)
    reset(buildBlankDefaults() as ShopProductInput)
  }, [open, reset])

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handlePick(product: Product) {
    setPicked(product)
    // Seed the form with the catalog defaults so step 2 lands ready to
    // submit. `reset` (not `setValue`) so the underlying RHF state — and
    // every controlled input — picks up the new product_id without a
    // controlled/uncontrolled flip on `cost_price` etc.
    reset(buildDefaultsFromProduct(product) as ShopProductInput)
    setStep(2)
  }

  function handleBack() {
    // Returning to step 1 keeps the previously picked product in `picked`
    // so the operator can re-pick it from the result list and land back
    // on step 2 with the same defaults.
    setStep(1)
  }

  async function onSubmit(values: ShopProductInput) {
    if (!activeShopId) return

    try {
      await addMutation.mutateAsync({
        product_id: values.product_id,
        price: values.price,
        sale_price: values.sale_price,
        cost_price: values.cost_price,
        stock_quantity: values.stock_quantity,
        low_stock_threshold: values.low_stock_threshold,
        max_order_qty: values.max_order_qty,
        is_available: values.is_available,
        is_featured: values.is_featured,
      })
      onOpenChange(false)
    } catch {
      // Stay open so the operator can retry. Field-level errors on the
      // create endpoint are not surfaced per-field by the backend, so we
      // rely on the hook's generic error toast (the edit hook owns the
      // destructive toast contract today).
    }
  }

  const submitting = isSubmitting || addMutation.isPending
  const canSubmit = step === 2 && Boolean(activeShopId) && !submitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shopProducts.list.addButton")}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? t("shopProducts.list.searchPlaceholder")
              : (picked?.name ?? t("shopProducts.list.column.name"))}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <CatalogTypeahead onPick={handlePick} />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            data-testid="add-product-form"
          >
            {/* ── Picked product summary ────────────────────────────── */}
            {picked ? (
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                <CatalogThumb product={picked} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {picked.name}
                  </span>
                  {picked.sku ? (
                    <span className="truncate text-xs text-muted-foreground">
                      SKU {picked.sku}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  data-testid="add-product-back"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Change
                </Button>
              </div>
            ) : null}

            {/* ── Pricing ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                id="add-product-price"
                label={t("shopProducts.list.column.price")}
                step="0.01"
                min={0}
                required
                error={errors.price?.message}
                {...register("price", { valueAsNumber: true })}
              />
              <NullableNumberField
                id="add-product-sale-price"
                label={t("shopProducts.list.column.salePrice")}
                step="0.01"
                min={0}
                control={control}
                name="sale_price"
                error={errors.sale_price?.message}
              />
              <NullableNumberField
                id="add-product-cost-price"
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
                id="add-product-stock"
                label={t("shopProducts.list.column.stockQuantity")}
                step="1"
                min={0}
                required
                error={errors.stock_quantity?.message}
                {...register("stock_quantity", { valueAsNumber: true })}
              />
              <NumberField
                id="add-product-low-stock"
                label={t("shopProducts.list.column.lowStockThreshold")}
                step="1"
                min={0}
                error={errors.low_stock_threshold?.message}
                {...register("low_stock_threshold", { valueAsNumber: true })}
              />
              <NumberField
                id="add-product-max-qty"
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
                    id="add-product-is-available"
                    label={t("shopProducts.list.column.isAvailable")}
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                    testId="add-product-is-available"
                  />
                )}
              />
              <Controller
                control={control}
                name="is_featured"
                render={({ field }) => (
                  <ToggleRow
                    id="add-product-is-featured"
                    label={t("shopProducts.list.column.isFeatured")}
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                    testId="add-product-is-featured"
                  />
                )}
              />
            </div>

            {/* `product_id` is set via reset() when the operator picks a
                catalog row. Surface its validation error here for safety
                (e.g. a future flow that opens the form directly at step
                2 without going through the typeahead). */}
            {errors.product_id?.message ? (
              <p
                className="text-xs text-destructive"
                role="alert"
                data-testid="add-product-product-id-error"
              >
                {errors.product_id.message}
              </p>
            ) : null}

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
                data-testid="add-product-submit"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Adding…
                  </span>
                ) : (
                  t("shopProducts.list.addButton")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddProductDialog
