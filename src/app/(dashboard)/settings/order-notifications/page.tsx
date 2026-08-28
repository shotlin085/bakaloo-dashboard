"use client"

/**
 * Order Notifications settings — per-event on/off switches for the
 * push/in-app notifications sent to a customer as their order moves through
 * its lifecycle. Backed by the generic `bakaloo-backend` /api/v1/admin/settings
 * key/value store (same one Payments/Fees/etc. use) — the backend gate lives
 * in NotificationsService.sendNotification, keyed off these same setting keys
 * (see order-notification-settings.js), so a save here takes effect on the
 * very next notification, no rebuild.
 *
 * Four events ship off by default (Order Placed, Order Being Prepared, Order
 * Packed, Rider Accepted Order) — feedback was that a customer got hit with
 * a banner on every single status step before the order even left the
 * store. The rest stay on since those are the events a customer actually
 * needs to see.
 */

import { useCallback, useEffect, useState } from "react"
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  KeyRound,
  Loader2,
  Package,
  PackageCheck,
  Save,
  ShoppingBag,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings, useUpdateSettings } from "@/hooks/useSettings"
import { usePermissions } from "@/hooks/usePermissions"

interface ToggleConfig {
  key: string
  icon: React.ElementType
  label: string
  description: string
}

const TOGGLES: ToggleConfig[] = [
  {
    key: "notify_evt_order_placed",
    icon: ShoppingBag,
    label: "Order Placed",
    description: "Sent the moment a customer's order is placed.",
  },
  {
    key: "notify_evt_order_confirmed",
    icon: CheckCircle2,
    label: "Order Confirmed",
    description: "Sent when the store confirms the order.",
  },
  {
    key: "notify_evt_order_preparing",
    icon: ChefHat,
    label: "Order Being Prepared",
    description: "Sent when the order starts being prepared.",
  },
  {
    key: "notify_evt_order_packed",
    icon: Package,
    label: "Order Packed",
    description: "Sent when the order is packed and ready for pickup.",
  },
  {
    key: "notify_evt_rider_accepted",
    icon: PackageCheck,
    label: "Rider Accepted Order",
    description: "Sent when a delivery partner accepts the order.",
  },
  {
    key: "notify_evt_out_for_delivery",
    icon: Truck,
    label: "Out For Delivery",
    description: "Sent when the order leaves for delivery.",
  },
  {
    key: "notify_evt_otp_resent",
    icon: KeyRound,
    label: "Delivery OTP Resent",
    description: "Sent when the delivery OTP is resent to the customer.",
  },
  {
    key: "notify_evt_delivered",
    icon: CheckCircle2,
    label: "Order Delivered",
    description: "Sent when the order is marked delivered.",
  },
  {
    key: "notify_evt_cancelled",
    icon: XCircle,
    label: "Order Cancelled",
    description: "Sent when the order is cancelled.",
  },
  {
    key: "notify_evt_refunded",
    icon: Undo2,
    label: "Refund Processed",
    description: "Sent when a refund is processed for the order.",
  },
]

export default function OrderNotificationsSettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!settings) return
    const initial: Record<string, string | number | boolean> = {}
    for (const key of Object.keys(settings)) {
      initial[key] = settings[key].value
    }
    setDraft(initial)
    setDirty(false)
  }, [settings])

  const handleChange = useCallback((key: string, value: boolean) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  function handleSave() {
    if (!settings) return
    const payload: Record<string, string | number | boolean> = {}
    for (const [key, val] of Object.entries(draft)) {
      // `settings[key]` can be undefined if a key hasn't been seeded yet —
      // treat that as "changed" so the save actually creates it.
      if (!settings[key] || settings[key].value !== val) {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Order Notifications"
          subtitle="Choose which order-lifecycle events send a customer a notification."
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Notifications"
        subtitle="Choose which order-lifecycle events send a customer a notification."
      >
        {canManage && (
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
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Order Lifecycle Events
          </CardTitle>
          <CardDescription>
            Turning an event off stops that notification completely — no push, no in-app
            notification — for every order, immediately.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-5">
          {TOGGLES.map((toggle, index) => {
            const Icon = toggle.icon
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
                    checked={getBoolValue(toggle.key)}
                    onCheckedChange={(checked) => handleChange(toggle.key, checked)}
                    disabled={!canManage}
                  />
                </div>
                {index < TOGGLES.length - 1 && <Separator className="mt-5" />}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
