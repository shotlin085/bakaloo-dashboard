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
import { ImageUpload } from "@/components/products/ImageUpload"
import { useCreateBanner, useUpdateBanner } from "@/hooks/useBanners"
import { useCategories, useBundles } from "@/hooks/useCategories"
import type { Banner, CreateBannerPayload } from "@/types/banner.types"

interface BannerDialogProps {
  open: boolean
  onClose: () => void
  banner?: Banner | null
}

const INITIAL: CreateBannerPayload & { isActive: boolean } = {
  title: "",
  imageUrl: "",
  bannerType: "carousel",
  linkType: "none",
  linkValue: "",
  isActive: true,
  startDate: "",
  endDate: "",
  triggerType: "ALWAYS",
}

function sanitizeBannerImageUrl(value: string | null | undefined) {
  if (!value) return ""

  const trimmed = value.trim()
  if (!trimmed) return ""

  const httpsIndex = trimmed.lastIndexOf("https://res.cloudinary.com/")
  const httpIndex = trimmed.lastIndexOf("http://res.cloudinary.com/")
  const startIndex = Math.max(httpsIndex, httpIndex)

  if (startIndex >= 0) {
    return trimmed.slice(startIndex)
  }

  return trimmed
}

export function BannerDialog({ open, onClose, banner }: BannerDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const createMutation = useCreateBanner()
  const updateMutation = useUpdateBanner()
  const isEdit = !!banner
  const { data: categories } = useCategories()
  const { data: bundles } = useBundles()

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title ?? "",
        imageUrl: sanitizeBannerImageUrl(banner.image_url),
        bannerType: banner.banner_type ?? "carousel",
        linkType: banner.link_type ?? "none",
        linkValue: banner.link_value ?? "",
        isActive: banner.is_active,
        startDate: banner.start_date ? banner.start_date.slice(0, 16) : "",
        endDate: banner.end_date ? banner.end_date.slice(0, 16) : "",
        triggerType: banner.trigger_type ?? "ALWAYS",
      })
    } else {
      setForm(INITIAL)
    }
  }, [banner, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateBannerPayload = {
      title: form.title.trim(),
      imageUrl: sanitizeBannerImageUrl(form.imageUrl),
      bannerType: form.bannerType,
      linkType: form.linkType,
      linkValue: form.linkType !== "none" ? form.linkValue?.trim() : undefined,
      isActive: form.isActive,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      triggerType: form.triggerType,
    }

    if (isEdit && banner) {
      updateMutation.mutate(
        { id: banner.id, payload },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Banner" : "Add Banner"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Banner title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          {/* Banner Type */}
          <div className="space-y-1.5">
            <Label>Banner Type</Label>
            <Select
              value={form.bannerType ?? "carousel"}
              onValueChange={(v) =>
                setForm({ ...form, bannerType: v as CreateBannerPayload["bannerType"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="popup">Pop-up</SelectItem>
                <SelectItem value="announcement">Announcement Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show */}
          <div className="space-y-1.5">
            <Label>Show</Label>
            <Select
              value={form.triggerType ?? "ALWAYS"}
              onValueChange={(v) =>
                setForm({ ...form, triggerType: v as CreateBannerPayload["triggerType"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALWAYS">Always</SelectItem>
                <SelectItem value="STORE_CLOSED">Only when store is closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Banner Image */}
          <div className="space-y-2">
            <Label>Banner Image *</Label>
            <ImageUpload
              value={form.imageUrl || null}
              onChange={(url) => setForm({ ...form, imageUrl: url ?? "" })}
              label="Upload Banner Image"
              helperText={
                <div className="flex flex-col gap-0.5">
                  <span>• <strong>Size:</strong> Max 5MB</span>
                  <span>• <strong>Format:</strong> JPG, PNG, WEBP</span>
                  <span>• <strong>Recommended:</strong> Wide banner image (carousel ratio)</span>
                </div>
              }
            />

            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://... or upload above"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Link Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Link Type</Label>
              <Select
                value={form.linkType}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    linkType: v as CreateBannerPayload["linkType"],
                    linkValue: v === "none" ? "" : form.linkValue,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.linkType === "category" && (
              <div className="space-y-1.5">
                <Label>Category / Bundle</Label>
                <Select
                  value={form.linkValue || undefined}
                  onValueChange={(v) => setForm({ ...form, linkValue: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category or bundle" />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        🎁 {b.name}
                      </SelectItem>
                    ))}
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.linkType === "product" || form.linkType === "url") && (
              <div className="space-y-1.5">
                <Label htmlFor="linkValue">
                  {form.linkType === "url" ? "URL" : "Product ID"}
                </Label>
                <Input
                  id="linkValue"
                  placeholder={form.linkType === "url" ? "https://..." : "Enter product ID"}
                  value={form.linkValue ?? ""}
                  onChange={(e) => setForm({ ...form, linkValue: e.target.value })}
                />
              </div>
            )}
          </div>

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

          {/* Active toggle */}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
