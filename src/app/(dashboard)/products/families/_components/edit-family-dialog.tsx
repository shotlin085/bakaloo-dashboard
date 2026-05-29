"use client"

/**
 * EditFamilyDialog — modal for updating an existing product family's
 * name, category, and description.
 */

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useCategories } from "@/hooks/useCategories"
import { useUpdateProductFamily } from "@/hooks/useProductFamilies"
import type { ProductFamily } from "@/types"

interface Props {
  family: ProductFamily
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditFamilyDialog({ family, open, onOpenChange }: Props) {
  const [name, setName] = useState(family.name)
  const [categoryId, setCategoryId] = useState(family.category_id ?? "")
  const [description, setDescription] = useState(family.description ?? "")
  const { data: categories } = useCategories()
  const update = useUpdateProductFamily()

  useEffect(() => {
    if (open) {
      setName(family.name)
      setCategoryId(family.category_id ?? "")
      setDescription(family.description ?? "")
    }
  }, [open, family])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    await update.mutateAsync({
      id: family.id,
      payload: {
        name: trimmed,
        category_id: categoryId || null,
        description: description.trim() || null,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit family</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Family Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || update.isPending}
          >
            {update.isPending && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
