"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Wallet,
  Star,
  Bell,
  ShieldBan,
  ShieldCheck,
  Loader2,
  Crown,
} from "lucide-react"
import {
  useCustomerDetail,
  useCustomerOrders,
  useToggleBlockCustomer,
  useCreditWallet,
  useNotifyCustomer,
} from "@/hooks/useCustomers"
import { formatINR, formatDate, formatRelativeTime } from "@/lib/utils"
import { STATUS_CONFIG, type OrderStatus } from "@/lib/constants"

interface CustomerProfileDrawerProps {
  customerId: string | null
  open: boolean
  onClose: () => void
}

export function CustomerProfileDrawer({ customerId, open, onClose }: CustomerProfileDrawerProps) {
  const { data: customer, isLoading } = useCustomerDetail(customerId)
  const { data: ordersData } = useCustomerOrders(customerId)
  const toggleBlock = useToggleBlockCustomer()
  const creditWallet = useCreditWallet()
  const notifyCustomer = useNotifyCustomer()

  const [walletDialog, setWalletDialog] = useState(false)
  const [walletAmount, setWalletAmount] = useState("")
  const [walletDesc, setWalletDesc] = useState("")

  const [notifyDialog, setNotifyDialog] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState("")
  const [notifyBody, setNotifyBody] = useState("")

  const handleCreditWallet = () => {
    if (!customer || !walletAmount) return
    creditWallet.mutate(
      { id: customer.id, amount: parseFloat(walletAmount), description: walletDesc || undefined },
      {
        onSuccess: () => {
          setWalletDialog(false)
          setWalletAmount("")
          setWalletDesc("")
        },
      }
    )
  }

  const handleNotify = () => {
    if (!customer || !notifyTitle || !notifyBody) return
    notifyCustomer.mutate(
      { id: customer.id, title: notifyTitle, body: notifyBody },
      {
        onSuccess: () => {
          setNotifyDialog(false)
          setNotifyTitle("")
          setNotifyBody("")
        },
      }
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6 pb-3">
            <SheetTitle>
              {isLoading ? <Skeleton className="h-6 w-40" /> : "Customer Profile"}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="px-6 pb-6 space-y-5">
              {isLoading ? (
                <ProfileSkeleton />
              ) : !customer ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Customer not found
                </div>
              ) : (
                <>
                  {/* Identity */}
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold truncate">
                          {customer.name ?? "Unnamed Customer"}
                        </h3>
                        {customer.is_blocked ? (
                          <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-green-50 text-green-600 border-0">Active</Badge>
                        )}
                        {(customer.order_count >= 10 || customer.total_spent >= 10000) && (
                          <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            <Crown className="h-2.5 w-2.5 mr-0.5" /> VIP
                          </Badge>
                        )}
                        {customer.membership_tier && (
                          <Badge variant="outline" className="text-[10px]">{customer.membership_tier}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {formatDate(customer.created_at)} · {formatRelativeTime(customer.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    <StatBox icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={customer.order_count.toString()} />
                    <StatBox icon={<Wallet className="h-4 w-4" />} label="Spent" value={formatINR(customer.total_spent)} />
                    <StatBox icon={<Wallet className="h-4 w-4" />} label="Wallet" value={formatINR(customer.wallet_balance)} />
                    <StatBox icon={<Star className="h-4 w-4" />} label="Points" value={customer.loyalty_points.toString()} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setWalletDialog(true)}
                    >
                      <Wallet className="h-3.5 w-3.5 mr-1" />
                      Credit Wallet
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setNotifyDialog(true)}
                    >
                      <Bell className="h-3.5 w-3.5 mr-1" />
                      Send Notification
                    </Button>
                    <Button
                      size="sm"
                      variant={customer.is_blocked ? "default" : "destructive"}
                      className="text-xs h-8 ml-auto"
                      onClick={() => toggleBlock.mutate({ id: customer.id, blocked: !customer.is_blocked })}
                      disabled={toggleBlock.isPending}
                    >
                      {customer.is_blocked ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Unblock
                        </>
                      ) : (
                        <>
                          <ShieldBan className="h-3.5 w-3.5 mr-1" />
                          Block
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Addresses */}
                  {customer.addresses && customer.addresses.length > 0 && (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Addresses ({customer.addresses.length})
                        </h4>
                        <div className="space-y-2">
                          {customer.addresses.map((addr) => (
                            <div
                              key={addr.id}
                              className="p-2.5 rounded-lg border text-xs space-y-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{addr.label}</span>
                                {addr.is_default && (
                                  <Badge variant="outline" className="text-[9px] h-4">Default</Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {addr.line1}
                                {addr.line2 && `, ${addr.line2}`}
                              </p>
                              <p className="text-muted-foreground">
                                {addr.city}, {addr.state} – {addr.pincode}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Recent Orders */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      Recent Orders
                    </h4>
                    {ordersData?.orders && ordersData.orders.length > 0 ? (
                      <div className="space-y-2">
                        {ordersData.orders.map((o) => {
                          const config = STATUS_CONFIG[o.status as OrderStatus]
                          return (
                            <div
                              key={o.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border"
                            >
                              <div>
                                <p className="text-sm font-medium">#{o.order_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(o.created_at)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatINR(o.total_amount)}</p>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-0"
                                  style={{
                                    backgroundColor: config?.bg,
                                    color: config?.text,
                                  }}
                                >
                                  {config?.label ?? o.status}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : customer.recent_orders && customer.recent_orders.length > 0 ? (
                      <div className="space-y-2">
                        {customer.recent_orders.map((o) => {
                          const config = STATUS_CONFIG[o.status as OrderStatus]
                          return (
                            <div
                              key={o.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border"
                            >
                              <div>
                                <p className="text-sm font-medium">#{o.order_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(o.created_at)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatINR(o.total_amount)}</p>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-0"
                                  style={{
                                    backgroundColor: config?.bg,
                                    color: config?.text,
                                  }}
                                >
                                  {config?.label ?? o.status}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No orders yet
                      </p>
                    )}
                  </div>

                  {/* Extra info */}
                  {(customer.platform || customer.app_version || customer.membership_tier) && (
                    <>
                      <Separator />
                      <div className="text-xs text-muted-foreground space-y-1">
                        {customer.platform && <p>Platform: {customer.platform}</p>}
                        {customer.app_version && <p>App Version: {customer.app_version}</p>}
                        {customer.membership_tier && (
                          <p>
                            Tier:{" "}
                            <Badge variant="outline" className="text-[10px]">
                              {customer.membership_tier}
                            </Badge>
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Wallet Credit Dialog */}
      <Dialog open={walletDialog} onOpenChange={setWalletDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Credit Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                max="50000"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                value={walletDesc}
                onChange={(e) => setWalletDesc(e.target.value)}
                placeholder="e.g. Refund for order #123"
                maxLength={255}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreditWallet}
              disabled={!walletAmount || creditWallet.isPending}
            >
              {creditWallet.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Credit {walletAmount ? formatINR(parseFloat(walletAmount)) : "₹0"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={notifyDialog} onOpenChange={setNotifyDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="e.g. Special offer for you!"
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Input
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                placeholder="Notification body..."
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialog(false)}>Cancel</Button>
            <Button
              onClick={handleNotify}
              disabled={!notifyTitle || !notifyBody || notifyCustomer.isPending}
            >
              {notifyCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-20 ml-auto" />
      </div>
      <Separator />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
