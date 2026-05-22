"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductAttribute } from "@/types"
import { Plus, Trash2 } from "lucide-react"

interface AttributesEditorProps {
  value: ProductAttribute[]
  onChange: (attrs: ProductAttribute[]) => void
}

export function AttributesEditor({
  value,
  onChange,
}: AttributesEditorProps) {
  const updateRow = (
    index: number,
    field: keyof ProductAttribute,
    nextValue: string
  ) => {
    onChange(
      value.map((attribute, currentIndex) =>
        currentIndex === index
          ? { ...attribute, [field]: nextValue }
          : attribute
      )
    )
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index))
  }

  const addRow = () => {
    onChange([...value, { label: "", value: "" }])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {value.length === 0 && (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
            Add shopper-facing product attributes like size, fabric, flavor, or pack count.
          </div>
        )}

        {value.map((attribute, index) => (
          <div
            key={`${index}-${attribute.label}-${attribute.value}`}
            className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div className="space-y-2">
              <Label htmlFor={`attribute-label-${index}`}>Label</Label>
              <Input
                id={`attribute-label-${index}`}
                value={attribute.label}
                onChange={(event) => updateRow(index, "label", event.target.value)}
                placeholder="e.g. Size"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`attribute-value-${index}`}>Value</Label>
              <Input
                id={`attribute-value-${index}`}
                value={attribute.value}
                onChange={(event) => updateRow(index, "value", event.target.value)}
                placeholder="e.g. Large"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive"
                onClick={() => removeRow(index)}
                aria-label={`Delete attribute ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        Add Attribute
      </Button>
    </div>
  )
}
