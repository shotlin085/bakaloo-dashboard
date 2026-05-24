"use client"

/**
 * Inline error block — used by every list page when a TanStack Query fails.
 *
 * Renders an alert region with the HTTP `status` (as a Badge), the
 * server-provided `message`, and an optional Retry button. Falls back to
 * `t("errors.genericError")` when no message is supplied.
 *
 * Requirements: 15.1, 8.10, 9 (read-only error states)
 */

import { AlertTriangle, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ErrorBlockProps {
  /** HTTP status code surfaced as a small badge when provided. */
  status?: number
  /** Server-provided error message. Empty string falls back to `errors.genericError`. */
  message: string
  /** Optional retry handler — when supplied, a "Retry" button is rendered. */
  onRetry?: () => void
  className?: string
}

export function ErrorBlock({
  status,
  message,
  onRetry,
  className,
}: ErrorBlockProps) {
  const resolvedMessage =
    message.trim().length > 0 ? message : t("errors.genericError")

  return (
    <Card
      role="alert"
      aria-live="polite"
      className={cn("border-destructive/30", className)}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          />
        </div>

        {typeof status === "number" ? (
          <Badge variant="destructive" className="font-mono">
            {status}
          </Badge>
        ) : null}

        <p className="max-w-md text-sm text-muted-foreground">
          {resolvedMessage}
        </p>

        {onRetry ? (
          <Button onClick={onRetry} variant="outline" size="sm" type="button">
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("shopFinancials.error.retry")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
