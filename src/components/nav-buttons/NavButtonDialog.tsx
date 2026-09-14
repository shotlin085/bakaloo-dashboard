"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LinkValuePicker } from "@/components/builder/LinkPicker"
import { IconPicker, NavButtonIconPreview } from "@/components/nav-buttons/IconPicker"
import { useCreateNavButton, useUpdateNavButton } from "@/hooks/useNavButtons"
import { useCustomerSegments } from "@/hooks/useCustomerSegments"
import type {
  NavButton,
  CreateNavButtonPayload,
  NavButtonDestinationType,
  NavButtonIconKey,
} from "@/types/nav-button.types"

interface NavButtonDialogProps {
  open: boolean
  onClose: () => void
  navButton?: NavButton | null
}

/** Curated internal screens — deliberately a fixed list, not a free path
 * input: a typo'd route would 404 in the app with no validation to catch
 * it here. Extend this list (and the matching one in app_bottom_nav.dart)
 * when a new destination screen is needed. */
const APP_ROUTE_OPTIONS = [
  { value: "/profile/wishlist", label: "Wishlist" },
  { value: "/profile/wallet", label: "Wallet" },
  { value: "/orders", label: "Orders" },
  { value: "/categories", label: "Categories" },
  { value: "/cart", label: "Cart" },
  { value: "/search", label: "Search" },
  { value: "/profile/reviews", label: "My Reviews" },
  { value: "/profile/business-account", label: "Business Account" },
  { value: "/off_zone", label: "Off Zone" },
  { value: "/super_mall", label: "Super Mall" },
  { value: "/cafe", label: "Cafe" },
] as const

const DESTINATION_TYPE_LABELS: Record<NavButtonDestinationType, string> = {
  APP_ROUTE: "An existing app screen",
  CATEGORY: "A category or bundle",
  PRODUCT: "A product",
  WEBVIEW: "A website or game (opens full-screen)",
}

const INITIAL: CreateNavButtonPayload & { isActive: boolean } = {
  label: "",
  iconKey: "gift",
  accentColor: "#7C3AED",
  destinationType: "APP_ROUTE",
  destinationValue: APP_ROUTE_OPTIONS[0].value,
  passIdentity: false,
  audience: "ALL",
  targetSegmentId: undefined,
  isActive: true,
  startDate: undefined,
  endDate: undefined,
}

