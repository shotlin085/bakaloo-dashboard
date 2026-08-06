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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRiders } from "@/hooks/useRiders"
import { useCreateAreaSegment, useUpdateAreaSegment } from "@/hooks/useAreaSegments"
import type { AreaSegment } from "@/types/area-segment.types"

interface AreaSegmentDialogProps {
  open: boolean
  onClose: () => void
  segment?: AreaSegment | null
}

const NO_RIDER = "__none__"

export function AreaSegmentDialog({ open, onClose, segment }: AreaSegmentDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [riderId, setRiderId] = useState(NO_RIDER)
  const [priority, setPriority] = useState("0")
  const [isActive, setIsActive] = useState(true)
  const isEdit = !!segment

  const { data: ridersData } = useRiders()
  const createMutation = useCreateAreaSegment()
  const updateMutation = useUpdateAreaSegment()

  useEffect(() => {
    if (segment) {
      setName(segment.name)
      setDescription(segment.description ?? "")
      setRiderId(segment.rider_id ?? NO_RIDER)
      setPriority(String(segment.priority))
      setIsActive(segment.is_active)
    } else {
      setName("")
      setDescription("")
      setRiderId(NO_RIDER)
      setPriority("0")
      setIsActive(true)
    }
  }, [segment, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const riderIdValue = riderId === NO_RIDER ? undefined : riderId
    const priorityValue = Number(priority) || 0
    if (isEdit && segment) {
      updateMutation.mutate(
        {
          id: segment.id,
          payload: {
            name,
            description,
            isActive,
            riderId: riderId === NO_RIDER ? null : riderId,
            priority: priorityValue,
          },
        },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(
        { name, description, riderId: riderIdValue, priority: priorityValue },
        { onSuccess: onClose }
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const riders = ridersData?.riders ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Area Segment" : "Create Area Segment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="area-segment-name">Segment Name *</Label>
            <Input
              id="area-segment-name"
              placeholder="e.g. Koramangala Zone"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="area-segment-desc">Description</Label>
            <Textarea
              id="area-segment-desc"
              placeholder="What area does this cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assigned Rider</Label>
            <Select value={riderId} onValueChange={setRiderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a rider..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RIDER}>No rider assigned</SelectItem>
                {riders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {r.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="area-segment-priority">Priority</Label>
            <Input
              id="area-segment-priority"
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority wins if an address is ever registered in more than one active segment.
            </p>
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
