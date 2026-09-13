"use client"

import { useState } from "react"
import { Landmark, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useB2BOrders, useRecordB2BSettlement } from "@/hooks/useOrders"
import { formatDateTime } from "@/lib/utils"
import type { B2BOrder, B2BSettlementMethod } from "@/types"

/**
 * B2B Collections — every APPROVED "Place Order" credit order that still
 * has money owed against it (total_amount > b2b_amount_settled), so an
 * admin can see at a glance who owes what without opening each order's
 * detail drawer one at a time. Recording a collection here does the exact
 * same thing as the settlement form inside the order detail drawer
 * (B2BApprovalSection) — it's just surfaced as its own focused worklist.
 */
export default function B2BCollectionsPage() {
  const [page, setPage] = useState(1)
  const [collectTarget, setCollectTarget] = useState<B2BOrder | null>(null)

  const { data, isLoading } = useB2BOrders({ page, limit: 20, hasPendingCollection: true })
  const orders = data?.orders ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="B2B Collections"
        subtitle="Approved credit orders with payment still pending — record what the customer actually paid"
      />

      {isLoading ? (
        <LoadingSkeleton variant="table" count={8} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-10 w-10" />}
          title="Nothing pending collection"
          description="Every approved B2B credit order has been fully settled."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Order Total</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const total = Number(order.total_amount)
                const settled = order.b2b_amount_settled ?? 0
                const pending = Math.max(0, total - settled)
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>{order.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                    </TableCell>
                    <TableCell>{order.company_name || "—"}</TableCell>
                    <TableCell>₹{total.toFixed(2)}</TableCell>
                    <TableCell>₹{settled.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-amber-200 bg-amber-500/15 text-amber-700">
                        ₹{pending.toFixed(2)} pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setCollectTarget(order)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Collect
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CollectDialog order={collectTarget} onClose={() => setCollectTarget(null)} />
    </div>
  )
}

function CollectDialog({ order, onClose }: { order: B2BOrder | null; onClose: () => void }) {
  const recordSettlement = useRecordB2BSettlement()
  const [method, setMethod] = useState<B2BSettlementMethod>("CASH")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const total = order ? Number(order.total_amount) : 0
  const settled = order?.b2b_amount_settled ?? 0
  const remaining = Math.max(0, total - settled)

  const parsedAmount = Number(amount)
  const canSubmit =
    !!order &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= remaining + 0.01 &&
    !recordSettlement.isPending

  const reset = () => {
    setMethod("CASH")
    setAmount("")
    setNote("")
  }

  const handleSubmit = () => {
    if (!order || !canSubmit) return
    recordSettlement.mutate(
      { orderId: order.id, payload: { method, amount: parsedAmount, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record collection — {order?.order_number}</DialogTitle>
          <DialogDescription>
            ₹{remaining.toFixed(2)} pending of ₹{total.toFixed(2)} order total.
            You can record this across multiple visits — e.g. part cash, part online.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as B2BSettlementMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                max={remaining}
                step="0.01"
                placeholder={`Up to ₹${remaining.toFixed(2)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. UPI reference"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {recordSettlement.isPending ? "Recording..." : "Record Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
