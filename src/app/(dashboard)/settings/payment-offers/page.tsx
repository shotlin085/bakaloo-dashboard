"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { CalendarIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatINR } from "@/lib/utils"
import {
  paymentOffersService,
  type PaymentOfferAdmin,
  type PaymentOfferCreditTrigger,
  type PaymentOfferPayload,
} from "@/services/payment-offers.service"

const CREDIT_TRIGGER_LABELS: Record<PaymentOfferCreditTrigger, string> = {
  PAYMENT_SUCCESS: "After payment success",
  ORDER_CONFIRMED: "After order confirmed",
  ORDER_DELIVERED: "After order delivered (safest)",
}

type OfferForm = {
  provider: string
  title: string
  description: string
  iconUrl: string
  cashbackAmount: string
  cashbackPercent: string
  minOrderAmount: string
  maxCashback: string
  lockThreshold: string
  isActive: boolean
  validUntil: Date | null
  cashbackCreditTrigger: PaymentOfferCreditTrigger
  usageLimitPerUser: string
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message
  }

  if (error instanceof Error) return error.message
  return "Something went wrong"
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function createInitialForm(offer?: PaymentOfferAdmin | null): OfferForm {
  return {
    provider: offer?.provider ?? "",
    title: offer?.title ?? "",
    description: offer?.description ?? "",
    iconUrl: offer?.icon_url ?? "",
    cashbackAmount: offer ? String(offer.cashback_amount) : "",
    cashbackPercent:
      offer?.cashback_percent === null || offer?.cashback_percent === undefined
        ? ""
        : String(offer.cashback_percent),
    minOrderAmount: offer ? String(offer.min_order_amount) : "0",
    maxCashback:
      offer?.max_cashback === null || offer?.max_cashback === undefined
        ? ""
        : String(offer.max_cashback),
    lockThreshold:
      offer?.lock_threshold === null || offer?.lock_threshold === undefined
        ? ""
        : String(offer.lock_threshold),
    isActive: offer?.is_active ?? true,
    validUntil: offer?.valid_until ? new Date(offer.valid_until) : null,
    cashbackCreditTrigger: offer?.cashback_credit_trigger ?? "ORDER_DELIVERED",
    usageLimitPerUser:
      offer?.usage_limit_per_user === null || offer?.usage_limit_per_user === undefined
        ? ""
        : String(offer.usage_limit_per_user),
  }
}

