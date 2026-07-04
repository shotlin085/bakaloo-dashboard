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
import { useCreateCartMilestone, useUpdateCartMilestone } from "@/hooks/useCartMilestones"
import { useCustomerSegments } from "@/hooks/useCustomerSegments"
import { useCoupons } from "@/hooks/useCoupons"
import type {
  CartMilestone,
  CreateCartMilestonePayload,
  CartMilestoneRewardType,
  MilestoneUserType,
  CashbackCreditTrigger,
} from "@/types/cart-milestone.types"

interface CartMilestoneDialogProps {
  open: boolean
  onClose: () => void
  milestone?: CartMilestone | null
}

const REWARD_TYPE_LABELS: Record<CartMilestoneRewardType, string> = {
  CASHBACK: "Wallet cashback (₹)",
  FLAT_DISCOUNT: "Flat discount (₹)",
  COUPON_UNLOCK: "Unlock a coupon",
}

const USER_TYPE_LABELS: Record<MilestoneUserType, string> = {
  ALL: "All users",
  FIRST_TIME: "First-time users only",
  SEGMENT: "A customer segment",
}

const TRIGGER_LABELS: Record<CashbackCreditTrigger, string> = {
  PAYMENT_SUCCESS: "After payment success",
  ORDER_CONFIRMED: "After order confirmed",
  ORDER_DELIVERED: "After order delivered (safest)",
}

const INITIAL: CreateCartMilestonePayload & { isActive: boolean } = {
  name: "",
  minCartAmount: 0,
  rewardType: "CASHBACK",
  rewardValue: undefined,
  maxDiscount: undefined,
  unlockCouponId: undefined,
  messageBefore: "",
  messageAfter: "",
  iconUrl: undefined,
  applicableUserType: "ALL",
  applicableSegmentId: undefined,
  stackableWithCoupon: true,
  priority: 0,
  cashbackCreditTrigger: "ORDER_DELIVERED",
  usageLimitPerUser: undefined,
  isActive: true,
}

export function CartMilestoneDialog({ open, onClose, milestone }: CartMilestoneDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const isEdit = !!milestone
  const createMutation = useCreateCartMilestone()
  const updateMutation = useUpdateCartMilestone()
  const { data: segments } = useCustomerSegments()
  const { data: couponsData } = useCoupons({ limit: 50 })

  useEffect(() => {
    if (milestone) {
      setForm({
        name: milestone.name,
        minCartAmount: milestone.minCartAmount,
        rewardType: milestone.rewardType,
        rewardValue: milestone.rewardValue ?? undefined,
        maxDiscount: milestone.maxDiscount ?? undefined,
        unlockCouponId: milestone.unlockCouponId ?? undefined,
        messageBefore: milestone.messageBefore ?? "",
        messageAfter: milestone.messageAfter ?? "",
        iconUrl: milestone.iconUrl ?? undefined,
        applicableUserType: milestone.applicableUserType,
        applicableSegmentId: milestone.applicableSegmentId ?? undefined,
        stackableWithCoupon: milestone.stackableWithCoupon,
        priority: milestone.priority,
        cashbackCreditTrigger: milestone.cashbackCreditTrigger,
        usageLimitPerUser: milestone.usageLimitPerUser ?? undefined,
        isActive: milestone.isActive,
      })
    } else {
      setForm(INITIAL)
    }
  }, [milestone, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { isActive, ...rest } = form
    const payload = {
      ...rest,
      messageBefore: rest.messageBefore || undefined,
      messageAfter: rest.messageAfter || undefined,
    }
    if (isEdit && milestone) {
      updateMutation.mutate({ id: milestone.id, payload: { ...payload, isActive } }, { onSuccess: onClose })
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const showRewardValue = form.rewardType !== "COUPON_UNLOCK"
  const showMaxDiscount = form.rewardType === "CASHBACK"
  const showCouponPicker = form.rewardType === "COUPON_UNLOCK"
  const showCashbackTrigger = form.rewardType === "CASHBACK"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Cart Milestone" : "Create Cart Milestone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cm-name">Milestone Name *</Label>
            <Input
              id="cm-name"
              placeholder="e.g. ₹500 cashback tier"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cm-min">Minimum Cart Amount *</Label>
            <Input
              id="cm-min"
              type="number"
              min={0}
              value={form.minCartAmount ?? ""}
              onChange={(e) => setForm({ ...form, minCartAmount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reward Type *</Label>
              <Select
                value={form.rewardType}
                onValueChange={(v) => setForm({ ...form, rewardType: v as CartMilestoneRewardType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REWARD_TYPE_LABELS) as CartMilestoneRewardType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {REWARD_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showRewardValue && (
              <div className="space-y-1.5">
                <Label htmlFor="cm-value">Reward Value *</Label>
                <Input
                  id="cm-value"
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
              <Label htmlFor="cm-max">Maximum Reward Cap</Label>
              <Input
                id="cm-max"
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
            <Label htmlFor="cm-before">Message Before Unlock</Label>
            <Input
              id="cm-before"
              placeholder="Add ₹{amount} more to unlock {name}"
              value={form.messageBefore ?? ""}
              onChange={(e) => setForm({ ...form, messageBefore: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use <code>{"{amount}"}</code> and <code>{"{name}"}</code> as placeholders.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cm-after">Message After Unlock</Label>
            <Input
              id="cm-after"
              placeholder="Free delivery unlocked"
              value={form.messageAfter ?? ""}
              onChange={(e) => setForm({ ...form, messageAfter: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Applicable To</Label>
              <Select
                value={form.applicableUserType}
                onValueChange={(v) => setForm({ ...form, applicableUserType: v as MilestoneUserType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(USER_TYPE_LABELS) as MilestoneUserType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {USER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.applicableUserType === "SEGMENT" && (
              <div className="space-y-1.5">
                <Label>Segment</Label>
                <Select
                  value={form.applicableSegmentId ?? ""}
                  onValueChange={(v) => setForm({ ...form, applicableSegmentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(segments ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cm-priority">Priority (higher shows first when tied)</Label>
            <Input
              id="cm-priority"
              type="number"
              value={form.priority ?? 0}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cm-usage-limit">Per-User Redemption Limit</Label>
            <Input
              id="cm-usage-limit"
              type="number"
              min={1}
              placeholder="Unlimited"
              value={form.usageLimitPerUser ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  usageLimitPerUser: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              How many times the same customer can earn this milestone&apos;s reward. Leave blank for unlimited (every qualifying order).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.stackableWithCoupon}
              onCheckedChange={(v) => setForm({ ...form, stackableWithCoupon: v })}
            />
            <Label>Stackable with coupons</Label>
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
