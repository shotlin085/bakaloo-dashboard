"use client"

/**
 * QueryStateView — renders loading / empty / error / no-permission states
 * for any TanStack Query result.
 *
 * Provides a consistent UX across all dashboard surfaces for the common
 * query states. Accepts the standard TanStack Query result shape and renders
 * the appropriate state view.
 *
 * Tasks: 17.5
 * Requirements: 14.2, 15.3
 */

import { type ReactNode } from "react"
import { AlertCircle, FileQuestion, Loader2, Lock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QueryStateViewProps {
  /** Whether the query is currently loading (initial load). */
  isLoading: boolean
  /** Whether the query encountered an error. */
  isError: boolean
  /** The error object (if any). */
  error?: Error | null
  /** Whether the data is empty (after successful load). */
  isEmpty?: boolean
  /** Whether the user lacks permission to view this data. */
  noPermission?: boolean
  /** Retry callback — typically `refetch` from TanStack Query. */
  onRetry?: () => void
  /** Custom loading message. */
  loadingMessage?: string
  /** Custom empty state message. */
  emptyMessage?: string
  /** Custom empty state title. */
  emptyTitle?: string
  /** Custom error message (overrides error.message). */
  errorMessage?: string
  /** Custom no-permission message. */
  noPermissionMessage?: string
  /** Children to render when data is available and not empty. */
  children: ReactNode
  /** Optional className for the wrapper. */
  className?: string
  /** Compact mode — smaller padding and text for inline usage. */
  compact?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps TanStack Query results with consistent state views.
 *
 * Usage:
 *   const { data, isLoading, isError, error, refetch } = useOrders()
 *
 *   <QueryStateView
 *     isLoading={isLoading}
 *     isError={isError}
 *     error={error}
 *     isEmpty={data?.items.length === 0}
 *     onRetry={refetch}
 *     emptyMessage="No orders found"
 *   >
 *     <OrdersList orders={data.items} />
 *   </QueryStateView>
 */
export function QueryStateView({
  isLoading,
  isError,
  error,
  isEmpty = false,
  noPermission = false,
  onRetry,
  loadingMessage = "Loading...",
  emptyMessage = "No data found",
  emptyTitle = "Nothing here yet",
  errorMessage,
  noPermissionMessage = "You don't have permission to view this data.",
  children,
  className,
  compact = false,
}: QueryStateViewProps) {
  // Priority order: no-permission > loading > error > empty > children

  if (noPermission) {
    return (
      <StateContainer className={className} compact={compact}>
        <Lock className={cn("text-muted-foreground", compact ? "h-8 w-8" : "h-12 w-12")} />
        <StateTitle compact={compact}>Access Denied</StateTitle>
        <StateDescription compact={compact}>{noPermissionMessage}</StateDescription>
      </StateContainer>
    )
  }

  if (isLoading) {
    return (
      <StateContainer className={className} compact={compact}>
        <Loader2
          className={cn(
            "animate-spin text-muted-foreground",
            compact ? "h-6 w-6" : "h-8 w-8",
          )}
        />
        <StateDescription compact={compact}>{loadingMessage}</StateDescription>
      </StateContainer>
    )
  }

  if (isError) {
    const message = errorMessage ?? error?.message ?? "Something went wrong"
    return (
      <StateContainer className={className} compact={compact}>
        <AlertCircle
          className={cn("text-destructive", compact ? "h-8 w-8" : "h-12 w-12")}
        />
        <StateTitle compact={compact}>Error</StateTitle>
        <StateDescription compact={compact}>{message}</StateDescription>
        {onRetry && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onRetry}
            className="mt-3 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </StateContainer>
    )
  }

  if (isEmpty) {
    return (
      <StateContainer className={className} compact={compact}>
        <FileQuestion
          className={cn("text-muted-foreground", compact ? "h-8 w-8" : "h-12 w-12")}
        />
        <StateTitle compact={compact}>{emptyTitle}</StateTitle>
        <StateDescription compact={compact}>{emptyMessage}</StateDescription>
      </StateContainer>
    )
  }

  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StateContainer({
  children,
  className,
  compact,
}: {
  children: ReactNode
  className?: string
  compact: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-6 px-4" : "gap-3 py-16 px-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

function StateTitle({
  children,
  compact,
}: {
  children: ReactNode
  compact: boolean
}) {
  return (
    <h3
      className={cn(
        "font-semibold text-foreground",
        compact ? "text-sm" : "text-base",
      )}
    >
      {children}
    </h3>
  )
}

function StateDescription({
  children,
  compact,
}: {
  children: ReactNode
  compact: boolean
}) {
  return (
    <p
      className={cn(
        "max-w-sm text-muted-foreground",
        compact ? "text-xs" : "text-sm",
      )}
    >
      {children}
    </p>
  )
}
