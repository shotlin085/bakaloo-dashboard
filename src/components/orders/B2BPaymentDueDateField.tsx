"use client"

import { useState } from "react"
import { CalendarClock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSetB2BPaymentDueDate } from "@/hooks/useOrders"
import { formatDate } from "@/lib/utils"

/**
 * "5 days later I will pay" — an admin-set date the customer promised to
 * pay by. Purely a schedule note for the admin's own tracking; nothing
 * automated reacts to it (no auto-charge, no auto-suspension).
 */
export function B2BPaymentDueDateField({
  orderId,
  dueDate,
  compact = false,
}: {
  orderId: string
  dueDate: string | null | undefined
  /** Omits the "Payment schedule" label — for use in a table cell. */
  compact?: boolean
}) {
  const setDueDate = useSetB2BPaymentDueDate()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dueDate ?? "")

  if (!editing) {
    const trigger = (
      <button
        type="button"
        onClick={() => {
          setValue(dueDate ?? "")
          setEditing(true)
        }}
        className="font-medium text-brand-600 hover:underline"
      >
        {dueDate ? `Due ${formatDate(dueDate)}` : "Set a due date"}
      </button>
    )
    if (compact) return trigger
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Payment schedule
        </span>
        {trigger}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-xs flex-1"
      />
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={setDueDate.isPending || !value}
        onClick={() =>
          setDueDate.mutate(
            { orderId, payload: { dueDate: value } },
            { onSuccess: () => setEditing(false) }
          )
        }
      >
        Save
      </Button>
      {dueDate && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          disabled={setDueDate.isPending}
          onClick={() =>
            setDueDate.mutate(
              { orderId, payload: { dueDate: null } },
              { onSuccess: () => setEditing(false) }
            )
          }
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
