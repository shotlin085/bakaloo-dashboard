"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { useTemplates } from "@/hooks/useNotifications"
import { sendAbandonedCartReminder } from "@/services/abandoned-carts.service"
import type { NotificationTemplate } from "@/types/notification.types"

const DEEP_LINK_PRESETS = [
  { label: "Cart", value: "/cart" },
  { label: "Home", value: "/home" },
  { label: "Offers", value: "/categories?tab=price_drop" },
]

interface SendReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Abandoned-cart episode ids to notify — one for a row action, many for a bulk action. */
  cartIds: string[]
}

/**
 * Reuses the app's real single-user push+in-app send path
 * (`POST /admin/abandoned-carts/:id/notify` → `NotificationsService.sendNotification`)
 * once per selected episode. Bulk sends are looped client-side rather than
 * through the per-mutation toast hook, since firing N individual success
 * toasts for a 50-cart selection would be worse UX than one summary toast.
 */
export function SendReminderDialog({ open, onOpenChange, cartIds }: SendReminderDialogProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [deepLink, setDeepLink] = useState("/cart")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [sending, setSending] = useState(false)
  const { data: templates } = useTemplates()
  const qc = useQueryClient()

  const count = cartIds.length

  function applyTemplate(t: NotificationTemplate) {
    setTitle(t.title)
    setBody(t.body)
    if (t.image_url) setImageUrl(t.image_url)
    if (t.deep_link) setDeepLink(t.deep_link)
    setSelectedTemplateId(t.id)
  }

  function reset() {
    setTitle("")
    setBody("")
    setImageUrl("")
    setDeepLink("/cart")
    setSelectedTemplateId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    const payload = {
      title,
      body,
      ...(imageUrl && { imageUrl }),
      ...(deepLink && { deepLink }),
    }
    const results = await Promise.allSettled(
      cartIds.map((id) => sendAbandonedCartReminder(id, payload)),
    )
    setSending(false)
    const failed = results.filter((r) => r.status === "rejected").length
    const succeeded = results.length - failed
    if (succeeded > 0) {
      toast.success(
        succeeded === 1 ? "Reminder sent" : `Reminder sent to ${succeeded} customers`,
      )
    }
    if (failed > 0) {
      toast.error(`${failed} reminder${failed === 1 ? "" : "s"} failed to send`)
    }
    qc.invalidateQueries({ queryKey: ["abandoned-carts"] })
    if (succeeded > 0) {
      onOpenChange(false)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Send Reminder {count > 1 ? `to ${count} Customers` : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {templates && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Use Template (optional)</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={(v) => {
                  const t = templates.find((x) => x.id === v)
                  if (t) applyTemplate(t)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter((t) => t.type === "PUSH")
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="r-title">Title *</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="You left something in your cart!"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-body">Message *</Label>
            <Textarea
              id="r-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Come back and complete your order before it's gone."
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-image">Image URL (https only)</Label>
            <Input
              id="r-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/…"
            />
            {imageUrl && !imageUrl.startsWith("https://") && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" /> Must be HTTPS. HTTP images will be skipped.
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Deep Link</Label>
            <Select value={deepLink} onValueChange={setDeepLink}>
              <SelectTrigger>
                <SelectValue placeholder="Select preset…" />
              </SelectTrigger>
              <SelectContent>
                {DEEP_LINK_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/custom/path or app://screen"
              className="mt-1.5"
            />
          </div>

          {title && (
            <div className="rounded-xl border bg-muted/50 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Push Preview
              </p>
              <div className="rounded-lg bg-background border p-3 space-y-1 shadow-sm max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    B
                  </div>
                  <span className="text-[11px] text-muted-foreground">Bakaloo</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">now</span>
                </div>
                <p className="text-sm font-semibold truncate">{title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || count === 0}>
              {sending ? "Sending…" : count > 1 ? `Send to ${count}` : "Send Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
