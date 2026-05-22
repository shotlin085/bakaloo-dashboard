"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Phone,
  MapPin,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  User,
  CreditCard,
  RotateCcw,
  Ban,
  Printer,
} from "lucide-react"
import {
  useOrderDetail,
  useUpdateOrderStatus,
  useDownloadInvoice,
  useRefundOrder,
  useCancelOrder,
  useDownloadPackingSlip,
} from "@/hooks/useOrders"
import {
  STATUS_CONFIG,
  STATUS_TRANSITIONS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
} from "@/lib/constants"
import { formatINR, formatDateTime, formatRelativeTime, cn } from "@/lib/utils"

interface OrderDetailDrawerProps {
  orderId: string | null
  open: boolean
  onClose: () => void
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  CONFIRMED: <CheckCircle2 className="h-3.5 w-3.5" />,
  PREPARING: <Package className="h-3.5 w-3.5" />,
  PACKED: <Package className="h-3.5 w-3.5" />,
  OUT_FOR_DELIVERY: <Truck className="h-3.5 w-3.5" />,
  DELIVERED: <CheckCircle2 className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
  REFUNDED: <Circle className="h-3.5 w-3.5" />,
}

export function OrderDetailDrawer({ orderId, open, onClose }: OrderDetailDrawerProps) {
  const { data: order, isLoading } = useOrderDetail(orderId)
  const updateStatus = useUpdateOrderStatus()
  const downloadInvoice = useDownloadInvoice()
  const refundOrder = useRefundOrder()
  const cancelOrder = useCancelOrder()
  const downloadPacking = useDownloadPackingSlip()

  const [refundOpen, setRefundOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "", refundTo: "wallet" })
  const [cancelForm, setCancelForm] = useState({ reason: "", refundTo: "wallet" })

  const allowedTransitions = order
    ? STATUS_TRANSITIONS[order.status] ?? []
    : []
  const hasCartEnhancementDetails = !!order && (
    Number(order.handling_fee || 0) > 0 ||
    Number(order.late_night_fee || 0) > 0 ||
    Number(order.tip_amount || 0) > 0 ||
    Number(order.savings_total || 0) > 0 ||
    Boolean(order.delivery_instructions?.trim())
  )

  const handleStatusChange = (newStatus: string) => {
    if (!order) return
    updateStatus.mutate({
      orderId: order.id,
      payload: { status: newStatus as OrderStatus },
    })
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle className="flex items-center justify-between">
            <span>
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <>Order #{order?.order_number}</>
              )}
            </span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="px-6 pb-6 space-y-5">
            {isLoading ? (
              <OrderDrawerSkeleton />
            ) : !order ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Order not found
              </div>
            ) : (
              <>
                {/* Status + Actions */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="text-xs px-2.5 py-1 border-0 font-medium"
                    style={{
                      backgroundColor: STATUS_CONFIG[order.status]?.bg ?? "#F3F4F6",
                      color: STATUS_CONFIG[order.status]?.text ?? "#6B7280",
                    }}
                  >
                    {STATUS_CONFIG[order.status]?.icon} {STATUS_CONFIG[order.status]?.label ?? order.status}
                  </Badge>

                  {allowedTransitions.length > 0 && (
                    <Select
                      onValueChange={handleStatusChange}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedTransitions.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            → {STATUS_CONFIG[s]?.label ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => downloadPacking.mutate(order.id)}
                      disabled={downloadPacking.isPending}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Slip
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => downloadInvoice.mutate(order.id)}
                      disabled={downloadInvoice.isPending}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Invoice
                    </Button>
                  </div>
                </div>

                {/* Refund / Cancel Actions */}
                {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
                  <div className="flex items-center gap-2">
                    {order.status === "DELIVERED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setRefundForm({ amount: String(order.total_amount), reason: "", refundTo: "wallet" })
                          setRefundOpen(true)
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Process Refund
                      </Button>
                    )}
                    {!["DELIVERED", "OUT_FOR_DELIVERY"].includes(order.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => {
                          setCancelForm({ reason: "", refundTo: "wallet" })
                          setCancelOpen(true)
                        }}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" />
                        Cancel Order
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Placed {formatDateTime(order.created_at)} · {formatRelativeTime(order.created_at)}
                </p>

                <Separator />

                {/* Status Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Status Timeline</h4>
                  <div className="space-y-0">
                    {order.timeline.map((entry, i) => {
                      const config = STATUS_CONFIG[entry.to_status as OrderStatus]
                      const isLast = i === order.timeline.length - 1
                      return (
                        <div key={entry.changed_at + entry.to_status} className="flex gap-3">
                          {/* Dot + Line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full",
                                isLast ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {TIMELINE_ICONS[entry.to_status] ?? <Circle className="h-3.5 w-3.5" />}
                            </div>
                            {!isLast && <div className="w-px h-6 bg-border" />}
                          </div>
                          {/* Content */}
                          <div className="pb-3">
                            <p className="text-sm font-medium" style={{ color: config?.text }}>
                              {config?.label ?? entry.to_status}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDateTime(entry.changed_at)}
                              {entry.changed_by_name && ` · by ${entry.changed_by_name}`}
                            </p>
                            {entry.note && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                &quot;{entry.note}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Customer */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Customer
                  </h4>
                  <div className="text-sm">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {order.customer_phone}
                      {order.customer_email && ` · ${order.customer_email}`}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Items ({order.items?.length ?? 0})
                  </h4>
                  <div className="space-y-3">
                    {order.items?.map((item) => (
                      <div key={item.id ?? item.product_id} className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {item.thumbnail_url ? (
                            <Image
                              src={item.thumbnail_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {formatINR(item.price)}
                            {item.unit && ` · ${item.unit}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{formatINR(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Payment
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    <Row label="Subtotal" value={formatINR(order.subtotal)} />
                    <Row label="Delivery Fee" value={formatINR(order.delivery_fee)} />
                    {order.platform_fee > 0 && (
                      <Row label="Platform Fee" value={formatINR(order.platform_fee)} />
                    )}
                    {order.tax_amount > 0 && (
                      <Row label="Tax" value={formatINR(order.tax_amount)} />
                    )}
                    {order.discount_amount > 0 && (
                      <Row
                        label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                        value={`-${formatINR(order.discount_amount)}`}
                        className="text-success"
                      />
                    )}
                    <Separator />
                    <Row
                      label="Total"
                      value={formatINR(order.total_amount)}
                      className="font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                      {order.payment?.status && ` · ${order.payment.status}`}
                      {order.payment?.razorpay_payment_id &&
                        ` · ${order.payment.razorpay_payment_id}`}
                    </p>
                  </div>
                </div>

                <Separator />

                {hasCartEnhancementDetails && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Cart Enhancement Details
                      </h4>
                      <div className="space-y-1.5 text-sm">
                        {order.handling_fee > 0 && (
                          <Row
                            label="Handling Fee"
                            value={formatINR(order.handling_fee)}
                          />
                        )}
                        {order.late_night_fee > 0 && (
                          <Row
                            label="Late Night Fee"
                            value={formatINR(order.late_night_fee)}
                          />
                        )}
                        {order.tip_amount > 0 && (
                          <Row label="Tip Amount" value={formatINR(order.tip_amount)} />
                        )}
                        {order.savings_total > 0 && (
                          <Row
                            label="Savings Total"
                            value={formatINR(order.savings_total)}
                            className="text-success"
                          />
                        )}
                        {order.delivery_instructions?.trim() && (
                          <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Delivery Instructions
                            </span>
                            <p className="text-sm leading-5 text-foreground">
                              {order.delivery_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                {/* Delivery */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Delivery
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      {order.delivery_address?.line1 ||
                        order.delivery_address?.address_line ||
                        "Address not available"}
                    </p>
                    {order.delivery_address?.city && (
                      <p>
                        {order.delivery_address.city}
                        {order.delivery_address.state && `, ${order.delivery_address.state}`}
                        {order.delivery_address.pincode && ` – ${order.delivery_address.pincode}`}
                      </p>
                    )}
                    {order.delivery_notes && (
                      <p className="text-xs italic mt-1">📝 {order.delivery_notes}</p>
                    )}
                  </div>

                  {/* Rider info */}
                  {order.rider_name && (
                    <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Truck className="h-4 w-4 text-brand-500" />
                      <div className="text-sm">
                        <span className="font-medium">{order.rider_name}</span>
                        {order.rider_phone && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            <Phone className="h-3 w-3 inline mr-0.5" />
                            {order.rider_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery assignment details */}
                  {order.delivery && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {order.delivery.distance_km && (
                        <p>Distance: {order.delivery.distance_km} km</p>
                      )}
                      {order.delivery.delivery_time_minutes && (
                        <p>Delivery time: {order.delivery.delivery_time_minutes} min</p>
                      )}
                      {order.delivery.delivery_otp && (
                        <p>OTP: <span className="font-mono font-semibold text-foreground">{order.delivery.delivery_otp}</span></p>
                      )}
                    </div>
                  )}

                  {/* Proof photo */}
                  {order.proof_photo_url && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground mb-1">Delivery Proof</p>
                      <div className="relative h-32 w-full rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={order.proof_photo_url}
                          alt="Delivery proof"
                          fill
                          className="object-cover"
                          sizes="400px"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Refund Dialog */}
    <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Refund Amount (₹)</Label>
            <Input
              type="number"
              min={1}
              max={order?.total_amount ?? 0}
              value={refundForm.amount}
              onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max: {order ? formatINR(order.total_amount) : "—"}
            </p>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={refundForm.reason}
              onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Reason for refund..."
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Refund To</Label>
            <Select
              value={refundForm.refundTo}
              onValueChange={(v) => setRefundForm((f) => ({ ...f, refundTo: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet">Wallet Balance</SelectItem>
                <SelectItem value="original">Original Payment Method</SelectItem>
                <SelectItem value="manual">Manual / Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!refundForm.amount || !refundForm.reason || refundOrder.isPending}
            onClick={() => {
              if (!order) return
              refundOrder.mutate({
                orderId: order.id,
                payload: {
                  amount: parseFloat(refundForm.amount),
                  reason: refundForm.reason,
                  refundTo: refundForm.refundTo as "wallet" | "original" | "manual",
                },
              }, { onSuccess: () => setRefundOpen(false) })
            }}
          >
            {refundOrder.isPending ? "Processing..." : "Process Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Cancel Dialog */}
    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Cancellation Reason</Label>
            <Select
              value={cancelForm.reason}
              onValueChange={(v) => setCancelForm((f) => ({ ...f, reason: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer requested">Customer requested</SelectItem>
                <SelectItem value="Out of stock">Out of stock</SelectItem>
                <SelectItem value="Payment failed">Payment failed</SelectItem>
                <SelectItem value="Fraudulent order">Fraudulent order</SelectItem>
                <SelectItem value="Delivery not possible">Delivery not possible</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Refund To</Label>
            <Select
              value={cancelForm.refundTo}
              onValueChange={(v) => setCancelForm((f) => ({ ...f, refundTo: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet">Wallet Balance</SelectItem>
                <SelectItem value="original">Original Payment Method</SelectItem>
                <SelectItem value="none">No Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
          <Button
            variant="destructive"
            disabled={!cancelForm.reason || cancelOrder.isPending}
            onClick={() => {
              if (!order) return
              cancelOrder.mutate({
                orderId: order.id,
                payload: {
                  reason: cancelForm.reason,
                  refundTo: cancelForm.refundTo as "wallet" | "original" | "none",
                },
              }, { onSuccess: () => setCancelOpen(false) })
            }}
          >
            {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

function Row({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function OrderDrawerSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-[160px]" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Separator />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
