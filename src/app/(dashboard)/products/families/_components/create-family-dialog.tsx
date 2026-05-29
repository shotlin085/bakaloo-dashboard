"use client"

/**
 * CreateFamilyDialog — modal for creating a new product family. After
 * success, the parent typically routes to the new family's detail page.
 */

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCreateProductFamily } from "@/hooks/useProductFamilies"
import type { ProductFamily } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (family: ProductFamily) => void
}

export function CreateFamilyDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [description, setDescription] = useState("")
  const { data: categories } = useCategories()
  const create = useCreateProductFamily()

  function reset() {
    setName("")
    setCategoryId("")
    setDescription("")
  }

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await create.mutateAsync({
      name: trimmed,
      category_id: categoryId || null,
      description: description.trim() || null,
      is_active: true,
    })
    reset()
    onOpenChange(false)
    onCreated?.(created)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product family</DialogTitle>
          <DialogDescription>
            Group multiple options (250g, 500g, 1kg) under one family. Each
            option remains a separate purchasable product.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Family Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tomato, Maggi Double Masala Noodles"
              maxLength={255}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Category (optional)</Label>
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
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes about this family"
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
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            Create family
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
