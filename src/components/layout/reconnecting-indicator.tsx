"use client"

/**
 * `<ReconnectingIndicator />` — non-blocking topbar pill that surfaces socket
 * connection drops to the user.
 *
 * Behaviour:
 *   - When the socket is connected, renders nothing (idle).
 *   - When the socket is disconnected and the Socket.IO client is attempting
 *     to reconnect, renders a small "Reconnecting…" badge with a
 *     `aria-live="polite"` region so screen readers announce the change
 *     without interrupting the user.
 *
 * The component is SSR-safe — `useConnectionStatus()` attaches its socket
 * listeners inside `useEffect`, so nothing runs during the server render.
 *
 * The label is routed through `t("errors.reconnecting")` so the indicator
 * stays translatable and matches the design system's i18n contract.
 *
 * Requirements: 11.6, 15.6
 * Design references:
 *   - design.md §12 "Live_Updates_Channel Design" — explicit reconnect cap
 *     and the indicator that surfaces it to the user.
 *   - design.md §15 "Performance Budget" — non-blocking, no async work.
 */

import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useConnectionStatus } from "@/hooks/useConnectionStatus"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ReconnectingIndicatorProps {
  /** Optional class hook for layouts to position the pill in the topbar. */
  className?: string
}

/**
 * Renders a "Reconnecting…" pill while the socket is disconnected.
 *
 * Renders nothing when connected so the topbar stays uncluttered during the
 * common case (Req 15.6 — "non-blocking").
 */
export function ReconnectingIndicator({
  className,
}: ReconnectingIndicatorProps) {
  const { isConnected, isReconnecting } = useConnectionStatus()

  // Wrap the pill in a polite live region so screen readers announce the
  // status change once when it appears, but never interrupt active speech.
  // The region itself is always rendered (even when idle) so additions are
  // detected; the visible content collapses to nothing in the connected state.
  const showPill = !isConnected && isReconnecting
  const label = t("errors.reconnecting")

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="reconnecting-indicator"
      // Stay invisible (and out of the layout) when idle so neighbouring
      // topbar elements don't shift when the socket reconnects.
      className={cn("contents", className)}
    >
      {showPill ? (
        <Badge
          variant="secondary"
          aria-label={label}
          className="gap-1.5 font-medium text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/40"
        >
          <Loader2
            aria-hidden="true"
            className="h-3 w-3 animate-spin"
          />
          <span>{label}</span>
        </Badge>
      ) : null}
    </div>
  )
}
