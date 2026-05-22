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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateCoupon, useUpdateCoupon } from "@/hooks/useCoupons"
import type { Coupon, CreateCouponPayload } from "@/types/coupon.types"

interface CouponDialogProps {
  open: boolean
  onClose: () => void
  coupon?: Coupon | null
}

const INITIAL: CreateCouponPayload & { isActive: boolean } = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 0,
  minOrderAmount: 0,
  maxDiscount: undefined,
  usageLimit: undefined,
  perUserLimit: 1,
  validFrom: "",
  validUntil: "",
  isActive: true,
}

export function CouponDialog({ open, onClose, coupon }: CouponDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const createMutation = useCreateCoupon()
  const updateMutation = useUpdateCoupon()
  const isEdit = !!coupon

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code,
        description: coupon.description ?? "",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount ?? undefined,
        usageLimit: coupon.usageLimit ?? undefined,
        perUserLimit: coupon.perUserLimit,
        validFrom: coupon.validFrom ? coupon.validFrom.slice(0, 16) : "",
        validUntil: coupon.validUntil ? coupon.validUntil.slice(0, 16) : "",
        isActive: coupon.isActive,
      })
    } else {
      setForm(INITIAL)
    }
  }, [coupon, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { isActive, ...rest } = form
    const payload = {
      ...rest,
      code: rest.code.toUpperCase().trim(),
      validFrom: rest.validFrom || undefined,
      validUntil: rest.validUntil || undefined,
      maxDiscount: rest.maxDiscount || undefined,
      usageLimit: rest.usageLimit || undefined,
    }

    if (isEdit && coupon) {
      updateMutation.mutate(
        { id: coupon.id, payload: { ...payload, isActive } },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="code">Coupon Code *</Label>
            <Input
              id="code"
              placeholder="e.g. SAVE20"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
              maxLength={50}
              className="font-mono uppercase"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Optional description..."
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Type *</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  setForm({ ...form, discountType: v as "PERCENTAGE" | "FLAT" | "FREE_DELIVERY" | "BOGO" | "CASHBACK" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat (₹)</SelectItem>
                  <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                  <SelectItem value="BOGO">Buy One Get One</SelectItem>
                  <SelectItem value="CASHBACK">Cashback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">
                {form.discountType === "CASHBACK" ? "Cashback %" : form.discountType === "FREE_DELIVERY" ? "Max Delivery ₹" : "Discount Value"} *
              </Label>
              <Input
                id="value"
                type="number"
                min={0.01}
                step={0.01}
                value={form.discountValue || ""}
                onChange={(e) =>
                  setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
          </div>

          {/* Min Order + Max Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min">Min Order Amount</Label>
              <Input
                id="min"
                type="number"
                min={0}
                step={0.01}
                value={form.minOrderAmount || ""}
                onChange={(e) =>
                  setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Max Discount</Label>
              <Input
                id="max"
                type="number"
                min={0}
                step={0.01}
                value={form.maxDiscount ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="No limit"
              />
            </div>
          </div>

          {/* Usage Limit + Per-User Limit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="usage">Total Usage Limit</Label>
              <Input
                id="usage"
                type="number"
                min={1}
                value={form.usageLimit ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usageLimit: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perUser">Per User Limit</Label>
              <Input
                id="perUser"
                type="number"
                min={1}
                value={form.perUserLimit || ""}
                onChange={(e) =>
                  setForm({ ...form, perUserLimit: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">Valid From</Label>
              <Input
                id="from"
                type="datetime-local"
                value={form.validFrom ?? ""}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="until">Valid Until</Label>
              <Input
                id="until"
                type="datetime-local"
                value={form.validUntil ?? ""}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
          </div>

          {/* Active toggle (edit only) */}
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
