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
import { useCreateFirstTimeOffer, useUpdateFirstTimeOffer } from "@/hooks/useFirstTimeOffers"
import { useCoupons } from "@/hooks/useCoupons"
import type {
  FirstTimeOffer,
  CreateFirstTimeOfferPayload,
  FirstTimeOfferRewardType,
  CashbackCreditTrigger,
} from "@/types/first-time-offer.types"

interface FirstTimeOfferDialogProps {
  open: boolean
  onClose: () => void
  offer?: FirstTimeOffer | null
}

const REWARD_TYPE_LABELS: Record<FirstTimeOfferRewardType, string> = {
  FREE_DELIVERY: "Free delivery",
  FLAT_DISCOUNT: "Flat discount (₹)",
  PERCENTAGE_DISCOUNT: "Percentage discount (%)",
  WALLET_CASHBACK: "Wallet cashback (₹)",
  COUPON_UNLOCK: "Unlock a coupon",
}

const TRIGGER_LABELS: Record<CashbackCreditTrigger, string> = {
  PAYMENT_SUCCESS: "After payment success",
  ORDER_CONFIRMED: "After order confirmed",
  ORDER_DELIVERED: "After order delivered (safest)",
}

const INITIAL: CreateFirstTimeOfferPayload & { isActive: boolean } = {
  name: "",
  minOrderAmount: 0,
  rewardType: "FREE_DELIVERY",
  rewardValue: undefined,
  maxDiscount: undefined,
  unlockCouponId: undefined,
  startAt: "",
  endAt: "",
  autoApply: true,
  paymentMethodScope: "ALL",
  cashbackCreditTrigger: "ORDER_DELIVERED",
  isActive: true,
}

export function FirstTimeOfferDialog({ open, onClose, offer }: FirstTimeOfferDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const isEdit = !!offer
  const createMutation = useCreateFirstTimeOffer()
  const updateMutation = useUpdateFirstTimeOffer()
  const { data: couponsData } = useCoupons({ limit: 50 })

  useEffect(() => {
    if (offer) {
      setForm({
        name: offer.name,
        minOrderAmount: offer.minOrderAmount,
        rewardType: offer.rewardType,
        rewardValue: offer.rewardValue ?? undefined,
        maxDiscount: offer.maxDiscount ?? undefined,
        unlockCouponId: offer.unlockCouponId ?? undefined,
        startAt: offer.startAt ? offer.startAt.slice(0, 16) : "",
        endAt: offer.endAt ? offer.endAt.slice(0, 16) : "",
        autoApply: offer.autoApply,
        paymentMethodScope: offer.paymentMethodScope,
        cashbackCreditTrigger: offer.cashbackCreditTrigger,
        isActive: offer.isActive,
      })
    } else {
      setForm(INITIAL)
    }
  }, [offer, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { isActive, ...rest } = form
    const payload = {
      ...rest,
      startAt: rest.startAt || undefined,
      endAt: rest.endAt || undefined,
    }

    if (isEdit && offer) {
      updateMutation.mutate({ id: offer.id, payload: { ...payload, isActive } }, { onSuccess: onClose })
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const showRewardValue = form.rewardType === "FLAT_DISCOUNT" || form.rewardType === "PERCENTAGE_DISCOUNT" || form.rewardType === "WALLET_CASHBACK"
  const showMaxDiscount = form.rewardType === "PERCENTAGE_DISCOUNT"
  const showCouponPicker = form.rewardType === "COUPON_UNLOCK"
  const showCashbackTrigger = form.rewardType === "WALLET_CASHBACK"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit First-Time Offer" : "Create First-Time Offer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ft-name">Offer Name *</Label>
            <Input
              id="ft-name"
              placeholder="e.g. First order above ₹999"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ft-min">Minimum Order Amount</Label>
            <Input
              id="ft-min"
              type="number"
              min={0}
              value={form.minOrderAmount ?? ""}
              onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reward Type *</Label>
              <Select
                value={form.rewardType}
                onValueChange={(v) => setForm({ ...form, rewardType: v as FirstTimeOfferRewardType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REWARD_TYPE_LABELS) as FirstTimeOfferRewardType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {REWARD_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showRewardValue && (
              <div className="space-y-1.5">
                <Label htmlFor="ft-value">Reward Value *</Label>
                <Input
                  id="ft-value"
                  type="number"
                  min={0}
                  value={form.rewardValue ?? ""}
                  onChange={(e) => setForm({ ...form, rewardValue: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            )}
          </div>

          {showMaxDiscount && (
            <div className="space-y-1.5">
              <Label htmlFor="ft-max">Max Discount Cap</Label>
              <Input
                id="ft-max"
                type="number"
                min={0}
                value={form.maxDiscount ?? ""}
                onChange={(e) =>
                  setForm({ ...form, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                placeholder="No cap"
              />
            </div>
          )}

          {showCouponPicker && (
            <div className="space-y-1.5">
              <Label>Coupon to Unlock *</Label>
              <Select
                value={form.unlockCouponId ?? ""}
                onValueChange={(v) => setForm({ ...form, unlockCouponId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a coupon..." />
                </SelectTrigger>
                <SelectContent>
                  {(couponsData?.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showCashbackTrigger && (
            <div className="space-y-1.5">
              <Label>Cashback Credit Timing</Label>
              <Select
                value={form.cashbackCreditTrigger}
                onValueChange={(v) => setForm({ ...form, cashbackCreditTrigger: v as CashbackCreditTrigger })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABELS) as CashbackCreditTrigger[]).map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {TRIGGER_LABELS[trigger]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={form.paymentMethodScope}
              onValueChange={(v) => setForm({ ...form, paymentMethodScope: v as "ALL" | "ONLINE_ONLY" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All payment methods (incl. COD)</SelectItem>
                <SelectItem value="ONLINE_ONLY">Online payment only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ft-from">Start Date</Label>
              <Input
                id="ft-from"
                type="datetime-local"
                value={form.startAt ?? ""}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ft-until">End Date</Label>
              <Input
                id="ft-until"
                type="datetime-local"
                value={form.endAt ?? ""}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.autoApply}
              onCheckedChange={(v) => setForm({ ...form, autoApply: v })}
            />
            <Label>Auto-apply (no claim step needed)</Label>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
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
