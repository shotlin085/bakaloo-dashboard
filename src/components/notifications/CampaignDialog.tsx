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
import { Users } from "lucide-react"
import { useSendBulk, useScheduleCampaign, useSegmentCount } from "@/hooks/useNotifications"
import type { CampaignSegment } from "@/types/notification.types"

const SEGMENTS: { value: CampaignSegment; label: string; description: string }[] = [
  { value: "all", label: "All Users", description: "Every active customer" },
  { value: "new", label: "New Users", description: "Registered in last 30 days" },
  { value: "inactive", label: "Inactive", description: "No orders in 30 days" },
  { value: "high_value", label: "High Value", description: "₹5,000+ total orders" },
  { value: "riders", label: "Riders", description: "All delivery riders" },
  { value: "specific", label: "Specific Users", description: "Target by phone number" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "send" | "schedule"
}

export function CampaignDialog({ open, onOpenChange, mode }: Props) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [segment, setSegment] = useState<CampaignSegment>("all")
  const [scheduledAt, setScheduledAt] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [targetPhones, setTargetPhones] = useState("")

  const { data: segmentData } = useSegmentCount(segment)
  const sendMutation = useSendBulk()
  const scheduleMutation = useScheduleCampaign()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "send") {
      sendMutation.mutate(
        {
          title, body, segment,
          ...(imageUrl && { image_url: imageUrl }),
          ...(deepLink && { deep_link: deepLink }),
          ...(segment === "specific" && targetPhones && { target_phones: targetPhones.split(",").map((p) => p.trim()).filter(Boolean) }),
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            reset()
          },
        }
      )
    } else {
      scheduleMutation.mutate(
        {
          title, body, segment, scheduledAt,
          ...(imageUrl && { image_url: imageUrl }),
          ...(deepLink && { deep_link: deepLink }),
          ...(segment === "specific" && targetPhones && { target_phones: targetPhones.split(",").map((p) => p.trim()).filter(Boolean) }),
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            reset()
          },
        }
      )
    }
  }

  const reset = () => {
    setTitle("")
    setBody("")
    setSegment("all")
    setScheduledAt("")
    setImageUrl("")
    setDeepLink("")
    setTargetPhones("")
  }

  const pending = sendMutation.isPending || scheduleMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "send" ? "Send Bulk Notification" : "Schedule Campaign"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-title">Title *</Label>
            <Input
              id="c-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-body">Message *</Label>
            <Textarea
              id="c-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target Segment *</Label>
            <Select value={segment} onValueChange={(v) => setSegment(v as CampaignSegment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        — {s.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {segmentData && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3" />
                <span>
                  {segmentData.count.toLocaleString()} users in this segment
                </span>
              </div>
            )}
          </div>
          {segment === "specific" && (
            <div className="space-y-1.5">
              <Label htmlFor="c-phones">Target Phone Numbers *</Label>
              <Textarea
                id="c-phones"
                value={targetPhones}
                onChange={(e) => setTargetPhones(e.target.value)}
                placeholder="Enter comma-separated phone numbers&#10;e.g. +919876543210, +919876543211"
                rows={2}
                required={segment === "specific"}
              />
              <p className="text-xs text-muted-foreground">
                {targetPhones ? targetPhones.split(",").filter((p) => p.trim()).length : 0} phone number(s)
              </p>
            </div>
          )}
          {mode === "schedule" && (
            <div className="space-y-1.5">
              <Label htmlFor="c-scheduled">Schedule Date & Time *</Label>
              <Input
                id="c-scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required={mode === "schedule"}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-image">Image URL</Label>
              <Input
                id="c-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-deeplink">Deep Link</Label>
              <Input
                id="c-deeplink"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                placeholder="app://screen/id"
              />
            </div>
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
                {imageUrl && (
                  <div className="h-24 rounded bg-muted overflow-hidden mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {mode === "send" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                This will immediately send a push notification to{" "}
                <Badge variant="secondary" className="text-xs">
                  {segmentData?.count.toLocaleString() ?? "..."} users
                </Badge>
                . This action cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Processing..."
                : mode === "send"
                ? "Send Now"
                : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
