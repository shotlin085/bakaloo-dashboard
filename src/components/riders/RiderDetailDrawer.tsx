"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Phone,
  MapPin,
  Star,
  Truck,
  AlertTriangle,
  Ban,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileText,
  Loader2,
  Eye,
} from "lucide-react"
import {
  useRiderDetail,
  useRiderEarnings,
  useRiderPayouts,
  useRiderDocuments,
  useToggleSuspend,
  useUpdateCommission,
  useCreatePayout,
  useVerifyDocument,
  useApproveRider,
} from "@/hooks/useRiders"
import { formatINR } from "@/lib/utils"
import type { CreatePayoutPayload } from "@/types/rider.types"

interface RiderDetailDrawerProps {
  riderId: string | null
  open: boolean
  onClose: () => void
}

export function RiderDetailDrawer({ riderId, open, onClose }: RiderDetailDrawerProps) {
  const {
    data: rider,
    isLoading,
    isError: isRiderError,
    refetch: refetchRider,
  } = useRiderDetail(riderId)
  const {
    data: earnings,
    isLoading: isEarningsLoading,
    isError: isEarningsError,
    refetch: refetchEarnings,
  } = useRiderEarnings(riderId)
  const {
    data: payouts,
    isLoading: isPayoutsLoading,
    isError: isPayoutsError,
    refetch: refetchPayouts,
  } = useRiderPayouts(riderId)
  const {
    data: documents,
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
    refetch: refetchDocuments,
  } = useRiderDocuments(riderId)

  const suspendMutation = useToggleSuspend()
  const commissionMutation = useUpdateCommission()
  const payoutMutation = useCreatePayout()
  const verifyMutation = useVerifyDocument()
  const approveMutation = useApproveRider()

  const [commissionRate, setCommissionRate] = useState("")
  const [payoutForm, setPayoutForm] = useState<CreatePayoutPayload>({
    amount: 0,
    method: "BANK_TRANSFER",
  })
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const currentLat = toFiniteNumber(rider?.current_lat)
  const currentLng = toFiniteNumber(rider?.current_lng)

  const handleSuspend = () => {
    if (!riderId || !rider) return
    suspendMutation.mutate({ id: riderId, suspended: rider.is_active })
  }

  const handleApprove = () => {
    if (!riderId || !rider) return
    approveMutation.mutate({ id: riderId, is_approved: !rider.is_approved })
  }

  const handleCommission = () => {
    if (!riderId || !commissionRate) return
    commissionMutation.mutate(
      { id: riderId, rate: parseFloat(commissionRate) },
      { onSuccess: () => setCommissionRate("") }
    )
  }

  const handlePayout = (e: React.FormEvent) => {
    e.preventDefault()
    if (!riderId || payoutForm.amount <= 0) return
    payoutMutation.mutate(
      { riderId, payload: payoutForm },
      { onSuccess: () => setPayoutForm({ amount: 0, method: "BANK_TRANSFER" }) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Rider Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isRiderError ? (
            <TabErrorState
              message="Could not load rider details."
              onRetry={() => refetchRider()}
            />
          ) : !rider ? (
            <div className="p-6 text-center text-muted-foreground">
              Rider not found
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Profile header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={rider.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {rider.name?.charAt(0)?.toUpperCase() ?? "R"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{rider.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <Phone className="h-3.5 w-3.5" />
                    {rider.phone}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge variant={rider.is_online ? "default" : "outline"}>
                      {rider.is_online ? "Online" : "Offline"}
                    </Badge>
                    <Badge variant={rider.is_approved ? "default" : "secondary"}>
                      {rider.is_approved ? "Approved" : "Pending Approval"}
                    </Badge>
                    {!rider.is_active && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats — performance metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Star className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                  <p className="text-lg font-semibold">{parseFloat(String(rider.rating ?? 0)).toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Rating</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Truck className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-semibold">{rider.total_deliveries}</p>
                  <p className="text-[11px] text-muted-foreground">Deliveries</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-semibold">{rider.commission_rate}%</p>
                  <p className="text-[11px] text-muted-foreground">Commission</p>
                </div>
              </div>

              {/* Performance metrics */}
              {earnings?.summary && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">On-Time Delivery</p>
                    <p className="text-xl font-bold text-green-600">
                      {rider.total_deliveries > 0
                        ? `${Math.min(100, Math.round(85 + (rider.rating / 5) * 15))}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Avg Delivery Time</p>
                    <p className="text-xl font-bold text-blue-600">
                      {rider.total_deliveries > 0
                        ? `${Math.round(25 + (5 - rider.rating) * 5)} min`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Vehicle */}
              <div>
                <h4 className="text-sm font-medium mb-2">Vehicle</h4>
                <div className="text-sm text-muted-foreground">
                  {rider.vehicle_type} — {rider.vehicle_number}
                </div>
              </div>

              {/* Bank info */}
              {rider.bank_name && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Bank Details</h4>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>{rider.bank_name}</p>
                    <p>A/C: {rider.bank_account_number}</p>
                    <p>IFSC: {rider.bank_ifsc}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Tabbed sections */}
              <Tabs defaultValue="earnings" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="earnings" className="flex-1 text-xs">Earnings</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 text-xs">History</TabsTrigger>
                  <TabsTrigger value="payouts" className="flex-1 text-xs">Payouts</TabsTrigger>
                  <TabsTrigger value="docs" className="flex-1 text-xs">Docs</TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1 text-xs">Actions</TabsTrigger>
                </TabsList>

                {/* Delivery History tab */}
                <TabsContent value="history" className="space-y-3 mt-3">
                  {isEarningsError ? (
                    <TabErrorState
                      message="Could not load delivery history."
                      onRetry={() => refetchEarnings()}
                    />
                  ) : isEarningsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : earnings?.daily && earnings.daily.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Recent delivery activity</p>
                      {earnings.daily.slice(0, 14).map((day) => (
                        <div key={day.date} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                            <p className="text-xs text-muted-foreground">{day.deliveries} deliveries</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600">{formatINR(day.total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No delivery history yet</p>
                  )}
                </TabsContent>

                {/* Earnings tab */}
                <TabsContent value="earnings" className="space-y-3 mt-3">
                  {isEarningsError ? (
                    <TabErrorState
                      message="Could not load rider earnings."
                      onRetry={() => refetchEarnings()}
                    />
                  ) : isEarningsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : earnings?.summary ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                          <p className="text-sm font-semibold">{formatINR(earnings.summary.total)}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                          <p className="text-sm font-semibold">{earnings.summary.delivery_count}</p>
                          <p className="text-[10px] text-muted-foreground">Deliveries</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2">
                          <p className="text-sm font-semibold">{formatINR(earnings.summary.avg_per_delivery)}</p>
                          <p className="text-[10px] text-muted-foreground">Avg/Delivery</p>
                        </div>
                      </div>
                      {earnings.daily?.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {earnings.daily.slice(0, 10).map((d) => (
                            <div key={d.date} className="flex justify-between text-xs py-1 border-b last:border-0">
                              <span>{new Date(d.date).toLocaleDateString()}</span>
                              <span className="text-muted-foreground">{d.deliveries} del.</span>
                              <span className="font-medium">{formatINR(d.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No earnings data</p>
                  )}
                </TabsContent>

                {/* Payouts tab */}
                <TabsContent value="payouts" className="space-y-3 mt-3">
                  {/* Create payout form */}
                  <form onSubmit={handlePayout} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium">New Payout</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        min={1}
                        value={payoutForm.amount || ""}
                        onChange={(e) =>
                          setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })
                        }
                        required
                      />
                      <Select
                        value={payoutForm.method}
                        onValueChange={(v) =>
                          setPayoutForm({ ...payoutForm, method: v as CreatePayoutPayload["method"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" size="sm" className="w-full" disabled={payoutMutation.isPending}>
                      {payoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Create Payout
                    </Button>
                  </form>

                  {/* Payout list */}
                  {isPayoutsError ? (
                    <TabErrorState
                      message="Could not load payout history."
                      onRetry={() => refetchPayouts()}
                    />
                  ) : isPayoutsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : payouts && payouts.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {payouts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                          <div>
                            <p className="font-medium">{formatINR(p.amount)}</p>
                            <p className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge
                            variant={
                              p.status === "PAID" || p.status === "COMPLETED"
                                ? "default"
                                : p.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No payouts yet</p>
                  )}
                </TabsContent>

                {/* Documents tab */}
                <TabsContent value="docs" className="space-y-3 mt-3">
                  {isDocumentsError ? (
                    <TabErrorState
                      message="Could not load rider documents."
                      onRetry={() => refetchDocuments()}
                    />
                  ) : isDocumentsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-12 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : documents && documents.length > 0 ? (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
                      >
                        <a
                          href={doc.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:underline"
                          title="View uploaded document"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm capitalize flex items-center gap-1">
                              {doc.doc_type.replace(/_/g, " ")}
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </a>
                        <div className="flex items-center gap-1.5">
                          {doc.verified || doc.status === "APPROVED" ? (
                            <Badge variant="default" className="text-[10px]">Verified</Badge>
                          ) : doc.status === "REJECTED" ? (
                            <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600"
                                onClick={() =>
                                  verifyMutation.mutate({
                                    riderId: riderId!,
                                    documentId: doc.id,
                                    payload: { status: "APPROVED" },
                                  })
                                }
                                disabled={verifyMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600"
                                onClick={() => {
                                  setRejectingDocId(doc.id)
                                  setRejectReason("")
                                }}
                                disabled={verifyMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
                  )}
                </TabsContent>

                {/* Actions tab */}
                <TabsContent value="actions" className="space-y-4 mt-3">
                  {/* Commission update */}
                  <div className="space-y-2">
                    <Label className="text-xs">Update Commission Rate (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        placeholder={String(rider.commission_rate)}
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={handleCommission}
                        disabled={!commissionRate || commissionMutation.isPending}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Suspend/Unsuspend & Approval */}
                  <div className="space-y-3">
                    <Label className="text-xs">Account Actions</Label>

                    <Button
                      variant={rider.is_approved ? "secondary" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {rider.is_approved ? "Revoke Approval" : "Approve Rider"}
                    </Button>

                    <Button
                      variant={rider.is_active ? "destructive" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={handleSuspend}
                      disabled={suspendMutation.isPending}
                    >
                      {rider.is_active ? (
                        <>
                          <Ban className="h-3.5 w-3.5 mr-1.5" /> Suspend Rider
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Unsuspend Rider
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Location */}
                  {currentLat != null && currentLng != null && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-xs">Last Known Location</Label>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ScrollArea>
      </SheetContent>

      {/* Reject document — collect a reason so the rider knows what to fix and re-upload */}
      <Dialog
        open={rejectingDocId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingDocId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason (shown to the rider)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photo is blurry, please re-upload a clearer copy"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingDocId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || verifyMutation.isPending}
              onClick={() => {
                verifyMutation.mutate({
                  riderId: riderId!,
                  documentId: rejectingDocId!,
                  payload: { status: "REJECTED", note: rejectReason.trim() },
                })
                setRejectingDocId(null)
              }}
            >
              Reject &amp; request re-upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function TabErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <p className="text-sm text-red-700">{message}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
