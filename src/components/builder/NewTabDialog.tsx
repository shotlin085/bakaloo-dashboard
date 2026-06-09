"use client"

import { useEffect, useState } from "react"
import { Layers3, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ThemeStoreKey, ThemeTab } from "@/types/theme.types"

const STORE_LABELS: Record<ThemeStoreKey, string> = {
  zepto: "Bakaloo",
  off_zone: "50% OFF Zone",
  super_mall: "Super Mall",
  cafe: "Cafe",
}

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function makeUniqueKey(label: string, existingTabs: ThemeTab[]) {
  const base = slugifyKey(label) || "new_tab"
  let key = base
  let n = 2
  while (existingTabs.some((t) => t.key === key)) {
    key = `${base}_${n}`
    n++
  }
  return key
}

interface NewTabDialogProps {
  open: boolean
  onClose: () => void
  existingTabs: ThemeTab[]
  defaultStoreKey: ThemeStoreKey
  isCreating?: boolean
  onCreate: (params: {
    label: string
    key: string
    store_key: ThemeStoreKey
  }) => void
}

export default function NewTabDialog({
  open,
  onClose,
  existingTabs,
  defaultStoreKey,
  isCreating = false,
  onCreate,
}: NewTabDialogProps) {
  const [label, setLabel] = useState("")
  const [storeKey, setStoreKey] = useState<ThemeStoreKey>(defaultStoreKey)

  // Reset on open
  useEffect(() => {
    if (open) {
      setLabel("")
      setStoreKey(defaultStoreKey)
    }
  }, [open, defaultStoreKey])

  const derivedKey = label.trim() ? makeUniqueKey(label, existingTabs) : ""
  const isValid = label.trim().length > 0

  const handleCreate = () => {
    if (!isValid) return
    onCreate({
      label: label.trim(),
      key: derivedKey,
      store_key: storeKey,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Layers3 className="h-4 w-4" />
            </div>
            <DialogTitle>New Tab</DialogTitle>
          </div>
          <DialogDescription>
            Create a new theme tab. The key is auto-generated from the label.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="new-tab-label">
              Tab Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-tab-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Fresh Deals, Electronics"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) handleCreate()
              }}
            />
          </div>

          {/* Internal key — auto-derived, shown for transparency */}
          <div className="space-y-1.5">
            <Label className="text-slate-500">
              Internal key{" "}
              <span className="text-[11px] text-slate-400">(auto-generated)</span>
            </Label>
            <Input
              value={derivedKey}
              readOnly
              className="bg-slate-50 font-mono text-sm text-slate-500"
              tabIndex={-1}
            />
          </div>

          {/* Store scope */}
          <div className="space-y-1.5">
            <Label htmlFor="new-tab-store">Store</Label>
            <Select
              value={storeKey}
              onValueChange={(v) => setStoreKey(v as ThemeStoreKey)}
            >
              <SelectTrigger id="new-tab-store">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STORE_LABELS) as ThemeStoreKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STORE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isValid || isCreating}
            onClick={handleCreate}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Layers3 className="mr-2 h-4 w-4" />
            )}
            Create Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
