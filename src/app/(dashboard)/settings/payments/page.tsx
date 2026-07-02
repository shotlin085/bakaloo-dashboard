"use client"

/**
 * Payments settings — enable/disable COD, Razorpay (online), and Wallet at
 * checkout, plus the COD minimum AND maximum order amount. Backed by the
 * generic `bakaloo-backend` /api/v1/admin/settings key/value store (same one
 * the Fastify order-placement gate reads — see PaymentSettingsService), so a
 * save here takes effect on the next checkout immediately, no rebuild.
 *
 * This is the only place cod_min_order_amount / cod_max_amount should be
 * edited — a previous duplicate "Max COD Amount" field on the General
 * Settings page caused admins to set it there instead, which (combined with
 * the minimum) could collapse COD to a single-rupee working window. See
 * migration 065_cleanup_dead_settings_and_cod_fix.sql.
 */

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Banknote, CreditCard, Loader2, Save, Wallet } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSettings, useUpdateSettings } from "@/hooks/useSettings"

type ToggleKey = "cod_enabled" | "razorpay_enabled" | "wallet_enabled"

interface ToggleConfig {
  key: ToggleKey
  icon: React.ElementType
  label: string
  description: string
  enableTitle: string
  enableBody: string
  disableTitle: string
  disableBody: string
}

const TOGGLES: ToggleConfig[] = [
  {
    key: "cod_enabled",
    icon: Banknote,
    label: "Cash on Delivery",
    description: "Pay with cash when the order arrives.",
    enableTitle: "Enable Cash on Delivery?",
    enableBody:
      "Customers will see Cash on Delivery as a payment option at checkout, subject to the minimum/maximum amount below.",
    disableTitle: "Disable Cash on Delivery?",
    disableBody:
      "Cash on Delivery will be hidden from checkout immediately. Customers will need to pay online or via wallet instead.",
  },
  {
    key: "razorpay_enabled",
    icon: CreditCard,
    label: "Online Payment (Razorpay)",
    description: "UPI, cards, netbanking, and more via Razorpay.",
    enableTitle: "Enable Online Payment?",
    enableBody: "Customers will see Pay Online (Razorpay) as a payment option at checkout.",
    disableTitle: "Disable Online Payment?",
    disableBody:
      "Online payment will be hidden from checkout immediately. Customers will need to pay with COD or wallet instead.",
  },
  {
    key: "wallet_enabled",
    icon: Wallet,
    label: "Bakaloo Wallet",
    description: "Pay from the customer's in-app wallet balance.",
    enableTitle: "Enable Wallet Payment?",
    enableBody: "Customers will see Bakaloo Wallet as a payment option at checkout.",
    disableTitle: "Disable Wallet Payment?",
    disableBody:
      "Wallet payment will be hidden from checkout immediately. Customers will need to pay with COD or online instead.",
  },
]

const COD_MIN_KEY = "cod_min_order_amount"
const COD_MAX_KEY = "cod_max_amount"

export default function PaymentsSettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()

  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({})
  const [dirty, setDirty] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    config: ToggleConfig
    nextValue: boolean
  } | null>(null)

  useEffect(() => {
    if (!settings) return
    const initial: Record<string, string | number | boolean> = {}
    for (const key of Object.keys(settings)) {
      initial[key] = settings[key].value
    }
    setDraft(initial)
    setDirty(false)
  }, [settings])

  const handleChange = useCallback((key: string, value: string | number | boolean) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  function handleSave() {
    if (!settings) return

    const codMax = getNumberValue(COD_MAX_KEY)
    const codMin = getNumberValue(COD_MIN_KEY)
    if (codMax <= codMin) {
      toast.error(
        "COD maximum must be greater than the minimum — as set, Cash on Delivery would only work for one exact order total."
      )
      return
    }

    const payload: Record<string, string | number | boolean> = {}
    for (const [key, val] of Object.entries(draft)) {
      if (settings[key] && settings[key].value !== val) {
        payload[key] = val
      }
    }
    if (Object.keys(payload).length === 0) {
      setDirty(false)
      return
    }
    updateMutation.mutate(payload, { onSuccess: () => setDirty(false) })
  }

  function getBoolValue(key: string): boolean {
    const v = draft[key] ?? settings?.[key]?.value
    return v === true || v === "true"
  }

  function getNumberValue(key: string): number {
    const v = draft[key] ?? settings?.[key]?.value
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payments" subtitle="Choose which payment methods customers can use at checkout." />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Choose which payment methods customers can use at checkout.">
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Methods</CardTitle>
          <CardDescription>
            Toggling a method off hides it from checkout immediately — and the backend rejects any
            order placed with a disabled method, even via a direct API call.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-5">
          {TOGGLES.map((toggle, index) => {
            const Icon = toggle.icon
            const enabled = getBoolValue(toggle.key)
            return (
              <div key={toggle.key}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">{toggle.label}</Label>
                      <p className="text-xs text-muted-foreground">{toggle.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => setPendingToggle({ config: toggle, nextValue: checked })}
                  />
                </div>

                {toggle.key === "cod_enabled" && (
                  <div className="mt-3 ml-7 space-y-4 max-w-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Minimum order</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={getNumberValue(COD_MIN_KEY)}
                            onChange={(e) => handleChange(COD_MIN_KEY, Number(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">₹</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Maximum order</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={getNumberValue(COD_MAX_KEY)}
                            onChange={(e) => handleChange(COD_MAX_KEY, Number(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">₹</span>
                        </div>
                      </div>
                    </div>
                    {getNumberValue(COD_MAX_KEY) <= getNumberValue(COD_MIN_KEY) ? (
                      <p className="text-xs text-destructive">
                        Maximum must be greater than the minimum, or Cash on Delivery will only
                        ever work for a single exact order total.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Cash on Delivery is offered only when the bill total is between the
                        minimum and maximum above (₹{getNumberValue(COD_MIN_KEY)}–₹
                        {getNumberValue(COD_MAX_KEY)}).
                      </p>
                    )}
                  </div>
                )}

                {index < TOGGLES.length - 1 && <Separator className="mt-5" />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Payment method toggle confirmation */}
      <Dialog
        open={pendingToggle !== null}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {pendingToggle?.nextValue
                ? pendingToggle.config.enableTitle
                : pendingToggle?.config.disableTitle}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle?.nextValue
                ? pendingToggle.config.enableBody
                : pendingToggle?.config.disableBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingToggle(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingToggle) return
                handleChange(pendingToggle.config.key, pendingToggle.nextValue)
                setPendingToggle(null)
              }}
            >
              Yes, I Agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