export default function PaymentOffersPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<PaymentOfferAdmin | null>(null)
  const [deleteOffer, setDeleteOffer] = useState<PaymentOfferAdmin | null>(null)
  const [form, setForm] = useState<OfferForm>(createInitialForm())

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["admin", "payment-offers"],
    queryFn: paymentOffersService.getAll,
    staleTime: 30_000,
  })

  const orderedOffers = useMemo(
    () =>
      [...offers].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ),
    [offers]
  )

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "payment-offers"] })

  const createMutation = useMutation({
    mutationFn: (payload: PaymentOfferPayload) =>
      paymentOffersService.create(payload),
    onSuccess: () => {
      toast.success("Payment offer created")
      setDialogOpen(false)
      setEditingOffer(null)
      setForm(createInitialForm())
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: PaymentOfferPayload
    }) => paymentOffersService.update(id, payload),
    onSuccess: () => {
      toast.success("Payment offer updated")
      setDialogOpen(false)
      setEditingOffer(null)
      setForm(createInitialForm())
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentOffersService.delete(id),
    onSuccess: () => {
      toast.success("Payment offer deleted")
      setDeleteOffer(null)
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const openCreateDialog = () => {
    setEditingOffer(null)
    setForm(createInitialForm())
    setDialogOpen(true)
  }

  const openEditDialog = (offer: PaymentOfferAdmin) => {
    setEditingOffer(offer)
    setForm(createInitialForm(offer))
    setDialogOpen(true)
  }

  const buildPayload = (): PaymentOfferPayload | null => {
    const cashbackAmount = Number(form.cashbackAmount)
    const minOrderAmount = Number(form.minOrderAmount || 0)

    if (!form.provider.trim() || !form.title.trim()) {
      toast.error("Provider and title are required")
      return null
    }

    if (!Number.isFinite(cashbackAmount) || cashbackAmount < 0) {
      toast.error("Cashback amount must be 0 or higher")
      return null
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      toast.error("Minimum order amount must be 0 or higher")
      return null
    }

    return {
      provider: form.provider.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      iconUrl: form.iconUrl.trim() || null,
      cashbackAmount,
      cashbackPercent: parseOptionalNumber(form.cashbackPercent),
      minOrderAmount,
      maxCashback: parseOptionalNumber(form.maxCashback),
      lockThreshold: parseOptionalNumber(form.lockThreshold),
      isActive: form.isActive,
      validUntil: form.validUntil ? form.validUntil.toISOString() : null,
      cashbackCreditTrigger: form.cashbackCreditTrigger,
      usageLimitPerUser: parseOptionalNumber(form.usageLimitPerUser),
    }
  }

  const handleSubmit = () => {
    const payload = buildPayload()
    if (!payload) return

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, payload })
      return
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Offers"
        subtitle="Manage locked cashback offers, thresholds, and validity windows."
      >
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Offer
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Cashback ₹</TableHead>
              <TableHead>Cashback %</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Max Cashback</TableHead>
              <TableHead>Lock Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 10 }).map((__, cell) => (
                    <TableCell key={cell}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orderedOffers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title="No payment offers yet"
                    description="Create your first offer to surface cashback promos in cart."
                  />
                </TableCell>
              </TableRow>
            ) : (
              orderedOffers.map((offer) => {
                const isUpdating =
                  updateMutation.isPending &&
                  updateMutation.variables?.id === offer.id

                return (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium uppercase tracking-wide">
                      {offer.provider}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{offer.title}</p>
                        {offer.description && (
                          <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                            {offer.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatINR(offer.cashback_amount)}</TableCell>
                    <TableCell>
                      {offer.cashback_percent !== null
                        ? `${offer.cashback_percent}%`
                        : "—"}
                    </TableCell>
                    <TableCell>{formatINR(offer.min_order_amount)}</TableCell>
                    <TableCell>
                      {offer.max_cashback !== null
                        ? formatINR(offer.max_cashback)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {offer.lock_threshold !== null
                        ? formatINR(offer.lock_threshold)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={offer.is_active}
                          disabled={isUpdating}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: offer.id,
                              payload: { isActive: checked },
                            })
                          }
                        />
                        <Badge variant={offer.is_active ? "default" : "secondary"}>
                          {offer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.valid_until
                        ? format(new Date(offer.valid_until), "dd MMM yyyy")
                        : "No expiry"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(offer)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteOffer(offer)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingOffer(null)
            setForm(createInitialForm())
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? "Edit Payment Offer" : "Add Payment Offer"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-provider">Provider</Label>
              <Input
                id="offer-provider"
                placeholder="Paytm"
                value={form.provider}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    provider: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-title">Title</Label>
              <Input
                id="offer-title"
                placeholder="Get ₹75 cashback"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea
                id="offer-description"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="offer-icon">Icon URL</Label>
              <Input
                id="offer-icon"
                placeholder="https://..."
                value={form.iconUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    iconUrl: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-cashback-amount">Cashback Amount</Label>
              <Input
                id="offer-cashback-amount"
                type="number"
                min={0}
                value={form.cashbackAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    cashbackAmount: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-cashback-percent">Cashback %</Label>
              <Input
                id="offer-cashback-percent"
                type="number"
                min={0}
                max={100}
                value={form.cashbackPercent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    cashbackPercent: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-min-order">Min Order Amount</Label>
              <Input
                id="offer-min-order"
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minOrderAmount: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-max-cashback">Max Cashback</Label>
              <Input
                id="offer-max-cashback"
                type="number"
                min={0}
                value={form.maxCashback}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxCashback: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-lock-threshold">Lock Threshold</Label>
              <Input
                id="offer-lock-threshold"
                type="number"
                min={0}
                value={form.lockThreshold}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lockThreshold: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-usage-limit">Per-User Redemption Limit</Label>
              <Input
                id="offer-usage-limit"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={form.usageLimitPerUser}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    usageLimitPerUser: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                How many times the same customer can redeem this offer. Leave blank for unlimited.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cashback Credit Timing</Label>
              <Select
                value={form.cashbackCreditTrigger}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    cashbackCreditTrigger: value as PaymentOfferCreditTrigger,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CREDIT_TRIGGER_LABELS) as PaymentOfferCreditTrigger[]).map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {CREDIT_TRIGGER_LABELS[trigger]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.validUntil
                      ? format(form.validUntil, "dd MMM yyyy")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.validUntil ?? undefined}
                    onSelect={(date) =>
                      setForm((current) => ({
                        ...current,
                        validUntil: date ?? null,
                      }))
                    }
                    initialFocus
                  />
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setForm((current) => ({ ...current, validUntil: null }))
                      }
                    >
                      Clear date
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Offer Active</p>
                <p className="text-xs text-muted-foreground">
                  Active offers can be returned to the cart offers API immediately.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setEditingOffer(null)
                setForm(createInitialForm())
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingOffer ? "Save Changes" : "Create Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteOffer}
        onOpenChange={(open) => !open && setDeleteOffer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the offer from admin and the public cart offers list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteOffer) return
                deleteMutation.mutate(deleteOffer.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
