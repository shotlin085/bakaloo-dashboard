"use client"

/**
 * Delivery Timer — a single, admin-set display number (e.g. "45") shown as
 * a badge on the customer app's home screen header (e.g. "⚡ 45 mins
 * delivery"). This is explicitly NOT a computed ETA based on distance or
 * order status — it's a plain marketing/informational value the admin
 * fully controls.
 *
 * Reuses the existing fee_settings.delivery_eta_minutes column
 * (bakaloo-backend migration 055, "display only") via the same
 * /api/v1/admin/fee-settings endpoint the Fees & Delivery page already
 * uses — that field already existed but had no UI anywhere until this page.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Timer, Zap } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { feeSettingsService } from "@/services/fee-settings.service"
import { usePermissions } from "@/hooks/usePermissions"

const MIN_MINUTES = 1
const MAX_MINUTES = 180
const MAX_SURCHARGE = 10000

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const resp = (error as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

function numOrZero(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function DeliveryTimerPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const [minutes, setMinutes] = useState<number | null>(null)
  const [surchargeEnabled, setSurchargeEnabled] = useState(false)
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0)
  const [surchargeLabel, setSurchargeLabel] = useState("Quick delivery fee")
  const [quickEtaMinutes, setQuickEtaMinutes] = useState<number>(15)

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "fee-settings"],
    queryFn: feeSettingsService.get,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!config) return
    setMinutes(config.delivery_eta_minutes)
    setSurchargeEnabled(config.quick_delivery_surcharge_enabled)
    setSurchargeAmount(config.quick_delivery_surcharge_amount)
    setSurchargeLabel(config.quick_delivery_surcharge_label)
    setQuickEtaMinutes(config.quick_delivery_eta_minutes)
  }, [config])

  const updateMutation = useMutation({
    mutationFn: (payload: {
      delivery_eta_minutes: number
      quick_delivery_surcharge_enabled: boolean
      quick_delivery_surcharge_amount: number
      quick_delivery_surcharge_label: string
      quick_delivery_eta_minutes: number
    }) => feeSettingsService.update(payload),
    onSuccess: () => {
      toast.success("Delivery settings saved")
      queryClient.invalidateQueries({ queryKey: ["admin", "fee-settings"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const validationError = useMemo(() => {
    if (minutes === null) return null
    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      return `Delivery time must be between ${MIN_MINUTES} and ${MAX_MINUTES} minutes`
    }
    if (surchargeAmount < 0 || surchargeAmount > MAX_SURCHARGE) {
      return `Quick delivery surcharge must be between ₹0 and ₹${MAX_SURCHARGE}`
    }
    if (surchargeEnabled && surchargeLabel.trim().length === 0) {
      return "Quick delivery surcharge label cannot be empty"
    }
    if (surchargeEnabled && (quickEtaMinutes < 1 || quickEtaMinutes > MAX_MINUTES)) {
      return `Quick delivery time must be between 1 and ${MAX_MINUTES} minutes`
    }
    return null
  }, [minutes, surchargeAmount, surchargeEnabled, surchargeLabel, quickEtaMinutes])

  function handleSave() {
    if (minutes === null) return
    if (validationError) {
      toast.error(validationError)
      return
    }
    updateMutation.mutate({
      delivery_eta_minutes: minutes,
      quick_delivery_surcharge_enabled: surchargeEnabled,
      quick_delivery_surcharge_amount: surchargeAmount,
      quick_delivery_surcharge_label: surchargeLabel.trim(),
      quick_delivery_eta_minutes: quickEtaMinutes,
    })
  }

  if (isLoading || minutes === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Delivery Timer & Quick Delivery"
          subtitle="Set the delivery time shown on the app's home screen, and an optional surcharge for priority orders."
        />
        <Card className="max-w-xl">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Timer"
        subtitle="Set the delivery time shown on the app's home screen."
      >
        {canManage && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        )}
      </PageHeader>

      {validationError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {validationError}
        </div>
      ) : null}

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Delivery Time Badge</CardTitle>
              <CardDescription>
                This is a plain display number — not a live calculated estimate. Customers
                see it as &ldquo;⚡ {minutes} mins delivery&rdquo; at the top of the home
                screen.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="delivery-eta-minutes">Delivery time (minutes)</Label>
          <div className="relative max-w-[200px]">
            <Input
              id="delivery-eta-minutes"
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={1}
              disabled={!canManage}
              value={String(minutes)}
              onChange={(e) => setMinutes(numOrZero(e.target.value))}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              mins
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Shown to every customer on every store front, immediately after saving.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Quick Delivery Surcharge</CardTitle>
              <CardDescription>
                An optional flat fee charged only when a customer explicitly chooses
                &ldquo;Quick Delivery&rdquo; at checkout — never added to a normal order.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="quick-delivery-enabled">Enable Quick Delivery surcharge</Label>
              <p className="text-xs text-muted-foreground">
                When off, customers never see or pay this fee.
              </p>
            </div>
            <Switch
              id="quick-delivery-enabled"
              checked={surchargeEnabled}
              disabled={!canManage}
              onCheckedChange={setSurchargeEnabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quick-delivery-amount">Surcharge amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="quick-delivery-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_SURCHARGE}
                  step={1}
                  disabled={!canManage || !surchargeEnabled}
                  value={String(surchargeAmount)}
                  onChange={(e) => setSurchargeAmount(numOrZero(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-delivery-eta">Delivery time when chosen</Label>
              <div className="relative">
                <Input
                  id="quick-delivery-eta"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_MINUTES}
                  step={1}
                  disabled={!canManage || !surchargeEnabled}
                  value={String(quickEtaMinutes)}
                  onChange={(e) => setQuickEtaMinutes(numOrZero(e.target.value))}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  mins
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Shown to the customer as the promised delivery time once they pay for Quick Delivery — should be faster than the {minutes}-min normal estimate above.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="quick-delivery-label">Fee label shown on the bill</Label>
            <Input
              id="quick-delivery-label"
              type="text"
              maxLength={60}
              disabled={!canManage || !surchargeEnabled}
              value={surchargeLabel}
              onChange={(e) => setSurchargeLabel(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
