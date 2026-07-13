"use client"

/**
 * Wallet Settings — configures the global wallet balance cap and the
 * wallet-to-wallet transfer min/max (bakaloo-backend
 * /api/v1/admin/wallet-settings). These limits are enforced on every wallet
 * credit (top-up, admin credit, transfer) and on every transfer amount —
 * nothing here is cosmetic, changing a value here changes what the backend
 * will actually allow.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Wallet, PowerOff } from "lucide-react"
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
import { walletSettingsService } from "@/services/wallet-settings.service"
import type { WalletSettings } from "@/types/wallet-settings.types"
import { usePermissions } from "@/hooks/usePermissions"

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

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={1}
          step="1"
          disabled={disabled}
          value={String(value)}
          onChange={(e) => onChange(numOrZero(e.target.value))}
          className="pr-10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          ₹
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export default function WalletSettingsPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canManage = can("wallet-settings.manage")

  const [draft, setDraft] = useState<WalletSettings | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "wallet-settings"],
    queryFn: walletSettingsService.get,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const updateMutation = useMutation({
    mutationFn: walletSettingsService.update,
    onSuccess: () => {
      toast.success("Wallet settings saved")
      queryClient.invalidateQueries({ queryKey: ["admin", "wallet-settings"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function set<K extends keyof WalletSettings>(key: K, value: WalletSettings[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  const validationError = useMemo(() => {
    if (!draft) return null
    if (draft.maxWalletBalance <= 0) return "Maximum wallet balance must be a positive amount"
    if (draft.maxTransferAmount <= 0) return "Maximum transfer amount must be a positive amount"
    if (draft.minTransferAmount <= 0) return "Minimum transfer amount must be a positive amount"
    if (draft.minTransferAmount > draft.maxTransferAmount) {
      return "Minimum transfer amount cannot exceed the maximum transfer amount"
    }
    if (draft.maxTransferAmount > draft.maxWalletBalance) {
      return "Maximum transfer amount cannot exceed the maximum wallet balance"
    }
    return null
  }, [draft])

  function handleSave() {
    if (!draft) return
    if (validationError) {
      toast.error(validationError)
      return
    }
    updateMutation.mutate(draft)
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Wallet Settings"
          subtitle="Configure wallet balance and transfer limits."
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Settings"
        subtitle="Configure how much a wallet can hold, and how much a customer can send in a single transfer."
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

      <Card className="max-w-2xl border-amber-200 dark:border-amber-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PowerOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <CardTitle className="text-lg">Wallet Top-up</CardTitle>
              <CardDescription>
                Emergency kill-switch — turn this off during a Razorpay outage
                or any other payment issue to stop new top-up attempts before
                they hit a broken payment flow. Existing wallet balance and
                paying for orders from the wallet are unaffected.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Top-up enabled</p>
              <p className="text-xs text-muted-foreground">
                When off, tapping &quot;Add money&quot; in the app shows
                &quot;Wallet top-up is currently unavailable&quot; instead of
                opening Razorpay — no payment attempt is ever started.
              </p>
            </div>
            <Switch
              id="topupEnabled"
              checked={draft.topupEnabled}
              disabled={!canManage}
              onCheckedChange={(v) => set("topupEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Wallet-to-Wallet Transfers</CardTitle>
              <CardDescription>
                Lets a customer send wallet balance to another customer by phone
                number. Keep this off unless send-to-another-user has been
                cleared with a payments/regulatory advisor — it&apos;s a
                different obligation than wallet top-up and spend, which are
                unaffected by this switch.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Transfers enabled</p>
              <p className="text-xs text-muted-foreground">
                When off, sending money to another customer is blocked
                everywhere (app and API) — top-up and paying for orders from
                the wallet still work normally.
              </p>
            </div>
            <Switch
              id="transfersEnabled"
              checked={draft.transfersEnabled}
              disabled={!canManage}
              onCheckedChange={(v) => set("transfersEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Wallet Limits</CardTitle>
              <CardDescription>
                Applies to every customer wallet — top-ups, admin credits, and
                incoming transfers are all capped by the maximum balance below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField
            id="maxWalletBalance"
            label="Maximum wallet balance"
            hint="A wallet can never hold more than this amount, no matter how it's credited."
            value={draft.maxWalletBalance}
            onChange={(v) => set("maxWalletBalance", v)}
            disabled={!canManage}
          />
          <NumberField
            id="maxTransferAmount"
            label="Maximum transfer amount"
            hint="The most a customer can send in a single wallet-to-wallet transfer."
            value={draft.maxTransferAmount}
            onChange={(v) => set("maxTransferAmount", v)}
            disabled={!canManage}
          />
          <NumberField
            id="minTransferAmount"
            label="Minimum transfer amount"
            hint="The least a customer can send in a single wallet-to-wallet transfer."
            value={draft.minTransferAmount}
            onChange={(v) => set("minTransferAmount", v)}
            disabled={!canManage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
