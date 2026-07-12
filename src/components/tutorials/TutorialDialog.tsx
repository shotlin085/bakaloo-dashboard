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
import { useCreateTutorial, useUpdateTutorial } from "@/hooks/useTutorials"
import type { TutorialVideo, CreateTutorialPayload } from "@/types/tutorial.types"

interface TutorialDialogProps {
  open: boolean
  onClose: () => void
  tutorial?: TutorialVideo | null
}

const INITIAL: CreateTutorialPayload = {
  title: "",
  videoUrl: "",
  language: "",
  isActive: true,
}

export function TutorialDialog({ open, onClose, tutorial }: TutorialDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const createMutation = useCreateTutorial()
  const updateMutation = useUpdateTutorial()
  const isEdit = !!tutorial

  useEffect(() => {
    if (tutorial) {
      setForm({
        title: tutorial.title ?? "",
        videoUrl: tutorial.video_url ?? "",
        language: tutorial.language ?? "",
        isActive: tutorial.is_active,
      })
    } else {
      setForm(INITIAL)
    }
  }, [tutorial, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateTutorialPayload = {
      title: form.title.trim(),
      videoUrl: form.videoUrl.trim(),
      language: form.language?.trim() || undefined,
      isActive: form.isActive,
    }

    if (isEdit && tutorial) {
      updateMutation.mutate({ id: tutorial.id, payload }, { onSuccess: onClose })
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tutorial" : "Add Tutorial"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. How to place your first order"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="videoUrl">YouTube video link *</Label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Paste any YouTube link — watch, youtu.be, or Shorts all work. Plays
              inside the app, never redirects to YouTube.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="language">Language (optional)</Label>
            <Input
              id="language"
              placeholder="e.g. English, Hindi, Gujarati"
              value={form.language ?? ""}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              maxLength={50}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label>Active (visible in the app)</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
