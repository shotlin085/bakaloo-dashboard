"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function formatRemaining(ms: number): { text: string; overdue: boolean } {
  const overdue = ms < 0
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const text =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return { text: overdue ? `Overdue ${text}` : `${text} left`, overdue }
}

interface OrderCountdownProps {
  estimatedDelivery: string
  className?: string
  /** Freezes the tick — used once the order is no longer actively in transit. */
  frozen?: boolean
}

/**
 * Live "time left until ETA" countdown for ASAP orders, ticking
 * client-side against a static target timestamp — mirrors AbandonedTimer's
 * pattern (no per-second socket/query traffic), just counting down to a
 * future time instead of up from a past one.
 */
export function OrderCountdown({ estimatedDelivery, className, frozen }: OrderCountdownProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (frozen) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [frozen])

  const remaining = new Date(estimatedDelivery).getTime() - now
  const { text, overdue } = formatRemaining(remaining)

  return (
    <span
      className={cn(
        "font-mono tabular-nums text-[11px]",
        overdue && !frozen ? "text-red-600" : "text-muted-foreground",
        className
      )}
    >
      {text}
    </span>
  )
}
