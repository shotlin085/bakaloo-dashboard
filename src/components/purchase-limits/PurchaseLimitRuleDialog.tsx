"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductPicker } from "@/components/purchase-limits/ProductPicker"
import { useCategories } from "@/hooks/useCategories"
import { useCreatePurchaseLimitRule, useUpdatePurchaseLimitRule } from "@/hooks/usePurchaseLimits"
import type {
  PurchaseLimitRule,
  PurchaseLimitTargetType,
  PurchaseLimitWindowPeriod,
} from "@/types/purchase-limit.types"

interface PurchaseLimitRuleDialogProps {
  open: boolean
  onClose: () => void
  rule?: PurchaseLimitRule | null
}

interface FormState {
  targetType: PurchaseLimitTargetType
  categoryId: string
  productId: string
  productLabel: string | null
  label: string
  /** Kept as a string for the controlled input (so an empty field isn't coerced to "0"); parsed on submit. */
  maxQtyPerOrder: string
  windowEnabled: boolean
  windowPeriod: PurchaseLimitWindowPeriod
  windowCount: string
  maxQtyPerWindow: string
  isActive: boolean
}

const INITIAL: FormState = {
  targetType: "CATEGORY",
  categoryId: "",
  productId: "",
  productLabel: null,
  label: "",
  maxQtyPerOrder: "",
  windowEnabled: false,
  windowPeriod: "WEEK",
  windowCount: "1",
  maxQtyPerWindow: "",
  isActive: true,
}

const WINDOW_PERIOD_LABELS: Record<PurchaseLimitWindowPeriod, string> = {
  DAY: "day(s)",
  WEEK: "week(s)",
  MONTH: "month(s)",
}

/** Whole positive integer check — mirrors the backend's `>= 1` CHECK constraints. */
function isPositiveInteger(raw: string): boolean {
  if (!raw.trim()) return false
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1
}

