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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useCreateSegment, useUpdateSegment } from "@/hooks/useCustomerSegments"
import type { CustomerSegment } from "@/types/customer-segment.types"

interface CustomerSegmentDialogProps {
  open: boolean
  onClose: () => void
  segment?: CustomerSegment | null
}

export function CustomerSegmentDialog({ open, onClose, segment }: CustomerSegmentDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const isEdit = !!segment

  const createMutation = useCreateSegment()
  const updateMutation = useUpdateSegment()

  useEffect(() => {
    if (segment) {
      setName(segment.name)
      setDescription(segment.description ?? "")
      setIsActive(segment.is_active)
    } else {
      setName("")
      setDescription("")
      setIsActive(true)
    }
  }, [segment, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit && segment) {
      updateMutation.mutate(
        { id: segment.id, payload: { name, description, isActive } },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate({ name, description }, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Segment" : "Create Customer Segment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="segment-name">Segment Name *</Label>
            <Input
              id="segment-name"
              placeholder="e.g. VIP Grocery Customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="segment-desc">Description</Label>
            <Textarea
              id="segment-desc"
              placeholder="What is this segment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
