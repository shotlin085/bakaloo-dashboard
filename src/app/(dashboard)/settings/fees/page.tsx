"use client"

/**
 * Fees & Delivery settings — configures the canonical dynamic fee engine
 * (bakaloo-backend /api/v1/admin/fee-settings).
 *
 * Admins set the distance-based delivery formula, free-delivery threshold,
 * and the handling / platform / small-cart / surge / packaging fees here.
 * A live preview calculator computes a real breakdown via the backend so the
 * admin sees exactly what a customer would pay for a given subtotal + distance
 * — no values are hardcoded and nothing is computed client-side.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calculator, Loader2, Save, Truck } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { feeSettingsService } from "@/services/fee-settings.service"
import type {
  FeeSettings,
  FeePreview,
  FeeValueType,
} from "@/types/fee-settings.types"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function inr(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`
}

/** Parse a numeric input to a number, or null when blank. */
function numOrNull(value: string): number | null {
  if (value.trim() === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FeesAndDeliveryPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<FeeSettings | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "fee-settings"],
    queryFn: feeSettingsService.get,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const updateMutation = useMutation({
    mutationFn: feeSettingsService.update,
    onSuccess: () => {
      toast.success("Fees & delivery settings saved")
      queryClient.invalidateQueries({ queryKey: ["admin", "fee-settings"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function set<K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  // ── Client-side validation before save ───────────────────────────────────
  const validationError = useMemo(() => {
    if (!draft) return null
    if (draft.min_delivery_fee < 0) return "Minimum delivery fee cannot be negative"
    if (draft.base_distance_km < 0) return "Base distance cannot be negative"
    if (draft.per_km_fee < 0) return "Per-km fee cannot be negative"
    if (
      draft.max_delivery_distance_km != null &&
      draft.max_delivery_distance_km < draft.base_distance_km
    ) {
      return "Maximum delivery distance must be greater than or equal to the base distance"
    }
    if (
      draft.free_delivery_enabled &&
      (draft.free_delivery_above == null || draft.free_delivery_above <= 0)
    ) {
      return "Free-delivery threshold must be a positive amount when free delivery is enabled"
    }
    if (draft.handling_fee_type === "PERCENT" && draft.handling_fee_value > 100) {
      return "Handling fee percentage cannot exceed 100"
    }
    if (draft.platform_fee_type === "PERCENT" && draft.platform_fee_value > 100) {
      return "Platform fee percentage cannot exceed 100"
    }
    return null
  }, [draft])

  function handleSave() {
    if (!draft) return
    if (validationError) {
      toast.error(validationError)
      return
    }
    // Send the full editable config (backend accepts a partial; we send all).
    const { id, scope, shop_id, ...payload } = draft
    void id
    void scope
    void shop_id
    updateMutation.mutate(payload)
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fees & Delivery"
          subtitle="Configure dynamic delivery charges and order fees."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Delivery"
        subtitle="Configure dynamic, distance-based delivery charges and order fees. Changes apply to new orders only."
      >
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </PageHeader>

      {validationError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {validationError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <DeliverySection draft={draft} set={set} />
        <PreviewCalculator />
        <FlatFeeSection
          title="Handling Fee"
          description="Charged on every order to cover packing and handling."
          enabled={draft.handling_fee_enabled}
          onEnabledChange={(v) => set("handling_fee_enabled", v)}
          type={draft.handling_fee_type}
          onTypeChange={(v) => set("handling_fee_type", v)}
          value={draft.handling_fee_value}
          onValueChange={(v) => set("handling_fee_value", v)}
          label={draft.handling_fee_label}
          onLabelChange={(v) => set("handling_fee_label", v)}
          descriptionText={draft.handling_fee_description ?? ""}
          onDescriptionChange={(v) => set("handling_fee_description", v)}
        />
        <FlatFeeSection
          title="Platform Fee"
          description="Supports platform operations and customer support."
          enabled={draft.platform_fee_enabled}
          onEnabledChange={(v) => set("platform_fee_enabled", v)}
          type={draft.platform_fee_type}
          onTypeChange={(v) => set("platform_fee_type", v)}
          value={draft.platform_fee_value}
          onValueChange={(v) => set("platform_fee_value", v)}
          label={draft.platform_fee_label}
          onLabelChange={(v) => set("platform_fee_label", v)}
          descriptionText={draft.platform_fee_description ?? ""}
          onDescriptionChange={(v) => set("platform_fee_description", v)}
        />
        <SmallCartSection draft={draft} set={set} />
        <SimpleFeeSection
          title="Surge / Rain Fee"
          description="Temporary surcharge during high demand or bad weather."
          enabled={draft.surge_fee_enabled}
          onEnabledChange={(v) => set("surge_fee_enabled", v)}
          value={draft.surge_fee_value}
          onValueChange={(v) => set("surge_fee_value", v)}
          label={draft.surge_fee_label}
          onLabelChange={(v) => set("surge_fee_label", v)}
          descriptionText={draft.surge_fee_description ?? ""}
          onDescriptionChange={(v) => set("surge_fee_description", v)}
        />
        <SimpleFeeSection
          title="Packaging Fee"
          description="Covers eco-friendly packaging materials."
          enabled={draft.packaging_fee_enabled}
          onEnabledChange={(v) => set("packaging_fee_enabled", v)}
          value={draft.packaging_fee_value}
          onValueChange={(v) => set("packaging_fee_value", v)}
          label={draft.packaging_fee_label}
          onLabelChange={(v) => set("packaging_fee_label", v)}
          descriptionText={draft.packaging_fee_description ?? ""}
          onDescriptionChange={(v) => set("packaging_fee_description", v)}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Delivery fee (distance-based)
// ─────────────────────────────────────────────────────────────────────────────

interface DeliverySectionProps {
  draft: FeeSettings
  set: <K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) => void
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  disabled,
  step,
}: {
  id: string
  label: string
  value: number | null
  onChange: (v: number | null) => void
  suffix?: string
  placeholder?: string
  disabled?: boolean
  step?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step ?? "0.01"}
          disabled={disabled}
          placeholder={placeholder}
          value={value === null ? "" : String(value)}
          onChange={(e) => onChange(numOrNull(e.target.value))}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function DeliverySection({ draft, set }: DeliverySectionProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Delivery Fee</CardTitle>
              <CardDescription>
                Dynamic charge based on distance from the store to the customer.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <Switch
              checked={draft.delivery_fee_enabled}
              onCheckedChange={(v) => set("delivery_fee_enabled", v)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id="min_delivery_fee"
            label="Minimum delivery fee"
            suffix="₹"
            value={draft.min_delivery_fee}
            onChange={(v) => set("min_delivery_fee", v ?? 0)}
          />
          <NumberField
            id="base_distance_km"
            label="Base distance included"
            suffix="km"
            value={draft.base_distance_km}
            onChange={(v) => set("base_distance_km", v ?? 0)}
          />
          <NumberField
            id="per_km_fee"
            label="Per-km fee (after base)"
            suffix="₹"
            value={draft.per_km_fee}
            onChange={(v) => set("per_km_fee", v ?? 0)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id="max_delivery_distance_km"
            label="Max delivery distance (optional)"
            suffix="km"
            placeholder="No limit"
            value={draft.max_delivery_distance_km}
            onChange={(v) => set("max_delivery_distance_km", v)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Free delivery</p>
            <p className="text-xs text-muted-foreground">
              Waive only the delivery fee when the cart subtotal reaches the threshold.
            </p>
          </div>
          <Switch
            checked={draft.free_delivery_enabled}
            onCheckedChange={(v) => set("free_delivery_enabled", v)}
          />
        </div>
        {draft.free_delivery_enabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="free_delivery_above"
              label="Free delivery above"
              suffix="₹"
              value={draft.free_delivery_above}
              onChange={(v) => set("free_delivery_above", v)}
            />
          </div>
        ) : null}

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Formula: delivery&nbsp;=&nbsp;min&nbsp;fee&nbsp;+&nbsp;⌈max(0,&nbsp;distance&nbsp;−&nbsp;base)⌉&nbsp;×&nbsp;per-km&nbsp;fee.
          Distance beyond the max is capped so fees never run away.
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Flat/Percent fee (handling, platform)
// ─────────────────────────────────────────────────────────────────────────────

interface FlatFeeSectionProps {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  type: FeeValueType
  onTypeChange: (v: FeeValueType) => void
  value: number
  onValueChange: (v: number) => void
  label: string
  onLabelChange: (v: string) => void
  descriptionText: string
  onDescriptionChange: (v: string) => void
}

function FlatFeeSection({
  title,
  description,
  enabled,
  onEnabledChange,
  type,
  onTypeChange,
  value,
  onValueChange,
  label,
  onLabelChange,
  descriptionText,
  onDescriptionChange,
}: FlatFeeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => onTypeChange(v as FeeValueType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                <SelectItem value="PERCENT">Percentage of subtotal (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField
            id={`${title}-value`}
            label="Value"
            suffix={type === "PERCENT" ? "%" : "₹"}
            value={value}
            onChange={(v) => onValueChange(v ?? 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Customer-facing label</Label>
          <Input value={label} maxLength={60} onChange={(e) => onLabelChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description (shown in the bill info)</Label>
          <Textarea
            rows={2}
            maxLength={500}
            value={descriptionText}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Small cart fee
// ─────────────────────────────────────────────────────────────────────────────

function SmallCartSection({ draft, set }: DeliverySectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Small Cart Fee</CardTitle>
            <CardDescription>
              Charged when the subtotal is below the threshold.
            </CardDescription>
          </div>
          <Switch
            checked={draft.small_cart_fee_enabled}
            onCheckedChange={(v) => set("small_cart_fee_enabled", v)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id="small_cart_threshold"
            label="Apply below cart value"
            suffix="₹"
            value={draft.small_cart_threshold}
            onChange={(v) => set("small_cart_threshold", v ?? 0)}
          />
          <NumberField
            id="small_cart_fee"
            label="Fee amount"
            suffix="₹"
            value={draft.small_cart_fee}
            onChange={(v) => set("small_cart_fee", v ?? 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Customer-facing label</Label>
          <Input
            value={draft.small_cart_fee_label}
            maxLength={60}
            onChange={(e) => set("small_cart_fee_label", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={2}
            maxLength={500}
            value={draft.small_cart_fee_description ?? ""}
            onChange={(e) => set("small_cart_fee_description", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Simple flat fee (surge, packaging)
// ─────────────────────────────────────────────────────────────────────────────

interface SimpleFeeSectionProps {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  value: number
  onValueChange: (v: number) => void
  label: string
  onLabelChange: (v: string) => void
  descriptionText: string
  onDescriptionChange: (v: string) => void
}

function SimpleFeeSection({
  title,
  description,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  label,
  onLabelChange,
  descriptionText,
  onDescriptionChange,
}: SimpleFeeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <NumberField
          id={`${title}-value`}
          label="Fee amount"
          suffix="₹"
          value={value}
          onChange={(v) => onValueChange(v ?? 0)}
        />
        <div className="space-y-1.5">
          <Label>Customer-facing label</Label>
          <Input value={label} maxLength={60} onChange={(e) => onLabelChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={2}
            maxLength={500}
            value={descriptionText}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview calculator — calls the backend so the breakdown is authoritative
// ─────────────────────────────────────────────────────────────────────────────

function PreviewCalculator() {
  const [subtotal, setSubtotal] = useState("350")
  const [distanceKm, setDistanceKm] = useState("2.8")
  const [result, setResult] = useState<FeePreview | null>(null)

  const previewMutation = useMutation({
    mutationFn: feeSettingsService.preview,
    onSuccess: (data) => setResult(data),
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function run() {
    previewMutation.mutate({
      subtotal: Number(subtotal) || 0,
      distanceKm: distanceKm.trim() === "" ? undefined : Number(distanceKm),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Preview Calculator</CardTitle>
            <CardDescription>
              Computed by the backend using the saved configuration.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="preview-subtotal">Cart subtotal</Label>
            <Input
              id="preview-subtotal"
              type="number"
              min={0}
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preview-distance">Distance (km)</Label>
            <Input
              id="preview-distance"
              type="number"
              min={0}
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={run}
          disabled={previewMutation.isPending}
        >
          {previewMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" />
          )}
          Calculate
        </Button>

        {result ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <Row label="Items subtotal" value={inr(result.itemsSubtotal)} />
            {result.fees.map((fee) => (
              <Row
                key={fee.code}
                label={fee.label + (fee.waived ? " (waived)" : "")}
                value={
                  fee.waived
                    ? "FREE"
                    : inr(fee.amount)
                }
                muted={fee.waived}
              />
            ))}
            {result.freeDelivery.enabled && !result.freeDelivery.unlocked ? (
              <p className="text-xs text-primary">
                Add {inr(result.freeDelivery.amountToUnlock)} more to unlock free delivery
                {result.freeDelivery.threshold
                  ? ` (above ${inr(result.freeDelivery.threshold)})`
                  : ""}
              </p>
            ) : null}
            {result.freeDelivery.unlocked ? (
              <p className="text-xs text-primary">Free delivery unlocked</p>
            ) : null}
            <Separator />
            <Row
              label="Total payable"
              value={inr(result.totalPayable)}
              bold
            />
            <p className="text-xs text-muted-foreground">
              Distance: {result.distance.known ? result.distance.label : "unknown (fallback)"} ·
              ETA ~{result.deliveryEtaMinutes} mins
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "font-semibold text-foreground" : ""
      } ${muted ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