export function PurchaseLimitRuleDialog({ open, onClose, rule }: PurchaseLimitRuleDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEdit = !!rule

  const { data: categories } = useCategories()
  const createMutation = useCreatePurchaseLimitRule()
  const updateMutation = useUpdatePurchaseLimitRule()

  useEffect(() => {
    if (rule) {
      setForm({
        targetType: rule.targetType,
        categoryId: rule.categoryId ?? "",
        productId: rule.productId ?? "",
        productLabel: rule.productName,
        label: rule.label,
        maxQtyPerOrder: rule.maxQtyPerOrder != null ? String(rule.maxQtyPerOrder) : "",
        windowEnabled: rule.windowEnabled,
        windowPeriod: rule.windowPeriod ?? "WEEK",
        windowCount: rule.windowCount != null ? String(rule.windowCount) : "1",
        maxQtyPerWindow: rule.maxQtyPerWindow != null ? String(rule.maxQtyPerWindow) : "",
        isActive: rule.isActive,
      })
    } else {
      setForm(INITIAL)
    }
    setErrors({})
  }, [rule, open])

  /**
   * Client-side mirror of the backend's CHECK constraints — gives instant
   * feedback instead of a round-trip for the most common mistakes. The
   * backend remains the source of truth (its exact validation messages are
   * surfaced via toast on a 400 from the mutation hooks).
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {}

    if (!form.label.trim()) {
      next.label = "Label is required"
    }

    if (form.targetType === "CATEGORY" && !form.categoryId) {
      next.categoryId = "Choose a category"
    }
    if (form.targetType === "PRODUCT" && !form.productId) {
      next.productId = "Choose a product"
    }

    const hasPerOrder = form.maxQtyPerOrder.trim() !== ""
    if (hasPerOrder && !isPositiveInteger(form.maxQtyPerOrder)) {
      next.maxQtyPerOrder = "Must be a whole number of at least 1"
    }

    if (!hasPerOrder && !form.windowEnabled) {
      next.caps = "Set a per-order limit, a rolling-window limit, or both"
    }

    if (form.windowEnabled) {
      if (!isPositiveInteger(form.windowCount)) {
        next.windowCount = "Must be a whole number of at least 1"
      }
      if (!isPositiveInteger(form.maxQtyPerWindow)) {
        next.maxQtyPerWindow = "Must be a whole number of at least 1"
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const basePayload = {
      categoryId: form.targetType === "CATEGORY" ? form.categoryId || undefined : undefined,
      productId: form.targetType === "PRODUCT" ? form.productId || undefined : undefined,
      label: form.label.trim(),
      maxQtyPerOrder: form.maxQtyPerOrder.trim() ? parseInt(form.maxQtyPerOrder, 10) : null,
      windowEnabled: form.windowEnabled,
      windowPeriod: form.windowEnabled ? form.windowPeriod : undefined,
      windowCount: form.windowEnabled ? parseInt(form.windowCount, 10) : undefined,
      maxQtyPerWindow: form.windowEnabled ? parseInt(form.maxQtyPerWindow, 10) : undefined,
    }

    if (isEdit && rule) {
      updateMutation.mutate(
        { id: rule.id, payload: { ...basePayload, isActive: form.isActive } },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(
        { ...basePayload, targetType: form.targetType },
        { onSuccess: onClose }
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const windowErrorText = [errors.maxQtyPerWindow, errors.windowCount].filter(Boolean).join(" · ")

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase Limit Rule" : "Create Purchase Limit Rule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target type — immutable once created */}
          <div className="space-y-1.5">
            <Label>Applies To *</Label>
            {isEdit ? (
              <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                {form.targetType === "CATEGORY" ? "Category" : "Product"}{" "}
                <span className="text-xs">(can&apos;t be changed after creation)</span>
              </p>
            ) : (
              <Select
                value={form.targetType}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    targetType: v as PurchaseLimitTargetType,
                    categoryId: "",
                    productId: "",
                    productLabel: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CATEGORY">Category</SelectItem>
                  <SelectItem value="PRODUCT">Product</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category / Product picker, shown per targetType */}
          {form.targetType === "CATEGORY" ? (
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category..." />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <ProductPicker
                value={form.productId || null}
                valueLabel={form.productLabel}
                onChange={(id, name) => setForm({ ...form, productId: id, productLabel: name })}
              />
              {errors.productId && <p className="text-xs text-destructive">{errors.productId}</p>}
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="pl-label">Label *</Label>
            <Input
              id="pl-label"
              placeholder="e.g. Dairy daily cap"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              maxLength={150}
              required
            />
            {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
          </div>

          {/* Per-order cap */}
          <div className="space-y-1.5">
            <Label htmlFor="pl-per-order">Limit per order</Label>
            <Input
              id="pl-per-order"
              type="number"
              min={1}
              step={1}
              placeholder="No per-order limit"
              value={form.maxQtyPerOrder}
              onChange={(e) => setForm({ ...form, maxQtyPerOrder: e.target.value })}
            />
            {errors.maxQtyPerOrder && <p className="text-xs text-destructive">{errors.maxQtyPerOrder}</p>}
          </div>

          {/* Rolling-window cap */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.windowEnabled}
                onCheckedChange={(v) => setForm({ ...form, windowEnabled: v })}
              />
              <Label>Also limit over time</Label>
            </div>

            {form.windowEnabled && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Max</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  aria-label="Max units per window"
                  value={form.maxQtyPerWindow}
                  onChange={(e) => setForm({ ...form, maxQtyPerWindow: e.target.value })}
                  className="w-20 h-8"
                />
                <span className="text-muted-foreground">units every</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  aria-label="Window count"
                  value={form.windowCount}
                  onChange={(e) => setForm({ ...form, windowCount: e.target.value })}
                  className="w-16 h-8"
                />
                <Select
                  value={form.windowPeriod}
                  onValueChange={(v) => setForm({ ...form, windowPeriod: v as PurchaseLimitWindowPeriod })}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(WINDOW_PERIOD_LABELS) as PurchaseLimitWindowPeriod[]).map((period) => (
                      <SelectItem key={period} value={period}>
                        {WINDOW_PERIOD_LABELS[period]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.windowEnabled && windowErrorText && (
              <p className="text-xs text-destructive">{windowErrorText}</p>
            )}
          </div>

          {errors.caps && <p className="text-xs text-destructive">{errors.caps}</p>}

          {/* Active toggle (edit only) — matches CouponDialog's convention */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