export function NavButtonDialog({ open, onClose, navButton }: NavButtonDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const createMutation = useCreateNavButton()
  const updateMutation = useUpdateNavButton()
  const isEdit = !!navButton
  const { data: segments } = useCustomerSegments()

  useEffect(() => {
    if (navButton) {
      setForm({
        label: navButton.label,
        iconKey: navButton.icon_key,
        accentColor: navButton.accent_color ?? "#7C3AED",
        destinationType: navButton.destination_type,
        destinationValue: navButton.destination_value,
        passIdentity: navButton.pass_identity,
        audience: navButton.audience,
        targetSegmentId: navButton.target_segment_id ?? undefined,
        isActive: navButton.is_active,
        startDate: navButton.start_date ? navButton.start_date.slice(0, 16) : undefined,
        endDate: navButton.end_date ? navButton.end_date.slice(0, 16) : undefined,
      })
    } else {
      setForm(INITIAL)
    }
  }, [navButton, open])

  const setDestinationType = (type: NavButtonDestinationType) => {
    // Each type's destinationValue means something different (a route
    // path vs. a raw category/product id vs. a URL) — switching type
    // without clearing would otherwise let a stale category id get saved
    // as if it were a URL, or vice versa.
    const defaultValue = type === "APP_ROUTE" ? APP_ROUTE_OPTIONS[0].value : ""
    setForm({ ...form, destinationType: type, destinationValue: defaultValue })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateNavButtonPayload = {
      label: form.label.trim(),
      iconKey: form.iconKey,
      accentColor: form.accentColor || undefined,
      destinationType: form.destinationType,
      destinationValue: form.destinationValue.trim(),
      passIdentity: form.destinationType === "WEBVIEW" ? !!form.passIdentity : false,
      audience: form.audience,
      targetSegmentId: form.targetSegmentId || undefined,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    }

    if (isEdit && navButton) {
      updateMutation.mutate({ id: navButton.id, payload }, { onSuccess: onClose })
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const canSubmit =
    form.label.trim().length > 0 && form.destinationValue.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Nav Button" : "Add Nav Button"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
            <NavButtonIconPreview iconKey={form.iconKey} accentColor={form.accentColor} size={22} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{form.label || "Button label"}</p>
              <p className="text-xs text-muted-foreground">This is the 5th bottom-nav slot</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              placeholder="e.g. Spin & Win"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              maxLength={30}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <IconPicker
                value={form.iconKey}
                accentColor={form.accentColor}
                onChange={(iconKey) => setForm({ ...form, iconKey: iconKey as NavButtonIconKey })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accentColor">Badge color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={form.accentColor || "#7C3AED"}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="h-9 w-11 rounded border cursor-pointer shrink-0"
                />
                <Input
                  value={form.accentColor || ""}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  placeholder="#7C3AED"
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label>Opens</Label>
            <Select
              value={form.destinationType}
              onValueChange={(v) => setDestinationType(v as NavButtonDestinationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DESTINATION_TYPE_LABELS) as NavButtonDestinationType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {DESTINATION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.destinationType === "APP_ROUTE" && (
            <div className="space-y-1.5">
              <Label>Screen</Label>
              <Select
                value={form.destinationValue}
                onValueChange={(v) => setForm({ ...form, destinationValue: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a screen" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROUTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(form.destinationType === "CATEGORY" || form.destinationType === "PRODUCT") && (
            <div className="space-y-1.5">
              <Label>{form.destinationType === "CATEGORY" ? "Category / Bundle" : "Product"}</Label>
              <LinkValuePicker
                type={form.destinationType === "CATEGORY" ? "category" : "product"}
                value={form.destinationValue || null}
                onChange={(v) => setForm({ ...form, destinationValue: v ?? "" })}
              />
            </div>
          )}

          {form.destinationType === "WEBVIEW" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="webviewUrl">URL</Label>
                <Input
                  id="webviewUrl"
                  type="url"
                  placeholder="https://example.com/event"
                  value={form.destinationValue}
                  onChange={(e) => setForm({ ...form, destinationValue: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Opens full-screen inside the app, like an in-app browser — the customer never
                  leaves Bakaloo.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch
                  checked={!!form.passIdentity}
                  onCheckedChange={(v) => setForm({ ...form, passIdentity: v })}
                />
                <div>
                  <Label className="cursor-pointer">Pass customer identity</Label>
                  <p className="text-xs text-muted-foreground">
                    The app appends a short-lived (10-minute) token identifying the customer —
                    this page (or a game/event server behind it) can resolve it via{" "}
                    <code className="text-[11px]">GET /webview/session?token=...</code> without
                    ever seeing their real login credentials.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audience + Target segment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select
                value={form.audience ?? "ALL"}
                onValueChange={(v) => setForm({ ...form, audience: v as CreateNavButtonPayload["audience"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">B2C + B2B</SelectItem>
                  <SelectItem value="B2C">B2C only</SelectItem>
                  <SelectItem value="B2B">B2B only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target segment</Label>
              <Select
                value={form.targetSegmentId ?? "__all__"}
                onValueChange={(v) =>
                  setForm({ ...form, targetSegmentId: v === "__all__" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Everyone in the audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Everyone (no segment)</SelectItem>
                  {(segments ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.member_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.targetSegmentId && (
            <p className="text-xs text-muted-foreground -mt-2">
              Only signed-in members of this segment see this button — combined with Audience
              above. Other customers keep their normal 4-button nav.
            </p>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.startDate ?? ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={form.endDate ?? ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label>Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
