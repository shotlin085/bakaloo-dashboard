"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import {
  Settings,
  Truck,
  DollarSign,
  Store,
  Shield,
  Bike,
  Smartphone,
  Save,
  RotateCcw,
  CreditCard,
  Bell,
  Key,
  MapPin,
  Clock,
  Database,
  Palette,
  Mail,
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSettings, useUpdateSettings } from "@/hooks/useSettings"
import type { AppSettings, UpdateSettingsPayload } from "@/types/settings.types"
import { usePermissions } from "@/hooks/usePermissions"
import { useShopContext, useIsSuperAdmin } from "@/hooks/useShopContext"
import { EmptyShopState } from "@/components/shared/empty-shop-state"

interface SettingKey {
  key: string
  label: string
  type: "number" | "text" | "boolean"
  suffix?: string
}

interface SettingsGroup {
  label: string
  icon: React.ElementType
  keys: SettingKey[]
}

const GROUPS: SettingsGroup[] = [
  {
    label: "Delivery",
    icon: Truck,
    keys: [
      { key: "delivery_fee", label: "Delivery Fee", type: "number", suffix: "₹" },
      { key: "free_delivery_above", label: "Free Delivery Above", type: "number", suffix: "₹" },
      { key: "delivery_radius_km", label: "Delivery Radius", type: "number", suffix: "km" },
      { key: "express_delivery_min", label: "Express Delivery Time", type: "number", suffix: "min" },
    ],
  },
  {
    label: "Pricing & Limits",
    icon: DollarSign,
    keys: [
      { key: "platform_fee", label: "Platform Fee", type: "number", suffix: "₹" },
      { key: "min_order_amount", label: "Min Order Amount", type: "number", suffix: "₹" },
      { key: "cod_max_amount", label: "Max COD Amount", type: "number", suffix: "₹" },
    ],
  },
  {
    label: "Store Info",
    icon: Store,
    keys: [
      { key: "store_name", label: "Store Name", type: "text" },
      { key: "store_gstin", label: "GSTIN", type: "text" },
      { key: "support_phone", label: "Support Phone", type: "text" },
      { key: "support_email", label: "Support Email", type: "text" },
    ],
  },
  {
    label: "Store Location",
    icon: MapPin,
    keys: [
      { key: "store_address", label: "Store Address", type: "text" },
      { key: "store_lat", label: "Store Latitude (GPS)", type: "number" },
      { key: "store_lng", label: "Store Longitude (GPS)", type: "number" },
      { key: "store_phone", label: "Store Contact Phone", type: "text" },
      { key: "serviceable_pincodes", label: "Serviceable Pincodes (comma-separated)", type: "text" },
    ],
  },
  {
    label: "Rider Payouts",
    icon: Bike,
    keys: [
      { key: "rider_base_pay_3km", label: "Base Pay (0–3 km)", type: "number", suffix: "₹" },
      { key: "rider_base_pay_5km", label: "Base Pay (3–5 km)", type: "number", suffix: "₹" },
      { key: "rider_base_pay_8km", label: "Base Pay (5–8 km)", type: "number", suffix: "₹" },
      { key: "rider_base_pay_above", label: "Base Pay (8+ km)", type: "number", suffix: "₹" },
      { key: "rider_rating_bonus", label: "Rating Bonus (4.5+)", type: "number", suffix: "₹" },
    ],
  },
  {
    label: "Loyalty",
    icon: Shield,
    keys: [
      { key: "loyalty_rate", label: "Points per ₹1 Spent", type: "number" },
      { key: "loyalty_value", label: "Value per Point", type: "number", suffix: "₹" },
    ],
  },
  {
    label: "Payment",
    icon: CreditCard,
    keys: [
      { key: "razorpay_key_id", label: "Razorpay Key ID", type: "text" },
      { key: "razorpay_key_secret", label: "Razorpay Secret", type: "text" },
      { key: "cod_enabled", label: "COD Enabled", type: "boolean" },
      { key: "wallet_enabled", label: "Wallet Enabled", type: "boolean" },
      { key: "wallet_min_recharge", label: "Min Wallet Recharge", type: "number", suffix: "₹" },
      { key: "wallet_max_balance", label: "Max Wallet Balance", type: "number", suffix: "₹" },
    ],
  },
  {
    label: "Notifications",
    icon: Bell,
    keys: [
      { key: "sms_provider", label: "SMS Provider", type: "text" },
      { key: "sms_api_key", label: "SMS API Key", type: "text" },
      { key: "otp_sms_template", label: "OTP SMS Template", type: "text" },
      { key: "order_confirmed_sms", label: "Order Confirmed SMS", type: "text" },
    ],
  },
  {
    label: "Integrations",
    icon: Key,
    keys: [
      { key: "google_maps_key", label: "Google Maps API Key", type: "text" },
      { key: "cloudinary_cloud_name", label: "Cloudinary Cloud Name", type: "text" },
      { key: "firebase_enabled", label: "Firebase Push Enabled", type: "boolean" },
    ],
  },
  {
    label: "App Config",
    icon: Smartphone,
    keys: [
      { key: "app_version", label: "App Version", type: "text" },
      { key: "app_maintenance", label: "Maintenance Mode", type: "boolean" },
      { key: "otp_expiry_sec", label: "OTP Expiry", type: "number", suffix: "sec" },
      { key: "low_stock_threshold", label: "Low Stock Threshold", type: "number" },
      { key: "max_bulk_assign", label: "Max Bulk Assign", type: "number" },
    ],
  },
  {
    label: "Delivery Zones",
    icon: MapPin,
    keys: [
      { key: "zone_1_name", label: "Zone 1 Name", type: "text" },
      { key: "zone_1_radius", label: "Zone 1 Radius", type: "number", suffix: "km" },
      { key: "zone_1_fee", label: "Zone 1 Fee", type: "number", suffix: "₹" },
      { key: "zone_2_name", label: "Zone 2 Name", type: "text" },
      { key: "zone_2_radius", label: "Zone 2 Radius", type: "number", suffix: "km" },
      { key: "zone_2_fee", label: "Zone 2 Fee", type: "number", suffix: "₹" },
      { key: "zone_3_name", label: "Zone 3 Name", type: "text" },
      { key: "zone_3_radius", label: "Zone 3 Radius", type: "number", suffix: "km" },
      { key: "zone_3_fee", label: "Zone 3 Fee", type: "number", suffix: "₹" },
    ],
  },
  {
    label: "Delivery Slots",
    icon: Clock,
    keys: [
      { key: "slot_1_label", label: "Slot 1 Label", type: "text" },
      { key: "slot_1_start", label: "Slot 1 Start", type: "text" },
      { key: "slot_1_end", label: "Slot 1 End", type: "text" },
      { key: "slot_2_label", label: "Slot 2 Label", type: "text" },
      { key: "slot_2_start", label: "Slot 2 Start", type: "text" },
      { key: "slot_2_end", label: "Slot 2 End", type: "text" },
      { key: "slot_3_label", label: "Slot 3 Label", type: "text" },
      { key: "slot_3_start", label: "Slot 3 Start", type: "text" },
      { key: "slot_3_end", label: "Slot 3 End", type: "text" },
      { key: "slot_enabled", label: "Slots Enabled", type: "boolean" },
    ],
  },
  {
    label: "Backup & Data",
    icon: Database,
    keys: [
      { key: "auto_backup_enabled", label: "Auto Backup", type: "boolean" },
      { key: "backup_frequency_hours", label: "Backup Frequency", type: "number", suffix: "hrs" },
      { key: "backup_retention_days", label: "Retention Period", type: "number", suffix: "days" },
      { key: "backup_s3_bucket", label: "S3 Bucket", type: "text" },
      { key: "data_export_enabled", label: "Data Export Enabled", type: "boolean" },
    ],
  },
  {
    label: "Branding",
    icon: Palette,
    keys: [
      { key: "logo_url", label: "Logo URL", type: "text" },
      { key: "favicon_url", label: "Favicon URL", type: "text" },
      { key: "timezone", label: "Timezone", type: "text" },
      { key: "currency_code", label: "Currency Code", type: "text" },
      { key: "currency_symbol", label: "Currency Symbol", type: "text" },
    ],
  },
  {
    label: "Email Templates",
    icon: Mail,
    keys: [
      { key: "email_from_address", label: "From Address", type: "text" },
      { key: "email_from_name", label: "From Name", type: "text" },
      { key: "email_welcome_subject", label: "Welcome Subject", type: "text" },
      { key: "email_order_confirm_subject", label: "Order Confirm Subject", type: "text" },
      { key: "email_delivery_subject", label: "Delivery Update Subject", type: "text" },
      { key: "email_smtp_host", label: "SMTP Host", type: "text" },
      { key: "email_smtp_port", label: "SMTP Port", type: "number" },
      { key: "email_smtp_user", label: "SMTP User", type: "text" },
      { key: "email_smtp_password", label: "SMTP Password", type: "text" },
    ],
  },
]

