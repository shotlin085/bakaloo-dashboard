"use client"

/**
 * Global render-error boundary — wraps the dashboard layout per design §16.
 *
 * On a thrown render error, logs `{ error, info, requestId }` to the console
 * (where `requestId` comes from any `x-request-id` attached to the error by
 * the axios response interceptor) and renders a "Something went wrong, refresh
 * the page" Card with a Refresh button that calls `window.location.reload()`.
 *
 * Pages that need to reset the boundary on navigation can supply a `resetKey`
 * prop; whenever it changes, the boundary clears its error state.
 *
 * Requirements: 15.7, 15.5
 */

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/i18n"

interface ErrorBoundaryProps {
  children: ReactNode
  /** When this value changes between renders, the boundary resets. */
  resetKey?: unknown
  /** Custom fallback override; defaults to the standard Card+Refresh fallback. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface `x-request-id` if the axios layer attached it to the thrown error.
    const requestId =
      (error as { requestId?: unknown })?.requestId ?? undefined
    console.error("ErrorBoundary caught", { error, info, requestId })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.reset()
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleRefresh = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }

    return (
      <Card role="alert" aria-live="assertive" className="m-4">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("errors.boundaryFallback")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={this.handleRefresh}
          >
            <RotateCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }
}
