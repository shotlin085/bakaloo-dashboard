"use client"

import { useState } from "react"
import { Landmark, CheckCircle2, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  useApproveB2BOrder,
  useB2BOrderDetail,
  useRecordB2BSettlement,
} from "@/hooks/useOrders"
import { formatDateTime } from "@/lib/utils"
import type { B2BSettlementMethod, OrderDetail } from "@/types"

const SETTLEMENT_METHOD_LABEL: Record<B2BSettlementMethod, string> = {
  CASH: "Cash",
  ONLINE: "Online",
  OTHER: "Other",
}

/**
 * B2B "Place Order" approval + settlement panel — rendered in the order
 * detail drawer in place of Rider Assignment (see OrderDetailDrawer),
 * since B2B credit orders never go through the rider-assignment system.
 *
 * A pending order shows only the credit-limit context and an Approve
 * action (approval is what actually deducts stock and confirms the
 * order — see AdminOrdersService#approveB2BOrder). An approved order
 * additionally shows the running settlement history and a form to record
 * how the customer actually paid, which can be entered across multiple
 * partial visits (e.g. ₹200 cash today, ₹500 online next week) rather
 * than all at once.
 */
export function B2BApprovalSection({ order }: { order: OrderDetail }) {
  const { data: detail } = useB2BOrderDetail(order.id)
  const approve = useApproveB2BOrder()
  const recordSettlement = useRecordB2BSettlement()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [method, setMethod] = useState<B2BSettlementMethod>("CASH")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const isPending = order.b2b_approval_status === "PENDING"
  const totalAmount = order.total_amount
  const settled = order.b2b_amount_settled ?? 0
  const remaining = Math.max(0, totalAmount - settled)
  const isFullySettled = remaining <= 0.01

  const parsedAmount = Number(amount)
  const canSubmit =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= remaining + 0.01 &&
    !recordSettlement.isPending

  const handleRecordSettlement = () => {
    if (!canSubmit) return
    recordSettlement.mutate(
      { orderId: order.id, payload: { method, amount: parsedAmount, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          setAmount("")
          setNote("")
        },
      }
    )
  }

  return (
    <div className="mt-3 p-3 rounded-lg border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium">B2B Credit Order</span>
        </div>
        <Badge
          variant="outline"
          className={
            isPending
              ? "border-amber-200 bg-amber-500/15 text-amber-700"
              : "border-emerald-200 bg-emerald-500/15 text-emerald-700"
          }
        >
          {isPending ? (
            <>
              <Clock className="mr-1 h-3 w-3" /> Admin Approval Pending
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
            </>
          )}
        </Badge>
      </div>

      {(detail?.company_name || detail?.monthly_credit_limit != null) && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {detail?.company_name && (
            <div>
              <span className="block text-[10px] uppercase tracking-wide">Company</span>
              <span className="text-foreground font-medium">{detail.company_name}</span>
            </div>
          )}
          {detail?.monthly_credit_limit != null && (
            <div>
              <span className="block text-[10px] uppercase tracking-wide">Credit Limit</span>
              <span className="text-foreground font-medium">
                ₹{Number(detail.monthly_credit_limit).toFixed(0)}
              </span>
            </div>
          )}
          {detail?.current_balance != null && (
            <div>
              <span className="block text-[10px] uppercase tracking-wide">Current Balance Owed</span>
              <span className="text-foreground font-medium">
                ₹{Number(detail.current_balance).toFixed(0)}
              </span>
            </div>
          )}
        </div>
      )}

      {isPending ? (
        <>
          <p className="text-xs text-muted-foreground">
            Placed on credit — stock has not been deducted yet. Approve to confirm
            the order and deduct stock.
          </p>
          <Button
            size="sm"
            className="w-full"
            disabled={approve.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {approve.isPending ? "Approving..." : "Approve Order"}
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve this B2B order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deducts stock for every item and confirms the order —
                  stock is re-checked fresh at this moment, so approval will
                  fail if something has since sold out elsewhere.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => approve.mutate(order.id)}>
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Settled</span>
            <span className={isFullySettled ? "font-medium text-emerald-700" : "font-medium"}>
              ₹{settled.toFixed(2)} of ₹{totalAmount.toFixed(2)}
              {isFullySettled ? " · Fully settled" : ` · ₹${remaining.toFixed(2)} pending`}
            </span>
          </div>

          {(detail?.settlements ?? []).length > 0 && (
            <div className="space-y-1">
              {detail!.settlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs rounded-md bg-background px-2 py-1.5 border">
                  <div>
                    <span className="font-medium">{SETTLEMENT_METHOD_LABEL[s.method]}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatDateTime(s.created_at)}
                      {s.recorded_by_name ? ` · ${s.recorded_by_name}` : ""}
                    </span>
                    {s.note && <div className="text-muted-foreground mt-0.5">{s.note}</div>}
                  </div>
                  <span className="font-medium">₹{Number(s.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {!isFullySettled && (
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs">Record a payment received</Label>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <Select value={method} onValueChange={(v) => setMethod(v as B2BSettlementMethod)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={remaining}
                  step="0.01"
                  placeholder={`Up to ₹${remaining.toFixed(2)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Input
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={!canSubmit}
                onClick={handleRecordSettlement}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {recordSettlement.isPending ? "Recording..." : "Record Settlement"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
