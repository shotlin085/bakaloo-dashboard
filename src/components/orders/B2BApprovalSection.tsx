"use client"

import { useState } from "react"
import { Landmark, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import { useApproveB2BOrder, useB2BOrderDetail } from "@/hooks/useOrders"
import { formatDateTime } from "@/lib/utils"
import { B2BSettlementEntryForm, SETTLEMENT_METHOD_LABEL } from "./B2BSettlementEntryForm"
import { B2BPaymentDueDateField } from "./B2BPaymentDueDateField"
import type { OrderDetail } from "@/types"

/**
 * B2B "Place Order" approval + settlement panel — rendered in the order
 * detail drawer in place of Rider Assignment (see OrderDetailDrawer),
 * since B2B credit orders never go through the rider-assignment system.
 *
 * A pending order shows only the company name and an Approve action
 * (approval is what actually deducts stock and confirms the order — see
 * AdminOrdersService#approveB2BOrder). There's no credit-limit concept —
 * an approved B2B account can place an order of any size. An approved
 * order additionally shows the running settlement history, an optional
 * payment-schedule date, and a form to record how the customer actually
 * paid, which can be entered across multiple partial visits (e.g. ₹200
 * cash today, ₹500 UPI next week) rather than all at once.
 */
export function B2BApprovalSection({ order }: { order: OrderDetail }) {
  const { data: detail } = useB2BOrderDetail(order.id)
  const approve = useApproveB2BOrder()

  const [confirmOpen, setConfirmOpen] = useState(false)

  const isPending = order.b2b_approval_status === "PENDING"
  const totalAmount = Number(order.total_amount)
  const settled = Number(order.b2b_amount_settled ?? 0)
  const remaining = Math.max(0, totalAmount - settled)
  const isFullySettled = remaining <= 0.01

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

      {detail?.company_name && (
        <div className="text-xs text-muted-foreground">
          <span className="block text-[10px] uppercase tracking-wide">Company</span>
          <span className="text-foreground font-medium">{detail.company_name}</span>
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

          {!isFullySettled && (
            <B2BPaymentDueDateField orderId={order.id} dueDate={order.b2b_payment_due_date} />
          )}

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
              <B2BSettlementEntryForm orderId={order.id} remaining={remaining} compact />
            </div>
          )}
        </>
      )}
    </div>
  )
}
