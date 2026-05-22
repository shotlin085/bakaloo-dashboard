"use client"

import { useState, useEffect } from "react"
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
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/useNotifications"
import type { NotificationTemplate, CreateTemplatePayload } from "@/types/notification.types"

const TEMPLATE_TYPES = ["PUSH", "SMS", "EMAIL", "IN_APP"] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: NotificationTemplate | null
}

export function TemplateDialog({ open, onOpenChange, template }: Props) {
  const [form, setForm] = useState<CreateTemplatePayload>({
    name: "",
    title: "",
    body: "",
    type: "PUSH",
    variables: [],
  })
  const [variablesInput, setVariablesInput] = useState("")

  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const isEdit = !!template

  useEffect(() => {
    if (template) {
      let vars: string[] = []
      try {
        vars = JSON.parse(template.variables || "[]")
      } catch {
        /* empty */
      }
      setForm({
        name: template.name,
        title: template.title,
        body: template.body,
        type: template.type,
        variables: vars,
        image_url: template.image_url ?? "",
        deep_link: template.deep_link ?? "",
      })
      setVariablesInput(vars.join(", "))
    } else {
      setForm({ name: "", title: "", body: "", type: "PUSH", variables: [], image_url: "", deep_link: "" })
      setVariablesInput("")
    }
  }, [template, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const vars = variablesInput
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    const payload = { ...form, variables: vars.length ? vars : undefined }

    if (isEdit && template) {
      updateMutation.mutate(
        { id: template.id, payload },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Name *</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Order Confirmed"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-type">Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as CreateTemplatePayload["type"] })
                }
              >
                <SelectTrigger id="t-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title *</Label>
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Notification title"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-body">Body *</Label>
            <Textarea
              id="t-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Notification body text. Use {{variable}} for dynamic content."
              rows={3}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-vars">Variables (comma-separated)</Label>
            <Input
              id="t-vars"
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              placeholder="{{name}}, {{order_id}}"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-image">Image URL</Label>
              <Input
                id="t-image"
                value={form.image_url ?? ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-deeplink">Deep Link</Label>
              <Input
                id="t-deeplink"
                value={form.deep_link ?? ""}
                onChange={(e) => setForm({ ...form, deep_link: e.target.value })}
                placeholder="app://screen/id"
              />
            </div>
          </div>

          {/* Push Preview */}
          {form.type === "PUSH" && form.title && (
            <div className="rounded-xl border bg-muted/50 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Push Preview</p>
              <div className="rounded-lg bg-background border p-3 space-y-1 shadow-sm max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">B</div>
                  <span className="text-[11px] text-muted-foreground">Bakaloo</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">now</span>
                </div>
                <p className="text-sm font-semibold truncate">{form.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{form.body}</p>
                {form.image_url && (
                  <div className="h-24 rounded bg-muted overflow-hidden mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
              </div>
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
              {pending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
