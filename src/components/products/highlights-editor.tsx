"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

interface HighlightRow {
  key: string
  value: string
}

interface HighlightsEditorProps {
  value: Record<string, string>
  onChange: (highlights: Record<string, string>) => void
}

function toRows(value: Record<string, string>): HighlightRow[] {
  return Object.entries(value ?? {}).map(([key, rowValue]) => ({
    key,
    value: rowValue,
  }))
}

function toRecord(rows: HighlightRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const trimmedKey = row.key.trim()
    if (!trimmedKey) return acc
    acc[trimmedKey] = row.value
    return acc
  }, {})
}

export function HighlightsEditor({
  value,
  onChange,
}: HighlightsEditorProps) {
  const [rows, setRows] = useState<HighlightRow[]>(() => toRows(value))

  useEffect(() => {
    setRows(toRows(value))
  }, [value])

  const updateRows = (nextRows: HighlightRow[]) => {
    setRows(nextRows)
    onChange(toRecord(nextRows))
  }

  const updateRow = (
    index: number,
    field: keyof HighlightRow,
    nextValue: string
  ) => {
    updateRows(
      rows.map((row, currentIndex) =>
        currentIndex === index ? { ...row, [field]: nextValue } : row
      )
    )
  }

  const removeRow = (index: number) => {
    updateRows(rows.filter((_, currentIndex) => currentIndex !== index))
  }

  const addRow = () => {
    if (rows.length >= 5) return
    setRows([...rows, { key: "", value: "" }])
  }

  const maxReached = rows.length >= 5

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
            Add concise shopper-facing facts like product type, material, fit, or usage.
          </div>
        )}

        {rows.map((row, index) => (
          <div
            key={`${index}-${row.key}-${row.value}`}
            className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div className="space-y-2">
              <Label htmlFor={`highlight-key-${index}`}>Key</Label>
              <Input
                id={`highlight-key-${index}`}
                value={row.key}
                onChange={(event) => updateRow(index, "key", event.target.value)}
                placeholder="e.g. Product Type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`highlight-value-${index}`}>Value</Label>
              <Input
                id={`highlight-value-${index}`}
                value={row.value}
                onChange={(event) => updateRow(index, "value", event.target.value)}
                placeholder="e.g. Ankle Socks"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive"
                onClick={() => removeRow(index)}
                aria-label={`Delete highlight ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={addRow}
          disabled={maxReached}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Highlight
        </Button>
        <p className="text-xs text-muted-foreground">Max 5 highlights</p>
      </div>
    </div>
  )
}