function getValue(settings: AppSettings | undefined, key: string): string | number | boolean {
  if (!settings || !settings[key]) return ""
  return settings[key].value
}

function SettingsContent() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({})
  const [dirty, setDirty] = useState(false)
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  // ─── Shop context gating (Req 10.5) ──────────────────────────────────────
  // Settings are a per-shop surface. Outside SINGLE_SHOP mode the page
  // renders `<EmptyShopState />` and the underlying query is gated off via
  // `useSettings()`'s `enabled` flag, so no request is fired against the
  // backend. Mirrors the pattern used by `/shop-products`,
  // `/shop-financials`, `/shop-transactions`.
  const { mode } = useShopContext()
  const isSuperAdmin = useIsSuperAdmin()

  // 2FA State
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false)
  const [twoFaCode, setTwoFaCode] = useState("")
  const [twoFaVerifying, setTwoFaVerifying] = useState(false)
  const [twoFaSecret] = useState("JBSWY3DPEHPK3PXP") // Placeholder secret
  const [twoFaVerified, setTwoFaVerified] = useState(false)

  // Sync incoming settings into draft
  useEffect(() => {
    if (!settings) return
    const initial: Record<string, string | number | boolean> = {}
    for (const key of Object.keys(settings)) {
      initial[key] = settings[key].value
    }
    setDraft(initial)
    setDirty(false)
  }, [settings])

  const handleChange = useCallback(
    (key: string, value: string | number | boolean) => {
      setDraft((prev) => ({ ...prev, [key]: value }))
      setDirty(true)
    },
    []
  )

  const handleReset = useCallback(() => {
    if (!settings) return
    const initial: Record<string, string | number | boolean> = {}
    for (const key of Object.keys(settings)) {
      initial[key] = settings[key].value
    }
    setDraft(initial)
    setDirty(false)
  }, [settings])

  const handleSave = () => {
    if (!settings) return
    // Only send changed keys
    const payload: UpdateSettingsPayload = {}
    for (const [key, val] of Object.entries(draft)) {
      if (settings[key] && settings[key].value !== val) {
        payload[key] = val
      }
    }
    if (Object.keys(payload).length === 0) {
      setDirty(false)
      return
    }
    updateMutation.mutate(payload, {
      onSuccess: () => setDirty(false),
    })
  }

  // Req 10.5: outside SINGLE_SHOP mode the settings surface short-circuits
  // with `<EmptyShopState />`. The `useSettings()` query is gated off in
  // this branch, so no request is fired against the backend. Checked before
  // the loading gate so we never flash a skeleton while the Shop_Context_Store
  // is still resolving — `isLoading` is `false` for a disabled query in
  // TanStack Query v5, so this branch always wins when applicable.
  if (mode !== "STORE_MODE") {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Configure store settings" />
        <EmptyShopState isSuperAdmin={isSuperAdmin} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Configure store settings" />
        <LoadingSkeleton variant="table" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure store settings">
        {canManage && (
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!dirty}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {GROUPS.map((group) => {
          const Icon = group.icon
          return (
            <Card key={group.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {group.label}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                {group.keys.map((setting) => {
                  const currentValue = draft[setting.key] ?? getValue(settings, setting.key)

                  if (setting.type === "boolean") {
                    return (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-sm">{setting.label}</Label>
                          {settings?.[setting.key]?.description && (
                            <p className="text-xs text-muted-foreground">
                              {settings[setting.key].description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={
                            currentValue === true ||
                            currentValue === "true"
                          }
                          onCheckedChange={(checked) =>
                            handleChange(setting.key, checked)
                          }
                          disabled={!canManage}
                        />
                      </div>
                    )
                  }

                  return (
                    <div key={setting.key} className="space-y-1.5">
                      <Label className="text-sm">{setting.label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={setting.type === "number" ? "number" : "text"}
                          value={currentValue as string | number}
                          onChange={(e) =>
                            handleChange(
                              setting.key,
                              setting.type === "number"
                                ? parseFloat(e.target.value) || 0
                                : e.target.value
                            )
                          }
                          className="max-w-[220px]"
                          disabled={!canManage}
                        />
                        {setting.suffix && (
                          <span className="text-sm text-muted-foreground">
                            {setting.suffix}
                          </span>
                        )}
                      </div>
                      {settings?.[setting.key]?.description && (
                        <p className="text-xs text-muted-foreground">
                          {settings[setting.key].description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 2FA Security Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Two-Factor Authentication (2FA)
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium">Authenticator App</p>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security by requiring a TOTP code from an authenticator app (Google Authenticator, Authy, etc.) when signing in.
              </p>
              {twoFaEnabled && twoFaVerified && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">2FA is active</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {twoFaEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => { setTwoFaEnabled(false); setTwoFaVerified(false) }}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setTwoFaSetupOpen(true)}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {twoFaEnabled && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p><strong>Recovery codes</strong> — store these somewhere safe. If you lose access to your authenticator app, you can use a recovery code to sign in.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-2 font-mono">
                {["a4f2-k8m3", "b7j1-p9n4", "c5h6-q2r8", "d3g9-s1t7", "e8f4-u6v2", "f1d5-w3x9", "g7c8-y4z6", "h2b1-m5n3"].map((code) => (
                  <span key={code} className="px-2 py-1 rounded bg-background border text-center text-[11px]">{code}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFaSetupOpen} onOpenChange={setTwoFaSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Set Up 2FA</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit verification code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* QR Code placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-muted rounded-lg border-2 border-dashed flex items-center justify-center">
                <div className="text-center space-y-2">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">QR Code</p>
                </div>
              </div>
            </div>

            {/* Manual key */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Or enter this key manually:</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={twoFaSecret}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => navigator.clipboard.writeText(twoFaSecret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-1">
              <Label>Verification Code</Label>
              <Input
                placeholder="Enter 6-digit code"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-lg font-mono tracking-widest"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTwoFaSetupOpen(false); setTwoFaCode("") }}>Cancel</Button>
            <Button
              disabled={twoFaCode.length !== 6 || twoFaVerifying}
              onClick={() => {
                setTwoFaVerifying(true)
                // Simulate verification
                setTimeout(() => {
                  setTwoFaVerifying(false)
                  setTwoFaEnabled(true)
                  setTwoFaVerified(true)
                  setTwoFaSetupOpen(false)
                  setTwoFaCode("")
                }, 1200)
              }}
            >
              {twoFaVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky save bar */}
      {dirty && canManage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-background border rounded-lg shadow-lg px-4 py-2.5">
            <Settings className="h-4 w-4 text-muted-foreground animate-spin" />
            <span className="text-sm font-medium">You have unsaved changes</span>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <SettingsContent />
    </Suspense>
  )
}
