"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function formatElapsed(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}

interface AbandonedTimerProps {
  abandonedAt: string
  className?: string
  /** Freezes the tick — used once the episode is no longer OPEN. */
  frozen?: boolean
}

/**
 * Live elapsed-time display, ticking client-side against a static
 * timestamp — no per-second socket/query traffic. Sockets are reserved for
 * discrete status-transition pushes (see `SocketProvider`), not this timer.
 */
export function AbandonedTimer({ abandonedAt, className, frozen }: AbandonedTimerProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (frozen) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [frozen])

  const elapsed = now - new Date(abandonedAt).getTime()

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatElapsed(elapsed)}
    </span>
  )
}
