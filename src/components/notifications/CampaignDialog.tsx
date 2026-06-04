"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, AlertCircle } from "lucide-react"
import { useSendBulk, useScheduleCampaign, useSegmentCount, useTemplates } from "@/hooks/useNotifications"
import type { CampaignSegment, NotificationTemplate } from "@/types/notification.types"

const SEGMENTS: { value: CampaignSegment; label: string; description: string; needsValue?: boolean; valuePlaceholder?: string; comingSoon?: boolean }[] = [
  { value: "all_customers", label: "All Customers", description: "Every active customer with FCM token" },
  { value: "inactive_customers", label: "Inactive Customers", description: "No orders in 30 days" },
  { value: "high_value", label: "High Value", description: "₹5,000+ total orders" },
  { value: "specific_user", label: "Specific User", description: "Target by phone or user ID", needsValue: true, valuePlaceholder: "Phone number or User ID" },
  { value: "store_customers", label: "Store Customers", description: "Customers who ordered from a specific store", needsValue: true, valuePlaceholder: "Shop ID" },
  { value: "cart_not_empty", label: "Cart Not Empty", description: "Users with items in cart", comingSoon: true },
]

const DEEP_LINK_PRESETS = [
  { label: "Home", value: "/home" },
  { label: "Notifications", value: "/notifications" },
  { label: "Cart", value: "/cart" },
  { label: "Wallet", value: "/wallet" },
  { label: "Orders", value: "/orders" },
  { label: "Categories", value: "/categories" },
  { label: "Offers / Price Drop", value: "/categories?tab=price_drop" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "send" | "schedule"
}

export function CampaignDialog({ open, onOpenChange, mode }: Props) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [segment, setSegment] = useState<CampaignSegment>("all_customers")
  const [segmentValue, setSegmentValue] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [deepLinkPreset, setDeepLinkPreset] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  const { data: templates } = useTemplates()
  const { data: segmentData } = useSegmentCount(segment, segmentValue || undefined)
  const sendMutation = useSendBulk()
  const scheduleMutation = useScheduleCampaign()

  const selectedSeg = SEGMENTS.find(s => s.value === segment)

  function applyTemplate(t: NotificationTemplate) {
    setTitle(t.title)
    setBody(t.body)
    if (t.image_url) setImageUrl(t.image_url)
    if (t.deep_link) setDeepLink(t.deep_link)
    setSelectedTemplateId(t.id)
  }

  function handleDeepLinkPreset(val: string) {
    setDeepLinkPreset(val)
    setDeepLink(val)
  }

  const effectiveDeepLink = deepLink || deepLinkPreset

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title, body, segment,
      ...(segmentValue && { segmentValue }),
      ...(imageUrl && { image_url: imageUrl }),
      ...(effectiveDeepLink && { deep_link: effectiveDeepLink }),
      ...(expiresAt && { expires_at: new Date(expiresAt).toISOString() }),
      ...(selectedTemplateId && { template_id: selectedTemplateId }),
    }

    if (mode === "send") {
      sendMutation.mutate(payload, {
        onSuccess: () => { onOpenChange(false); reset() },
      })
    } else {
      scheduleMutation.mutate(
        { ...payload, scheduledAt: new Date(scheduledAt).toISOString() },
        { onSuccess: () => { onOpenChange(false); reset() } }
      )
    }
  }

  const reset = () => {
    setTitle(""); setBody(""); setSegment("all_customers"); setSegmentValue("")
    setScheduledAt(""); setImageUrl(""); setDeepLinkPreset(""); setDeepLink("")
    setSelectedTemplateId(""); setExpiresAt("")
  }

  const pending = sendMutation.isPending || scheduleMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "send" ? "Send Bulk Notification" : "Schedule Campaign"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Use Template (optional)</Label>
              <Select value={selectedTemplateId} onValueChange={(v) => {
                const t = templates.find(x => x.id === v)
                if (t) applyTemplate(t)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.type === 'PUSH').map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="c-title">Title *</Label>
            <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-body">Message *</Label>
            <Textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" rows={3} required />
          </div>

          {/* Segment */}
          <div className="space-y-1.5">
            <Label>Target Segment *</Label>
            <Select value={segment} onValueChange={(v) => { setSegment(v as CampaignSegment); setSegmentValue("") }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.value} value={s.value} disabled={s.comingSoon}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">— {s.description}</span>
                      {s.comingSoon && <Badge variant="outline" className="text-[10px] ml-1">Soon</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {segmentData && !selectedSeg?.comingSoon && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3" />
                <span>{segmentData.count.toLocaleString()} users in segment</span>
              </div>
            )}
          </div>

          {/* Segment value (for specific_user, store_customers) */}
          {selectedSeg?.needsValue && (
            <div className="space-y-1.5">
              <Label>Segment Value *</Label>
              <Input
                value={segmentValue}
                onChange={(e) => setSegmentValue(e.target.value)}
                placeholder={selectedSeg.valuePlaceholder}
                required={selectedSeg.needsValue}
              />
            </div>
          )}

          {/* Schedule */}
          {mode === "schedule" && (
            <div className="space-y-1.5">
              <Label htmlFor="c-scheduled">Schedule Date & Time (IST) *</Label>
              <Input
                id="c-scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required={mode === "schedule"}
              />
              <p className="text-xs text-muted-foreground">Sent in UTC. Backend fires within 60s of scheduled time.</p>
            </div>
          )}

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="c-image">Image URL (https only)</Label>
            <Input
              id="c-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/…"
            />
            {imageUrl && !imageUrl.startsWith('https://') && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" /> Must be HTTPS. HTTP images will be skipped.
              </div>
            )}
          </div>

          {/* Deep Link */}
          <div className="space-y-1.5">
            <Label>Deep Link</Label>
            <Select value={deepLinkPreset} onValueChange={handleDeepLinkPreset}>
              <SelectTrigger><SelectValue placeholder="Select preset…" /></SelectTrigger>
              <SelectContent>
                {DEEP_LINK_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={deepLink}
              onChange={(e) => { setDeepLink(e.target.value); setDeepLinkPreset("") }}
              placeholder="/custom/path or app://screen"
              className="mt-1.5"
            />
          </div>

          {/* Campaign Expiry */}
          <div className="space-y-1.5">
            <Label htmlFor="c-expires">Campaign Expiry (optional)</Label>
            <Input
              id="c-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">If set, included in notification data for countdown display in app.</p>
          </div>

          {/* Push Preview */}
          {title && (
            <div className="rounded-xl border bg-muted/50 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Push Preview</p>
              <div className="rounded-lg bg-background border p-3 space-y-1 shadow-sm max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">B</div>
                  <span className="text-[11px] text-muted-foreground">Bakaloo</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">now</span>
                </div>
                <p className="text-sm font-semibold truncate">{title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>
                {imageUrl && imageUrl.startsWith('https://') && (
                  <div className="h-24 rounded bg-muted overflow-hidden mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
                {effectiveDeepLink && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{effectiveDeepLink}</p>
                )}
              </div>
            </div>
          )}

          {mode === "send" && segmentData && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                This will immediately send to{" "}
                <Badge variant="secondary" className="text-xs">
                  {segmentData.count.toLocaleString()} users
                </Badge>
                . Cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Processing…" : mode === "send" ? "Send Now" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
