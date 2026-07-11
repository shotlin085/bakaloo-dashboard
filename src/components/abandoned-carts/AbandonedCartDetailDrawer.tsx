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
import {
  Package,
  User,
  Clock,
  Bell,
  Ticket,
  CheckCircle2,
  RotateCcw,
  ShoppingCart,
  Timer as TimerIcon,
  XCircle,
} from "lucide-react"
import { useAbandonedCartDetail } from "@/hooks/useAbandonedCarts"
import { formatINR, formatDateTime, cn } from "@/lib/utils"
import { STATUS_CONFIG, priorityBand } from "./constants"
import { AbandonedTimer } from "./AbandonedTimer"
import { SendReminderDialog } from "./SendReminderDialog"
import { SendCouponDialog } from "./SendCouponDialog"

interface AbandonedCartDetailDrawerProps {
  cartId: string | null
  open: boolean
  onClose: () => void
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  DETECTED: <ShoppingCart className="h-3.5 w-3.5" />,
  RESWEPT: <TimerIcon className="h-3.5 w-3.5" />,
  RECOVERED: <RotateCcw className="h-3.5 w-3.5" />,
  CONVERTED: <CheckCircle2 className="h-3.5 w-3.5" />,
  EXPIRED: <XCircle className="h-3.5 w-3.5" />,
  REMINDER_SENT: <Bell className="h-3.5 w-3.5" />,
  COUPON_ISSUED: <Ticket className="h-3.5 w-3.5" />,
}

export function AbandonedCartDetailDrawer({ cartId, open, onClose }: AbandonedCartDetailDrawerProps) {
  const { data: cart, isLoading } = useAbandonedCartDetail(cartId)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)

  const status = cart ? STATUS_CONFIG[cart.status] : null
  const band = cart ? priorityBand(cart.priorityScore) : null

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6 pb-3">
            <SheetTitle>
              {isLoading ? <Skeleton className="h-6 w-40" /> : cart?.user.name || cart?.user.phone || "Abandoned Cart"}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="px-6 pb-6 space-y-5">
              {isLoading ? (
                <DrawerSkeleton />
              ) : !cart ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Abandoned cart not found
                </div>
              ) : (
                <>
                  {/* Status + Priority */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {status && (
                      <Badge
                        variant="outline"
                        className="text-xs px-2.5 py-1 border-0 font-medium"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.label}
                      </Badge>
                    )}
                    {band && (
                      <Badge
                        variant="outline"
                        className="text-xs px-2.5 py-1 border-0 font-medium"
                        style={{ backgroundColor: band.bg, color: band.text }}
                      >
                        {band.label} Priority · {cart.priorityScore.toFixed(0)}
                      </Badge>
                    )}
                    {cart.status === "OPEN" && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Idle for <AbandonedTimer abandonedAt={cart.abandonedAt} />
                      </span>
                    )}
                  </div>

                  {cart.status === "OPEN" && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-8 text-xs" onClick={() => setReminderOpen(true)}>
                        <Bell className="h-3.5 w-3.5 mr-1" />
                        Send Reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setCouponOpen(true)}
                      >
                        <Ticket className="h-3.5 w-3.5 mr-1" />
                        Send Coupon
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Detected {formatDateTime(cart.detectedAt)}
                  </p>

                  <Separator />

                  {/* Customer */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Customer
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium">{cart.user.name || "Unnamed"}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {cart.user.phone}
                        {cart.user.email && ` · ${cart.user.email}`}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Wallet {formatINR(cart.user.walletBalance)} · {cart.user.loyaltyPoints} pts
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Cart items */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Cart Items ({cart.items.length}) · {formatINR(cart.cartValue)}
                    </h4>
                    <div className="space-y-3">
                      {cart.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {item.thumbnailUrl ? (
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.productName}
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
                            <p className="text-sm font-medium truncate">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatINR(item.unitPrice)}
                              {item.unit && ` · ${item.unit}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">{formatINR(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Priority breakdown */}
                  {Object.keys(cart.priorityBreakdown).length > 0 && (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Priority Score Breakdown</h4>
                        <div className="space-y-1.5 text-xs">
                          {Object.entries(cart.priorityBreakdown).map(([key, v]) => (
                            <div key={key} className="flex items-center justify-between text-muted-foreground">
                              <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                              <span>{(v.contribution * 100).toFixed(1)} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Event timeline */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Timeline</h4>
                    <div className="space-y-0">
                      {cart.events.map((entry, i) => {
                        const isLast = i === cart.events.length - 1
                        return (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full",
                                  i === 0 ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground",
                                )}
                              >
                                {EVENT_ICONS[entry.eventType] ?? <Clock className="h-3.5 w-3.5" />}
                              </div>
                              {!isLast && <div className="w-px h-6 bg-border" />}
                            </div>
                            <div className="pb-3">
                              <p className="text-sm font-medium">
                                {entry.eventType.replace(/_/g, " ")}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDateTime(entry.createdAt)} · {entry.actorType.toLowerCase()}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {cart.notificationsSent.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          Notifications Sent ({cart.notificationsSent.length})
                        </h4>
                        <div className="space-y-2">
                          {cart.notificationsSent.map((n) => (
                            <div key={n.id} className="text-xs rounded-lg bg-muted/40 p-2.5">
                              <p className="font-medium text-foreground">{n.title}</p>
                              {n.body && <p className="text-muted-foreground mt-0.5">{n.body}</p>}
                              <p className="text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {cart.couponsIssued.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          Coupons Issued ({cart.couponsIssued.length})
                        </h4>
                        <div className="space-y-2">
                          {cart.couponsIssued.map((c) => (
                            <div key={c.id} className="text-xs rounded-lg bg-muted/40 p-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-mono font-medium text-foreground">{c.code ?? c.couponId}</p>
                                <p className="text-muted-foreground mt-0.5">{formatDateTime(c.createdAt)}</p>
                              </div>
                              {c.discountType && (
                                <span className="text-muted-foreground">
                                  {c.discountType === "PERCENTAGE"
                                    ? `${c.discountValue}% off`
                                    : c.discountType === "FLAT"
                                    ? `₹${c.discountValue} off`
                                    : c.discountType}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {cartId && (
        <>
          <SendReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} cartIds={[cartId]} />
          <SendCouponDialog open={couponOpen} onOpenChange={setCouponOpen} cartIds={[cartId]} />
        </>
      )}
    </>
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
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
    </div>
  )
}
