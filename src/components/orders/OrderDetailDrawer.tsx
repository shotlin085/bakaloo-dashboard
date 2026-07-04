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
  Navigation,
  CalendarClock,
} from "lucide-react"
import {
  useOrderDetail,
  useUpdateOrderStatus,
  useDownloadInvoice,
  useRefundOrder,
  useCancelOrder,
  useRescheduleOrder,
  useDownloadPackingSlip,
} from "@/hooks/useOrders"
import { useShopContextStore } from "@/store/shop-context.store"
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
  const rescheduleOrder = useRescheduleOrder()
  const downloadPacking = useDownloadPackingSlip()

  // Vendor scope enforcement (Req 10.10): a vendor (`assignedShopIds.length > 0`)
  // who opens an order whose `shop_id` is not in their locked shop list must
  // see the 404 empty state rather than the underlying record. Super-admins
  // (`assignedShopIds = []`) bypass the check entirely. The check is skipped
  // while the detail is still loading so the loading skeleton renders
  // normally; once the response arrives, an unknown `shop_id` triggers the
  // 404 path. A missing/`null`/`undefined` `shop_id` is treated as "not
  // enforced" so legacy unscoped order responses (pre task 12.1) do not
  // regress before the backend ships the new field on every endpoint.
  const assignedShopIds = useShopContextStore((s) => s.assignedShopIds)
  const isVendor = assignedShopIds.length > 0
  const orderShopId = order?.shop_id
  const vendorHasAccess =
    !isVendor ||
    orderShopId == null ||
    assignedShopIds.includes(orderShopId)
  const showNotFound = !isLoading && !!order && !vendorHasAccess

  const [refundOpen, setRefundOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [refundForm, setRefundForm] = useState({ reason: "", refundTo: "wallet" })
  const [cancelForm, setCancelForm] = useState({ reason: "", refundTo: "wallet" })
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", startTime: "", endTime: "", reason: "" })

  const allowedTransitions = order
    ? STATUS_TRANSITIONS[order.status] ?? []
    : []

  // A refund only makes sense once money has actually changed hands —
  // `payment_status` is set to PAID for both online orders (at capture)
  // and COD orders (when the rider marks the order delivered, i.e. cash
  // collected — see `delivery.repository.js`). "Original Payment Method"
  // is further restricted to orders with a captured Razorpay transaction —
  // there's no gateway charge to reverse for COD cash. The refund amount
  // itself is never admin-editable: it's always exactly what was paid.
  const isPaid = order?.payment_status === "PAID"
  const paidAmount = order?.payment?.amount ?? order?.total_amount ?? 0
  const hasGatewayPayment = !!(
    order?.payment?.status === "PAID" && order?.payment?.razorpay_payment_id
  )
  const hasCartEnhancementDetails = !!order && (
    Number(order.handling_fee || 0) > 0 ||
    Number(order.late_night_fee || 0) > 0 ||
    Number(order.tip_amount || 0) > 0 ||
    Number(order.savings_total || 0) > 0 ||
    Boolean(order.delivery_instructions?.trim())
  )

  // Checkout stores the address snapshot with camelCase keys
  // (`addressLine1`/`addressLine2`, from the addresses repository's
  // snake_case -> camelCase formatter) — fall back to the older
  // `line1`/`address_line` keys for any legacy/manually-created orders.
  const deliveryAddr = order?.delivery_address
  const streetAddress =
    deliveryAddr?.addressLine1 || deliveryAddr?.line1 || deliveryAddr?.address_line
  const deliveryLat = deliveryAddr?.lat ?? deliveryAddr?.latitude
  const deliveryLng = deliveryAddr?.lng ?? deliveryAddr?.longitude
  const hasDeliveryCoords =
    typeof deliveryLat === "number" &&
    typeof deliveryLng === "number" &&
    Number.isFinite(deliveryLat) &&
    Number.isFinite(deliveryLng)
  const deliveryMapsUrl = hasDeliveryCoords
    ? `https://www.google.com/maps/search/?api=1&query=${deliveryLat},${deliveryLng}`
    : null

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
              ) : showNotFound ? (
                <>Order</>
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
            ) : showNotFound ? (
              <OrderNotFound />
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
                    {STATUS_CONFIG[order.status]?.icon} {STATUS_CONFIG[order.status]?.label ?? order.status ?? "Unknown"}
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
                    {order.status === "DELIVERED" && isPaid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setRefundForm({ reason: "", refundTo: "wallet" })
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
                          setCancelForm({ reason: "", refundTo: isPaid ? "wallet" : "none" })
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
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Delivery
                    </h4>
                    {deliveryMapsUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <a
                          href={deliveryMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          View live on Map
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">

                    {/* Scheduled delivery badge */}
                    {order.delivery_mode === 'SCHEDULED' && order.scheduled_slot_label && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg"
                        style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                        <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#7C3AED' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#7C3AED' }}>
                            Scheduled delivery
                          </p>
                          <p className="text-xs" style={{ color: '#7C3AED' }}>
                            {order.scheduled_slot_label}
                          </p>
                        </div>
                      </div>
                    )}
                    {(!order.delivery_mode || order.delivery_mode === 'ASAP') && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-green-50 border border-green-100">
                        <Truck className="h-4 w-4 flex-shrink-0 text-green-600" />
                        <p className="text-xs font-medium text-green-700">ASAP delivery</p>
                      </div>
                    )}
                    {!["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs mb-2"
                        onClick={() => {
                          setRescheduleForm({
                            date: order.scheduled_slot_start ? order.scheduled_slot_start.slice(0, 10) : "",
                            startTime: order.scheduled_slot_start
                              ? new Date(order.scheduled_slot_start).toTimeString().slice(0, 5)
                              : "",
                            endTime: order.scheduled_slot_end
                              ? new Date(order.scheduled_slot_end).toTimeString().slice(0, 5)
                              : "",
                            reason: "",
                          })
                          setRescheduleOpen(true)
                        }}
                      >
                        <CalendarClock className="h-3.5 w-3.5 mr-1" />
                        Change delivery slot
                      </Button>
                    )}

                    <p>{streetAddress || "Address not available"}</p>
                    {deliveryAddr?.addressLine2 && <p>{deliveryAddr.addressLine2}</p>}
                    {deliveryAddr?.landmark && (
                      <p className="text-xs">Landmark: {deliveryAddr.landmark}</p>
                    )}
                    {deliveryAddr?.city && (
                      <p>
                        {deliveryAddr.city}
                        {deliveryAddr.state && `, ${deliveryAddr.state}`}
                        {deliveryAddr.pincode && ` – ${deliveryAddr.pincode}`}
                      </p>
                    )}
                    {hasDeliveryCoords && (
                      <p className="text-xs font-mono">
                        {deliveryLat!.toFixed(6)}, {deliveryLng!.toFixed(6)}
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
            <Label>Refund Amount</Label>
            <p className="text-lg font-semibold mt-1">{formatINR(paidAmount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Locked to the amount the customer actually paid — not editable.
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
                {hasGatewayPayment && (
                  <SelectItem value="original">Original Payment Method</SelectItem>
                )}
                <SelectItem value="wallet">Wallet Balance</SelectItem>
                <SelectItem value="none">No Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!refundForm.reason || refundOrder.isPending}
            onClick={() => {
              if (!order) return
              refundOrder.mutate({
                orderId: order.id,
                payload: {
                  reason: refundForm.reason,
                  refundTo: refundForm.refundTo as "wallet" | "original" | "none",
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
          {isPaid ? (
            <div>
              <Label>Refund To</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                Customer paid {formatINR(paidAmount)} — refund is locked to that amount.
              </p>
              <Select
                value={cancelForm.refundTo}
                onValueChange={(v) => setCancelForm((f) => ({ ...f, refundTo: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasGatewayPayment && (
                    <SelectItem value="original">Original Payment Method</SelectItem>
                  )}
                  <SelectItem value="wallet">Wallet Balance</SelectItem>
                  <SelectItem value="none">No Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This order was never paid — there is nothing to refund.
            </p>
          )}
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

    {/* Reschedule Delivery Dialog */}
    <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Delivery Slot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Delivery date</Label>
            <input
              type="date"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={rescheduleForm.date}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Start time</Label>
              <input
                type="time"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <Label>End time</Label>
              <input
                type="time"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Reason (internal note)</Label>
            <Textarea
              className="mt-1"
              placeholder="e.g. Store closed unexpectedly"
              value={rescheduleForm.reason}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Back</Button>
          <Button
            disabled={
              !rescheduleForm.date ||
              !rescheduleForm.startTime ||
              !rescheduleForm.endTime ||
              rescheduleOrder.isPending
            }
            onClick={() => {
              if (!order) return
              const start = new Date(`${rescheduleForm.date}T${rescheduleForm.startTime}:00`)
              const end = new Date(`${rescheduleForm.date}T${rescheduleForm.endTime}:00`)
              const label = `${start.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}, ${start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
              rescheduleOrder.mutate(
                {
                  orderId: order.id,
                  payload: {
                    scheduledSlotStart: start.toISOString(),
                    scheduledSlotEnd: end.toISOString(),
                    scheduledSlotLabel: label,
                    reason: rescheduleForm.reason || undefined,
                  },
                },
                { onSuccess: () => setRescheduleOpen(false) },
              )
            }}
          >
            {rescheduleOrder.isPending ? "Saving..." : "Save new slot"}
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

/**
 * 404 state shown when a vendor user opens an order whose `shop_id` is not
 * in their `assignedShopIds` (Req 10.10). The textual wording mirrors a
 * generic "not found" so vendors cannot infer the existence of orders
 * outside their shop scope from the UX alone — the drawer reads as a plain
 * 404 rather than a "blocked" state. Mirrors the convention from
 * `<CustomerProfileDrawer />` `<CustomerNotFound />` and `<ReviewNotFound />`.
 */
function OrderNotFound() {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">404 — Order not found</h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs">
        This order is not part of your shop. Switch to a shop that placed
        the order to view its details.
      </p>
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
