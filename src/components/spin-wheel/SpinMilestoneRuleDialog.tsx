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
import { useCreateSpinMilestoneRule, useUpdateSpinMilestoneRule } from "@/hooks/useSpinWheel"
import type {
  SpinMilestoneRule,
  CreateSpinMilestoneRulePayload,
  SpinMilestoneType,
} from "@/types/spin-wheel.types"

interface SpinMilestoneRuleDialogProps {
  open: boolean
  onClose: () => void
  rule?: SpinMilestoneRule | null
}

const TYPE_LABELS: Record<SpinMilestoneType, string> = {
  ORDER_COUNT: "Delivered order count",
  TOTAL_SPEND: "Total spend (₹)",
}

const INITIAL: CreateSpinMilestoneRulePayload & { isActive: boolean } = {
  milestoneType: "ORDER_COUNT",
  threshold: 5,
  bonusSpins: 1,
  isRepeating: false,
  isActive: true,
}

export function SpinMilestoneRuleDialog({ open, onClose, rule }: SpinMilestoneRuleDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const isEdit = !!rule
  const createMutation = useCreateSpinMilestoneRule()
  const updateMutation = useUpdateSpinMilestoneRule()

  useEffect(() => {
    if (rule) {
      setForm({
        milestoneType: rule.milestoneType,
        threshold: rule.threshold,
        bonusSpins: rule.bonusSpins,
        isRepeating: rule.isRepeating,
        isActive: rule.isActive,
      })
    } else {
      setForm(INITIAL)
    }
  }, [rule, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { isActive, ...rest } = form
    if (isEdit && rule) {
      updateMutation.mutate({ id: rule.id, payload: { ...rest, isActive } }, { onSuccess: onClose })
    } else {
      createMutation.mutate(rest, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Milestone Rule" : "New Milestone Rule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Milestone Type *</Label>
            <Select
              value={form.milestoneType}
              onValueChange={(v) => setForm({ ...form, milestoneType: v as SpinMilestoneType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as SpinMilestoneType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smr-threshold">
              {form.milestoneType === "ORDER_COUNT" ? "Every Nth delivered order" : "Spend threshold (₹)"} *
            </Label>
            <Input
              id="smr-threshold"
              type="number"
              min={1}
              value={form.threshold ?? ""}
              onChange={(e) => setForm({ ...form, threshold: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smr-bonus">Bonus Spins Granted *</Label>
            <Input
              id="smr-bonus"
              type="number"
              min={1}
              value={form.bonusSpins ?? ""}
              onChange={(e) => setForm({ ...form, bonusSpins: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isRepeating}
                onCheckedChange={(v) => setForm({ ...form, isRepeating: v })}
              />
              <Label>Repeats every time the threshold is crossed again</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-[52px]">
              {form.milestoneType === "ORDER_COUNT"
                ? "On: grants spins at the 5th, 10th, 15th... delivered order. Off: only once, the first time they hit 5."
                : "On: grants spins every ₹500 of total spend, over and over. Off: only once, the first time they cross ₹500."}
            </p>
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
