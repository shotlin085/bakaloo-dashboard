"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRecordB2BSettlement } from "@/hooks/useOrders"
import type { B2BSettlementMethod } from "@/types"

export const SETTLEMENT_METHOD_LABEL: Record<B2BSettlementMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  RAZORPAY: "Razorpay",
  OTHER: "Other",
}

let rowIdCounter = 0
function nextRowId() {
  rowIdCounter += 1
  return rowIdCounter
}

interface SettlementRow {
  id: number
  method: B2BSettlementMethod
  amount: string
  note: string
}

function emptyRow(): SettlementRow {
  return { id: nextRowId(), method: "CASH", amount: "", note: "" }
}

/**
 * Multi-row payment-collection entry — a B2B customer often pays one order
 * across several methods at once (e.g. ₹300 UPI + ₹400 cash), so this lets
 * an admin add as many method/amount rows as needed and submit them
 * together as one action, rather than repeating the whole flow per method.
 * Each row still becomes its own `order_b2b_settlements` entry server-side
 * (sent as sequential requests) — there's no batch endpoint, just a batched
 * UI on top of the same one-entry-at-a-time API.
 */
export function B2BSettlementEntryForm({
  orderId,
  remaining,
  onSuccess,
  compact = false,
}: {
  orderId: string
  remaining: number
  onSuccess?: () => void
  compact?: boolean
}) {
  const recordSettlement = useRecordB2BSettlement()
  const [rows, setRows] = useState<SettlementRow[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)

  const updateRow = (id: number, patch: Partial<SettlementRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (id: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const parsedRows = rows.map((r) => ({ ...r, parsedAmount: Number(r.amount) }))
  const validRows = parsedRows.filter((r) => Number.isFinite(r.parsedAmount) && r.parsedAmount > 0)
  const totalEntered = validRows.reduce((sum, r) => sum + r.parsedAmount, 0)
  const withinRemaining = totalEntered <= remaining + 0.01
  const canSubmit = validRows.length > 0 && withinRemaining && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      for (const row of validRows) {
        await recordSettlement.mutateAsync({
          orderId,
          payload: { method: row.method, amount: row.parsedAmount, note: row.note.trim() || undefined },
        })
      }
      setRows([emptyRow()])
      onSuccess?.()
    } finally {
      setSubmitting(false)
    }
  }

  const inputHeight = compact ? "h-8 text-xs" : ""

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2">
          <div className={`grid gap-2 flex-1 ${compact ? "grid-cols-[90px_1fr_1fr]" : "grid-cols-[130px_1fr_1fr]"}`}>
            <Select value={row.method} onValueChange={(v) => updateRow(row.id, { method: v as B2BSettlementMethod })}>
              <SelectTrigger className={inputHeight}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SETTLEMENT_METHOD_LABEL) as B2BSettlementMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {SETTLEMENT_METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount (₹)"
              value={row.amount}
              onChange={(e) => updateRow(row.id, { amount: e.target.value })}
              className={inputHeight}
            />
            <Input
              placeholder="Note (optional)"
              value={row.note}
              onChange={(e) => updateRow(row.id, { note: e.target.value })}
              className={inputHeight}
            />
          </div>
          {rows.length > 1 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={compact ? "h-8 w-8 shrink-0" : "shrink-0"}
              onClick={() => removeRow(row.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={addRow} className={compact ? "h-7 px-2 text-xs" : ""}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add another
        </Button>
        {!withinRemaining && (
          <span className="text-xs text-destructive">
            Total ₹{totalEntered.toFixed(2)} exceeds ₹{remaining.toFixed(2)} pending
          </span>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant={compact ? "outline" : "default"}
        className="w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Recording..." : "Record Collection"}
      </Button>
    </div>
  )
}
