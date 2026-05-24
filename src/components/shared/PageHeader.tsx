"use client"

import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
  /**
   * Override the value used for `document.title`. Defaults to `title`.
   * Set to `false` to opt out of automatic title management — useful for
   * pages that mount multiple `PageHeader`s and want only the outer one
   * to drive the browser tab.
   */
  documentTitle?: string | false
}

/**
 * Standard page chrome: H1 + subtitle + right-aligned actions slot.
 *
 * In addition to the visible heading, `PageHeader` keeps the browser
 * tab in sync via {@link useDocumentTitle} (Req 13.1). Every dashboard
 * page already mounts this component, so every route inherits a
 * meaningful tab title without per-page wiring.
 */
export function PageHeader({
  title,
  subtitle,
  children,
  className,
  documentTitle,
}: PageHeaderProps) {
  // `documentTitle === false` opts out (e.g. nested page headers); any
  // other value (including the default `undefined`) falls back to `title`.
  useDocumentTitle(documentTitle === false ? null : (documentTitle ?? title))

  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 mt-2 sm:mt-0">{children}</div>}
    </div>
  )
}
